/**
 * Base de datos en memoria para los mocks. Las filas reflejan las tablas del DER
 * (columnas en camelCase). Se persiste en localStorage para que los datos
 * sobrevivan a recargas durante el desarrollo.
 */
import type {
  CanalNotificacion,
  CausaAnulacion,
  CondicionIngreso,
  CriterioConflicto,
  EstadoAsignacionTema,
  EstadoAsignacionTutor,
  EstadoExportacion,
  EstadoGrupo,
  EstadoHabilitacion,
  EstadoImportacion,
  EstadoIntegrante,
  EstadoInvitacion,
  EstadoPeriodo,
  EstadoPostulacion,
  EstadoTema,
  EstadoUsuario,
  FormatoExportacion,
  FormatoPat,
  OrigenHabilitacion,
  ResultadoRevision,
  Rol,
  RolEnGrupo,
  SituacionIngreso,
  TipoAsignacionTutor,
  TipoImportacion,
  TipoReporte,
} from '@/types/dominio'
import { crearSemilla } from './seeds'

export interface UsuarioRow {
  id: string
  email: string
  nombres: string
  apellidos: string
  rol: Rol
  estado: EstadoUsuario
  idExternoSso: string | null
  ultimoAcceso: string | null
  creadoEn: string
}
export interface PeriodoRow {
  id: string
  codigo: string
  nombre: string
  fechaInicioPostulacion: string
  fechaFinPostulacion: string
  fechaInicioTitulacion: string
  estado: EstadoPeriodo
  maxIntegrantesDefault: number
}
export interface EstudianteRow {
  id: string
  usuarioId: string
  cedula: string
  matricula: string
  carrera: string
  nivel: number
}
export interface DocenteRow {
  id: string
  usuarioId: string
  cedula: string
  tituloAcademico: string | null
  departamento: string | null
  habilitadoTutoria: boolean
}
export interface LineaRow {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  activa: boolean
}
export interface HabilitadoRow {
  id: string
  periodoId: string
  estudianteId: string
  origen: OrigenHabilitacion
  loteImportacionId: string | null
  estado: EstadoHabilitacion
  condicionIngreso: CondicionIngreso
  requisitoPendiente: string | null
  situacionIngreso: SituacionIngreso
  fechaHabilitacion: string
  fechaResolucionIngreso: string | null
  resueltoPorId: string | null
  observacionIngreso: string | null
}
export interface LoteRow {
  id: string
  periodoId: string | null
  ejecutadoPorId: string
  tipo: TipoImportacion
  nombreArchivo: string
  rutaAlmacenamiento: string
  estado: EstadoImportacion
  totalFilas: number
  filasOk: number
  filasError: number
  errores: { fila: number; mensaje: string }[] | null
  fechaInicio: string
  fechaFin: string | null
}
export interface TemaRow {
  id: string
  periodoId: string
  lineaId: string
  docenteProponenteId: string
  titulo: string
  descripcion: string
  minIntegrantes: number
  maxIntegrantes: number
  estado: EstadoTema
  creadoEn: string
}
export interface TemaHistorialRow {
  id: string
  temaId: string
  usuarioId: string
  estadoAnterior: EstadoTema | null
  estadoNuevo: EstadoTema
  cambios: Record<string, { antes: unknown; despues: unknown }> | null
  fecha: string
}
export interface GrupoRow {
  id: string
  periodoId: string
  nombre: string
  estado: EstadoGrupo
  creadoEn: string
}
export interface IntegranteRow {
  id: string
  grupoId: string
  periodoId: string
  estudianteId: string
  rolEnGrupo: RolEnGrupo
  estado: EstadoIntegrante
  fechaIngreso: string
  fechaSalida: string | null
  motivoSalida: string | null
}
export interface InvitacionRow {
  id: string
  grupoId: string
  periodoId: string
  estudianteEmisorId: string
  estudianteDestinoId: string
  estado: EstadoInvitacion
  fechaEnvio: string
  expiraEn: string | null
  fechaRespuesta: string | null
}
export interface PostulacionRow {
  id: string
  temaId: string
  periodoId: string
  grupoId: string | null
  estudianteId: string | null
  numIntegrantes: number
  registradaPorId: string
  estado: EstadoPostulacion
  fechaPostulacion: string
  observacion: string | null
}
export interface TutorPropuestoRow {
  id: string
  postulacionId: string
  docenteId: string
  ordenPrioridad: number
}
export interface ResolucionRow {
  id: string
  temaId: string
  periodoId: string
  resueltoPorId: string
  criterioAplicado: CriterioConflicto
  postulacionGanadoraId: string
  justificacion: string
  fechaResolucion: string
}
export interface ParticipanteRow {
  id: string
  resolucionConflictoId: string
  temaId: string
  postulacionId: string
  puntajeCriterio: number | null
}
export interface AsignacionTemaRow {
  id: string
  temaId: string
  postulacionId: string
  grupoId: string | null
  estudianteId: string | null
  aprobadaPorId: string
  estado: EstadoAsignacionTema
  fechaAsignacion: string
  motivo: string | null
  causaAnulacion: CausaAnulacion | null
  motivoAnulacion: string | null
  anuladaPorId: string | null
  fechaAnulacion: string | null
}
export interface AsignacionTutorRow {
  id: string
  asignacionTemaId: string
  docenteId: string
  tutorPropuestoId: string | null
  tipo: TipoAsignacionTutor
  estado: EstadoAsignacionTutor
  asignadaPorId: string
  fechaAsignacion: string
  fechaFin: string | null
  motivoCambio: string | null
}
export interface ConfigCargaRow {
  id: string
  periodoId: string
  docenteId: string | null
  maxTrabajos: number
  bloquearAlSuperar: boolean
}
export interface PlantillaRow {
  id: string
  periodoId: string
  version: string
  nombreArchivo: string
  rutaAlmacenamiento: string
  mimeType: string
  tamanoBytes: number
  fechaVigenciaInicio: string | null
  fechaVigenciaFin: string | null
  publicadaPorId: string
  activa: boolean
  creadoEn: string
}
export interface DocumentoPatRow {
  id: string
  asignacionTemaId: string
  plantillaId: string | null
  version: number
  nombreArchivo: string
  rutaAlmacenamiento: string
  formato: FormatoPat
  tamanoBytes: number
  hashSha256: string
  cargadoPorId: string
  fechaCarga: string
}
export interface RevisionPatRow {
  id: string
  documentoPatId: string
  revisorId: string
  resultado: ResultadoRevision
  observaciones: string | null
  fechaRevision: string
}
export interface NotificacionRow {
  id: string
  usuarioId: string
  tipo: string
  titulo: string
  mensaje: string
  entidadTipo: string | null
  entidadId: string | null
  canal: CanalNotificacion
  leida: boolean
  fechaCreacion: string
  fechaEnvio: string | null
}
export interface AuditoriaRow {
  id: number
  usuarioId: string | null
  accion: string
  entidadTipo: string
  entidadId: string | null
  valoresAnteriores: Record<string, unknown> | null
  valoresNuevos: Record<string, unknown> | null
  ipOrigen: string | null
  fechaHora: string
}
export interface ExportacionRow {
  id: string
  periodoId: string | null
  solicitadaPorId: string
  tipoReporte: TipoReporte
  formato: FormatoExportacion
  filtros: Record<string, unknown> | null
  estado: EstadoExportacion
  rutaAlmacenamiento: string | null
  tamanoBytes: number | null
  expiraEn: string | null
  fechaSolicitud: string
  fechaGeneracion: string | null
}

