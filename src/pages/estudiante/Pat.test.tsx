import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Pat from './Pat'

const mocks = vi.hoisted(() => ({
  guardar: vi.fn(),
  generar: vi.fn(),
  subir: vi.fn(),
  estado: { estado: 'LISTO' },
}))
const consulta = (data: unknown) => ({ isPending: false, isError: false, data })
vi.mock('@/auth/AuthProvider', () => ({ useUsuario: () => ({ id: 'u1' }) }))
vi.mock('@/features/periodos/PeriodoContext', () => ({
  usePeriodo: () => ({ periodoId: 'p1', periodo: { estado: 'EN_CURSO' } }),
}))
vi.mock('@/features/asignaciones/api', () => ({
  useMiAsignacion: () =>
    consulta({
      id: 'a1',
      estado: 'VIGENTE',
      postulacionId: 'post',
      tema: { titulo: 'Tema' },
      tutorVigente: { id: 't' },
    }),
}))
vi.mock('@/features/postulaciones/api', () => ({ useMisPostulaciones: () => consulta([]) }))
vi.mock('@/features/pat/api', () => ({
  useDatosPat: () => consulta({ identidad: {}, datos: {}, pendientes: [] }),
  useContenidoPat: () => consulta({ contenido: {}, pendientes: [] }),
  useGuardarDatosPat: () => ({ mutate: mocks.guardar, isPending: false }),
  useGuardarContenidoPat: () => ({ mutate: vi.fn(), isPending: false }),
  useDocumentosPat: () => consulta([]),
  useSolicitarGeneracionPat: () => ({ mutate: mocks.generar, isPending: false }),
  useGeneracionPat: () => consulta(mocks.estado),
  useSubirPat: () => ({ mutate: mocks.subir, isPending: false }),
  descargarGeneracionPat: vi.fn(),
  descargarDocumentoPat: vi.fn(),
}))

describe('PAT individual', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })
  it('guarda datos parciales con la opción no aplica sin correo inválido', async () => {
    const user = userEvent.setup()
    render(<Pat />)
    await user.type(screen.getByLabelText('Curso'), 'A')
    await user.click(
      screen
        .getByLabelText(/Correo personal/)
        .parentElement!.querySelector('input[type=checkbox]')!,
    )
    await user.click(screen.getByRole('button', { name: 'Guardar datos personales' }))
    expect(mocks.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ curso: 'A', correoPersonal: null, correoPersonalNoAplica: true }),
      expect.anything(),
    )
  })
  it('recupera una generación de la sesión y vincula el PDF firmado', async () => {
    sessionStorage.setItem('pat.generacion.u1.p1.a1', 'gen1')
    const user = userEvent.setup()
    render(<Pat />)
    const archivo = new File(['pdf'], 'firmado.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText(/Selecciona el PDF firmado/), archivo)
    await user.click(screen.getByRole('button', { name: 'Entregar PAT firmado' }))
    expect(mocks.subir).toHaveBeenCalledWith({ archivo, generacionId: 'gen1' }, expect.anything())
  })
})
