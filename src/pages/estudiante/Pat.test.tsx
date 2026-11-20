import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeneracionPatB, ResumenPatB } from '@/features/pat/api'
import type { DocumentoPat } from '@/types/dominio'
import Pat from './Pat'

const consulta = <T,>(data: T) => ({ isPending: false, isError: false, data })
const m = vi.hoisted(() => ({
  resumen: null as unknown,
  refetch: vi.fn(),
  generaciones: [] as unknown[],
  documentos: [] as unknown[],
  guardarDatos: vi.fn(),
  guardarContenido: vi.fn(),
  elegirTutor: vi.fn(),
  solicitar: vi.fn(),
  reintentar: vi.fn(),
  entregar: vi.fn(),
  subir: vi.fn(),
}))

vi.mock('@/auth/AuthProvider', () => ({ useUsuario: () => ({ id: 'u1' }) }))
vi.mock('@/features/periodos/PeriodoContext', () => ({
  usePeriodo: () => ({ periodoId: 'p1', periodo: { estado: 'EN_CURSO' } }),
}))
vi.mock('@/features/asignaciones/api', () => ({
  useMiAsignacion: () => consulta({ id: 'a1', estado: 'VIGENTE', tema: { titulo: 'Tema' } }),
}))
vi.mock('@/features/pat/api', async (original) => ({
  ...(await original<typeof import('@/features/pat/api')>()),
  useResumenPat: () => ({ ...consulta(m.resumen), refetch: m.refetch }),
  useElegirTutorPat: () => ({ mutate: m.elegirTutor, isPending: false }),
  useGuardarDatosPat: () => ({ mutateAsync: m.guardarDatos }),
  useGuardarContenidoPat: () => ({ mutateAsync: m.guardarContenido }),
  useGeneracionesPat: () => consulta(m.generaciones),
  useGeneracionPat: () => consulta(undefined),
  useDocumentosPat: () => consulta(m.documentos),
  useSolicitarGeneracionPat: () => ({ mutate: m.solicitar, isPending: false, error: null }),
  useReintentarGeneracionPat: () => ({ mutate: m.reintentar, isPending: false }),
  useEntregarGeneracionPat: () => ({ mutateAsync: m.entregar }),
  useSubirPat: () => ({ mutate: m.subir, isPending: false }),
  descargarGeneracionPat: vi.fn(),
  descargarDocumentoPat: vi.fn(),
}))

const auto = <T,>(valor: T, fuente = 'X') => ({ valor, fuente })
const crearResumen = (cambios: Partial<ResumenPatB> = {}): ResumenPatB => ({
  asignacionTemaId: 'a1',
  estudianteId: 'e1',
  automaticos: {
    nombres: auto('José'),
    apellidos: auto('Peña'),
    cedula: auto('1300000000'),
    matricula: auto('1300000000'),
    correoInstitucional: auto('e1300000000@live.uleam.edu.ec'),
    carrera: auto('Tecnologías de la Información'),
    facultad: auto('Facultad de Ciencias de la Vida y Tecnologías'),
    periodo: auto({ codigo: '2026-2', nombre: 'Titulación 2026-2' }),
    extensionPat: auto('Extensión Manta'),
    nivel: auto(8),
    curso: auto('Octavo'),
    temaTitulo: auto('Sistema de riego inteligente'),
    problematicaSugerida: auto('Descripción del tema'),
    lineaInvestigacion: auto({ id: 'l1', codigo: 'L1', nombre: 'Software' }),
    articulacionesSugeridas: auto(['INVESTIGACION']),
    modalidad: auto('GRUPAL' as const),
    tipoTema: auto('PAREJA'),
    integrantes: auto([
      { id: 'e1', nombres: 'José', apellidos: 'Peña' },
      { id: 'e2', nombres: 'Ana', apellidos: 'Ruiz' },
    ]),
    modalidadAcademica: auto('TRABAJO_INTEGRACION_CURRICULAR', 'PREDETERMINADO'),
    tutor: auto(
      { docenteId: 'd1', nombres: 'Ana', apellidos: 'Docente', tutorPropuestoId: 'tp1' },
      'TUTOR_PROPUESTO_PREDETERMINADO',
    ),
  },
  editables: {
    personal: {},
    contenido: {
      problematica: 'Descripción del tema',
      problematicaPersonalizada: false,
      confirmaProblematica: false,
      articulaciones: ['INVESTIGACION'],
      tutorPropuestoId: null,
    },
  },
  pendientes: ['fecha_nacimiento', 'correo_personal', 'confirma_problematica'],
  listoParaGenerar: false,
  tutoresPropuestos: {
    tutorVigente: null,
    data: [
      {
        id: 'tp1',
        ordenPrioridad: 1,
        docenteId: 'd1',
        nombres: 'Ana',
        apellidos: 'Docente',
        elegibleActualmente: true,
        esProponenteTema: true,
      },
      {
        id: 'tp2',
        ordenPrioridad: 2,
        docenteId: 'd2',
        nombres: 'Luis',
        apellidos: 'Mora',
        elegibleActualmente: true,
        esProponenteTema: false,
      },
    ],
  },
  ...cambios,
})
const listo = () => crearResumen({ pendientes: [], listoParaGenerar: true })
const generacion = (g: Partial<GeneracionPatB> = {}): GeneracionPatB => ({
  id: 'g1',
  estado: 'LISTO',
  solicitadaEn: '2026-11-19T10:00:00Z',
  generadaEn: '2026-11-19T10:01:00Z',
  documentoPatId: null,
  ...g,
})
const documento = (d: Partial<DocumentoPat> = {}): DocumentoPat => ({
  id: 'd1',
  asignacionTemaId: 'a1',
  estudianteId: 'e1',
  generacionId: 'g1',
  version: 1,
  nombreArchivo: 'PAT-generado.pdf',
  formato: 'PDF',
  tamanoBytes: 1000,
  hashSha256: 'abc',
  cargadoPor: { id: 'u1', nombres: 'José', apellidos: 'Peña', email: '' },
  fechaCarga: '2026-11-19T11:00:00Z',
  estado: 'PENDIENTE',
  revision: null,
  origen: 'GENERADO',
  ...d,
})