export interface MockDb {
  usuarios: UsuarioRow[]
  periodos: PeriodoRow[]
  estudiantes: EstudianteRow[]
  docentes: DocenteRow[]
  lineas: LineaRow[]
  habilitados: HabilitadoRow[]
  lotes: LoteRow[]
  temas: TemaRow[]
  temaHistorial: TemaHistorialRow[]
  grupos: GrupoRow[]
  integrantes: IntegranteRow[]
  invitaciones: InvitacionRow[]
  postulaciones: PostulacionRow[]
  tutoresPropuestos: TutorPropuestoRow[]
  resoluciones: ResolucionRow[]
  participantes: ParticipanteRow[]
  asignacionesTema: AsignacionTemaRow[]
  asignacionesTutor: AsignacionTutorRow[]
  configCarga: ConfigCargaRow[]
  plantillas: PlantillaRow[]
  documentosPat: DocumentoPatRow[]
  revisionesPat: RevisionPatRow[]
  notificaciones: NotificacionRow[]
  auditoria: AuditoriaRow[]
  exportaciones: ExportacionRow[]
}

const CLAVE = 'titulacion.mockDb.v1'

function cargar(): MockDb {
  try {
    const crudo = typeof localStorage !== 'undefined' ? localStorage.getItem(CLAVE) : null
    if (crudo) return JSON.parse(crudo) as MockDb
  } catch {
    // datos corruptos: se regeneran
  }
  return crearSemilla()
}

export let db: MockDb = cargar()

export function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(db))
  } catch {
    // almacenamiento no disponible (tests, modo privado)
  }
}

export function reiniciarDb() {
  db = crearSemilla()
  guardar()
}

export function uid() {
  return crypto.randomUUID()
}

export function ahora() {
  return new Date().toISOString()
}
