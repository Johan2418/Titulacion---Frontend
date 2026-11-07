import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { FilaImportacionTema, ImportacionTemas } from './importacion'
import { VistaPreviaImportacion } from './VistaPreviaImportacion'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

const almeida = { id: 'd1', nombres: 'Edison', apellidos: 'Almeida' }
const fila = (over: Partial<FilaImportacionTema>): FilaImportacionTema => ({
  fila: 10,
  nro: '1',
  docenteExcel: 'ALMEIDA EDISON',
  titulo: 'Tema A',
  descripcion: null,
  docente: almeida,
  candidatos: [],
  estado: 'LISTA',
  errores: [],
  advertencias: [],
  ...over,
})

const preview = (filas: FilaImportacionTema[], puedeConfirmar: boolean): ImportacionTemas => ({
  id: 'prep',
  nombreArchivo: 'temas.xlsx',
  estado: 'LISTA',
  carreraId: 'c',
  lineaId: 'l',
  tipoTema: 'GRUPO',
  totalFilas: filas.length,
  listas: filas.filter((f) => f.estado === 'LISTA').length,
  pendientes: filas.filter((f) => f.estado === 'PENDIENTE_DOCENTE').length,
  duplicadas: filas.filter((f) => f.estado === 'DUPLICADA').length,
  conErrores: filas.filter((f) => f.estado === 'ERROR').length,
  puedeConfirmar,
  filas,
})

const base = {
  docentes: [{ value: 'd2', label: 'Juan Pérez Loor' }],
  onSeleccionar: vi.fn(),
  onAplicar: vi.fn(),
  onConfirmar: vi.fn(),
  procesando: false,
}

describe('VistaPreviaImportacion', () => {
  it('muestra un selector para cada docente pendiente y bloquea la confirmación', () => {
    render(
      <VistaPreviaImportacion
        {...base}
        seleccion={{}}
        preview={preview(
          [
            fila({}),
            fila({
              fila: 11,
              nro: '2',
              docenteExcel: 'PÉREZ',
              titulo: 'Tema B',
              docente: null,
              estado: 'PENDIENTE_DOCENTE',
              candidatos: [{ id: 'd2', nombres: 'Juan', apellidos: 'Pérez Loor' }],
              advertencias: ['Varios docentes de la carrera coinciden con «PÉREZ»; elige el docente.'],
            }),
          ],
          false,
        )}
      />,
    )
    expect(screen.getByText('Edison Almeida')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Docente para «PÉREZ»' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aplicar docentes/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Confirmar importación/ })).toBeDisabled()
  })

  it('aplica las selecciones cuando todos los pendientes tienen docente', () => {
    const onAplicar = vi.fn()
    render(
      <VistaPreviaImportacion
        {...base}
        onAplicar={onAplicar}
        seleccion={{ PÉREZ: 'd2' }}
        preview={preview(
          [fila({ docenteExcel: 'PÉREZ', docente: null, estado: 'PENDIENTE_DOCENTE' })],
          false,
        )}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Aplicar docentes/ }))
    expect(onAplicar).toHaveBeenCalledOnce()
  })

  it('habilita confirmar solo cuando el backend lo permite y muestra errores y duplicados', () => {
    const onConfirmar = vi.fn()
    render(
      <VistaPreviaImportacion
        {...base}
        onConfirmar={onConfirmar}
        seleccion={{}}
        preview={preview(
          [
            fila({}),
            fila({
              fila: 11,
              titulo: 'Tema A',
              estado: 'DUPLICADA',
              advertencias: ['Tema repetido en el archivo (fila 10); se omitirá.'],
            }),
          ],
          true,
        )}
      />,
    )
    expect(screen.getByText('Tema repetido en el archivo (fila 10); se omitirá.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Confirmar importación/ }))
    expect(onConfirmar).toHaveBeenCalledOnce()
  })

  it.each([
    ['ofrece los candidatos de la fila cuando existen', [{ id: 'd3', nombres: 'Ana', apellidos: 'Ruiz' }], 'Ana Ruiz', 'Juan Pérez Loor'],
    ['ofrece los docentes activos de la carrera cuando no hay candidatos', [], 'Juan Pérez Loor', 'Ana Ruiz'],
  ])('%s', async (_n, candidatos, presente, ausente) => {
    render(
      <VistaPreviaImportacion
        {...base}
        seleccion={{}}
        preview={preview(
          [fila({ docenteExcel: 'PÉREZ', docente: null, estado: 'PENDIENTE_DOCENTE', candidatos })],
          false,
        )}
      />,
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'Docente para «PÉREZ»' }))
    expect(await screen.findByRole('option', { name: presente })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: ausente })).toBeNull()
  })

  it('bloquea aplicar docentes mientras haya filas con errores', () => {
    render(
      <VistaPreviaImportacion
        {...base}
        seleccion={{ PÉREZ: 'd2' }}
        preview={preview(
          [
            fila({ docenteExcel: 'PÉREZ', docente: null, estado: 'PENDIENTE_DOCENTE' }),
            fila({ fila: 12, estado: 'ERROR', errores: ['Falta el título.'] }),
          ],
          false,
        )}
      />,
    )
    expect(screen.getByRole('button', { name: /Aplicar docentes/ })).toBeDisabled()
  })
})