const renderPat = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Pat />
    </QueryClientProvider>,
  )

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  vi.clearAllMocks()
  m.resumen = crearResumen()
  m.generaciones = []
  m.documentos = []
  m.refetch.mockResolvedValue({ data: crearResumen() })
  m.guardarDatos.mockResolvedValue({})
  m.guardarContenido.mockResolvedValue({})
  m.entregar.mockResolvedValue(documento())
})

describe('Asistente Entregar PAT', () => {
  it('muestra los datos automáticos en solo lectura con la nota de corrección por ADMIN', () => {
    renderPat()
    expect(screen.getByRole('button', { name: /Resumen automático/ })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByText('Tecnologías de la Información')).toBeInTheDocument()
    expect(screen.getByText('Octavo')).toBeInTheDocument()
    expect(screen.getByText('Sistema de riego inteligente')).toBeInTheDocument()
    expect(screen.getByText('L1 · Software')).toBeInTheDocument()
    expect(screen.getByText('Grupal')).toBeInTheDocument()
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument()
    expect(screen.getByText(/solicita la corrección al administrador/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Tutor propuesto' })).toHaveTextContent(
      '1. Ana Docente (proponente del tema)',
    )
  })

  it('bloquea el paso de entrega mientras haya pendientes y los resalta', async () => {
    const user = userEvent.setup()
    renderPat()
    expect(screen.getByRole('button', { name: /Entregar$/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('button', { name: /Datos faltantes/ })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByLabelText('Fecha de nacimiento')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Paralelo')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('status')).toHaveTextContent(/Fecha de nacimiento/)
    expect(screen.getByRole('button', { name: 'Ir a entregar' })).toBeDisabled()
  })

  it('guarda solo los datos faltantes y avanza cuando ya no hay pendientes', async () => {
    m.refetch.mockResolvedValue({ data: listo() })
    const user = userEvent.setup()
    renderPat()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Paralelo'), 'A')
    await user.click(screen.getByLabelText('Correo personal: no aplica'))
    await user.click(screen.getByLabelText('Confirmo que la problemática es correcta'))
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
    expect(m.guardarDatos).toHaveBeenCalledWith(
      expect.objectContaining({
        paralelo: 'A',
        correoPersonal: null,
        correoPersonalNoAplica: true,
      }),
    )
    expect(m.guardarDatos.mock.calls[0][0]).not.toHaveProperty('fechaNacimiento')
    expect(m.guardarContenido).toHaveBeenCalledWith({
      problematica: 'Descripción del tema',
      confirmaProblematica: true,
      articulaciones: ['INVESTIGACION'],
    })
    expect(await screen.findByText('Paso 3: Entregar')).toBeInTheDocument()
  })

  it('muestra los pendientes restantes tras guardar sin avanzar', async () => {
    m.refetch.mockResolvedValue({ data: crearResumen({ pendientes: ['extension_pat'] }) })
    const user = userEvent.setup()
    renderPat()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
    expect(
      await screen.findByText(/Aún falta: Sede o extensión del período \(debe configurarla/),
    ).toBeInTheDocument()
    expect(screen.getByText('Paso 2: Datos faltantes')).toBeInTheDocument()
  })

  it('entrega sin firma tras confirmar', async () => {
    m.resumen = listo()
    m.generaciones = [generacion()]
    const user = userEvent.setup()
    renderPat()
    expect(screen.getByText('Paso 3: Entregar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Entregar sin firma' }))
    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveTextContent(/El administrador lo revisará/)
    await user.click(within(dialogo).getByRole('button', { name: 'Entregar' }))
    expect(m.entregar).toHaveBeenCalledWith('g1')
  })

  it('muestra la entrega pendiente de revisión y no permite otra', () => {
    m.resumen = listo()
    m.generaciones = [generacion({ documentoPatId: 'd1' })]
    m.documentos = [documento()]
    renderPat()
    const estado = screen.getByRole('region', { name: 'Tu entrega' })
    expect(within(estado).getByText('Pendiente de revisión')).toBeInTheDocument()
    expect(within(estado).getByText('Generado sin firma')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entregar sin firma' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Generar/ })).not.toBeInTheDocument()
  })

  it('con una entrega observada muestra las observaciones y permite generar otra versión', async () => {
    m.resumen = listo()
    m.generaciones = [generacion({ documentoPatId: 'd1' })]
    m.documentos = [
      documento({
        estado: 'OBSERVADO',
        revision: {
          id: 'r1',
          documentoPatId: 'd1',
          resultado: 'OBSERVADO',
          observaciones: 'Corrige la problemática.',
          fechaRevision: '2026-11-19T12:00:00Z',
          revisor: { id: 'adm', nombres: 'Admin', apellidos: 'Uno', email: '' },
        },
      }),
    ]
    const user = userEvent.setup()
    renderPat()
    const estado = screen.getByRole('region', { name: 'Tu entrega' })
    expect(within(estado).getByText('Corrige la problemática.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generar de nuevo' }))
    expect(m.solicitar).toHaveBeenCalled()
  })

  it('permite la carga opcional del PDF firmado vinculada a la generación', async () => {
    m.resumen = listo()
    m.generaciones = [generacion()]
    const user = userEvent.setup()
    renderPat()
    await user.click(screen.getByText('Opcional: entregar el PAT firmado'))
    const archivo = new File(['pdf'], 'firmado.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText(/Selecciona el PDF firmado/), archivo)
    await user.click(screen.getByRole('button', { name: 'Entregar PAT firmado' }))
    expect(m.subir).toHaveBeenCalledWith({ archivo, generacionId: 'g1' }, expect.anything())
  })

  it('lista las generaciones desde el backend sin usar sessionStorage', () => {
    const lectura = vi.spyOn(Storage.prototype, 'getItem')
    m.resumen = listo()
    m.generaciones = [
      generacion({ id: 'g2', estado: 'PROCESANDO', generadaEn: null }),
      generacion({ id: 'g1', documentoPatId: 'd0' }),
    ]
    renderPat()
    const lista = screen.getByRole('region', { name: 'Generaciones solicitadas' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2)
    expect(within(lista).getByText(/Listo · entregada/)).toBeInTheDocument()
    expect(screen.getByText(/Generando el PDF… Esta página se actualiza sola/)).toBeInTheDocument()
    expect(lectura.mock.calls.some(([k]) => String(k).startsWith('pat.'))).toBe(false)
    lectura.mockRestore()
  })

  it('reintenta una generación fallida', async () => {
    m.resumen = listo()
    m.generaciones = [generacion({ estado: 'FALLIDO', error: 'Error al generar el PDF.' })]
    const user = userEvent.setup()
    renderPat()
    expect(screen.getByText('Error al generar el PDF.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Generar/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(m.reintentar).toHaveBeenCalledWith('g1')
  })
})
