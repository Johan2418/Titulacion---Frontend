import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { K } from '@/api/claves'
import { configurarCliente } from '@/api/client'
import { ImportarTemas } from './ImportarTemas'

vi.mock('@/features/academico/api', async (original) => ({
  ...(await original<typeof import('@/features/academico/api')>()),
  useFacultades: () => ({
    data: [{ id: 'f1', nombre: 'Facultad', carreras: [{ id: 'c1', nombre: 'Software' }] }],
    isError: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('@/features/catalogos/api', async (original) => ({
  ...(await original<typeof import('@/features/catalogos/api')>()),
  useLineas: () => ({ data: [{ id: 'l1', nombre: 'IA', activa: true }] }),
  useDocentes: () => ({
    data: [
      { id: 'd9', nombres: 'Juan', apellidos: 'Pérez', estado: 'ACTIVO', carrera: { id: 'c1' } },
    ],
  }),
}))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  // Radix Select relies on these DOM APIs that jsdom does not implement.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(() => {
  vi.restoreAllMocks()
  configurarCliente({ obtenerToken: () => null, alNoAutorizado: () => {} })
})

const filaPendiente = (estado: 'PENDIENTE_DOCENTE' | 'LISTA') => ({
  fila: 2,
  nro: '1',
  docente_excel: 'PÉREZ',
  titulo: 'Tema B',
  descripcion: null,
  docente: estado === 'LISTA' ? { id: 'd9', nombres: 'Juan', apellidos: 'Pérez' } : null,
  candidatos: [],
  estado,
  errores: [],
  advertencias: [],
})

const importacion = (estado: 'PENDIENTE_DOCENTE' | 'LISTA') => ({
  id: 'imp-1',
  nombre_archivo: 'temas.xlsx',
  estado: 'VALIDADA',
  carrera_id: 'c1',
  linea_id: 'l1',
  tipo_tema: 'GRUPO',
  total_filas: 1,
  listas: estado === 'LISTA' ? 1 : 0,
  pendientes: estado === 'LISTA' ? 0 : 1,
  duplicadas: 0,
  con_errores: 0,
  puede_confirmar: estado === 'LISTA',
  filas: [filaPendiente(estado)],
})

const json = (cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

describe('ImportarTemas', () => {
  it('valida, resuelve docentes y confirma enviando lo que espera el backend', async () => {
    const respuestas = [
      json(importacion('PENDIENTE_DOCENTE')),
      json(importacion('LISTA')),
      json({ id: 'imp-1', lote_id: 'lote-1', creados: 1, omitidos: 0 }),
    ]
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(respuestas.shift()!))
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidar = vi.spyOn(qc, 'invalidateQueries')
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={qc}>
        <ImportarTemas abierto onClose={onClose} />
      </QueryClientProvider>,
    )

    const elegir = async (campo: RegExp, opcion: RegExp) => {
      await user.click(screen.getByRole('combobox', { name: campo }))
      await user.click(await screen.findByRole('option', { name: opcion }))
    }
    await elegir(/Carrera/, /Software/)
    await elegir(/Línea de investigación/, /IA/)
    await elegir(/Tipo de tema/, /Grupo/)
    const archivo = new File(['x'], 'temas.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, archivo)
    await user.click(screen.getByRole('button', { name: /Validar archivo/ }))

    // 1. validate: multipart with the backend field names
    const [urlValidar, initValidar] = fetchMock.mock.calls[0]
    expect(String(urlValidar)).toContain('/importaciones/temas/validar')
    expect(initValidar?.method).toBe('POST')
    const fd = initValidar?.body as FormData
    expect(fd).toBeInstanceOf(FormData)
    expect((fd.get('archivo') as File).name).toBe('temas.xlsx')
    expect([fd.get('carrera_id'), fd.get('linea_id'), fd.get('tipo')]).toEqual([
      'c1',
      'l1',
      'GRUPO',
    ])

    // 2. resolve: wire body is snake_case
    const selector = await screen.findByRole('combobox', { name: 'Docente para «PÉREZ»' })
    await user.click(selector)
    await user.click(await screen.findByRole('option', { name: 'Juan Pérez' }))
    await user.click(screen.getByRole('button', { name: /Aplicar docentes/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const [urlResolver, initResolver] = fetchMock.mock.calls[1]
    expect(String(urlResolver)).toContain('/importaciones/temas/imp-1/docentes')
    expect(initResolver?.method).toBe('PATCH')
    expect(JSON.parse(initResolver?.body as string)).toEqual({
      resoluciones: [{ nombre_excel: 'PÉREZ', docente_id: 'd9' }],
    })

    // the preview refreshes from the PATCH response: teacher linked, confirm enabled
    const confirmar = await screen.findByRole('button', { name: /Confirmar importación/ })
    await waitFor(() => expect(confirmar).toBeEnabled())
    expect(screen.queryByRole('combobox', { name: 'Docente para «PÉREZ»' })).toBeNull()
    expect(within(screen.getByRole('table')).getByText('Juan Pérez')).toBeInTheDocument()

    // 3. confirm: invalidates the topics query and resets the dialog
    await user.click(confirmar)
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [urlConfirmar, initConfirmar] = fetchMock.mock.calls[2]
    expect(String(urlConfirmar)).toContain('/importaciones/temas/imp-1/confirmar')
    expect(initConfirmar?.method).toBe('POST')
    expect(invalidar).toHaveBeenCalledWith({ queryKey: K.temas })
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('button', { name: /Validar archivo/ })).toBeDisabled()
  })
})
