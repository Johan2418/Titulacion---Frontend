/**
 * Tipos de dominio alineados con el DER corregido.
 * Convención: la API REST expone los campos en camelCase (las columnas snake_case
 * del DER se traducen 1:1, p. ej. fecha_inicio_postulacion → fechaInicioPostulacion).
 * Las fechas viajan como ISO-8601 con zona horaria (TIMESTAMPTZ).
 */

export type UUID = string
export type ISODate = string

// ───────────── Enums ─────────────
export const ROLES = ['ESTUDIANTE', 'DOCENTE', 'ADMIN'] as const
export type Rol = (typeof ROLES)[number]
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO'

export const ESTADOS_PERIODO = [
  'BORRADOR',
  'POSTULACION_ABIERTA',
  'POSTULACION_CERRADA',
  'EN_CURSO',
  'ARCHIVADO',
] as const
export type EstadoPeriodo = (typeof ESTADOS_PERIODO)[number]

export type OrigenHabilitacion = 'MANUAL' | 'IMPORTACION' | 'SINCRONIZACION'
export type EstadoHabilitacion = 'HABILITADO' | 'SUSPENDIDO'
export type CondicionIngreso = 'REGULAR' | 'CONDICIONADO'
export type SituacionIngreso = 'PENDIENTE' | 'ADMITIDO' | 'NO_ADMITIDO'

export type TipoImportacion = 'ESTUDIANTES' | 'DOCENTES'
export type EstadoImportacion = 'EN_PROCESO' | 'COMPLETADO' | 'COMPLETADO_CON_ERRORES' | 'FALLIDO'

export type EstadoGrupo = 'EN_CONFORMACION' | 'ACTIVO' | 'DISUELTO' | 'ANULADO'
export type RolEnGrupo = 'REPRESENTANTE' | 'INTEGRANTE'
export type EstadoIntegrante = 'ACTIVO' | 'RETIRADO'

export type EstadoInvitacion = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'EXPIRADA'

export const ESTADOS_TEMA = ['BORRADOR', 'PUBLICADO', 'CERRADO', 'ASIGNADO', 'RETIRADO'] as const
export type EstadoTema = (typeof ESTADOS_TEMA)[number]

export const ESTADOS_POSTULACION = [
  'PENDIENTE',
  'EN_CONFLICTO',
  'ACEPTADA',
  'RECHAZADA',
  'CANCELADA',
  'ANULADA',
] as const
export type EstadoPostulacion = (typeof ESTADOS_POSTULACION)[number]
export type Modalidad = 'INDIVIDUAL' | 'GRUPAL'

export type EstadoAsignacionTema = 'VIGENTE' | 'ANULADA'
export type CausaAnulacion = 'INCUMPLIMIENTO_CONDICION' | 'OTRA'

export type TipoAsignacionTutor = 'PROPUESTO_CONFIRMADO' | 'ASIGNADO_DIRECTO'
export type EstadoAsignacionTutor = 'VIGENTE' | 'REEMPLAZADA' | 'ANULADA'

export const CRITERIOS_CONFLICTO = [
  'ORDEN_LLEGADA',
  'PROMEDIO',
  'SORTEO',
  'DECISION_COMISION',
] as const
export type CriterioConflicto = (typeof CRITERIOS_CONFLICTO)[number]

export type FormatoPat = 'PDF' | 'DOCX'
export const RESULTADOS_REVISION = ['APROBADO', 'OBSERVADO', 'RECHAZADO'] as const
export type ResultadoRevision = (typeof RESULTADOS_REVISION)[number]
/** Estado derivado del documento: PENDIENTE si aún no tiene revisión. */
export type EstadoDocumentoPat = 'PENDIENTE' | ResultadoRevision

export const TIPOS_REPORTE = [
  'ESTUDIANTES',
  'GRUPOS',
  'TEMAS_OFERTADOS',
  'TEMAS_ASIGNADOS',
  'TEMAS_DISPONIBLES',
  'DOCENTES',
  'CARGA_TUTORIAL',
] as const
export type TipoReporte = (typeof TIPOS_REPORTE)[number]
export const FORMATOS_EXPORTACION = ['PDF', 'XLSX', 'CSV'] as const
export type FormatoExportacion = (typeof FORMATOS_EXPORTACION)[number]
export type EstadoExportacion = 'EN_COLA' | 'PROCESANDO' | 'LISTO' | 'FALLIDO'

export type CanalNotificacion = 'EN_APP' | 'EMAIL'

// ───────────── Resúmenes embebidos ─────────────
export interface PersonaResumen {
  id: UUID
  nombres: string
  apellidos: string
  email: string
}
export interface EstudianteResumen extends PersonaResumen {
  /** id de estudiante (no de usuario) */
  cedula: string
  matricula: string
}
export interface DocenteResumen extends PersonaResumen {
  cedula: string
}
export interface TemaResumen {
  id: UUID
  titulo: string
}

// ───────────── Entidades ─────────────
export interface Usuario {
  id: UUID
  email: string
  nombres: string
  apellidos: string
  rol: Rol
  estado: EstadoUsuario
  ultimoAcceso?: ISODate | null
  creadoEn: ISODate
}

/** Respuesta de GET /auth/me */
export interface SesionUsuario extends Usuario {
  estudianteId?: UUID | null
  docenteId?: UUID | null
}

export interface PeriodoTitulacion {
  id: UUID
  codigo: string
  nombre: string
  fechaInicioPostulacion: ISODate
  fechaFinPostulacion: ISODate
  fechaInicioTitulacion: ISODate
  estado: EstadoPeriodo
  maxIntegrantesDefault: number
  /** Derivado: cantidad de estudiantes CONDICIONADOS con situación PENDIENTE */
  condicionadosPendientes?: number
}

export interface Estudiante {
  id: UUID
  usuarioId: UUID
  cedula: string
  matricula: string
  carrera: string
  nivel: number
  nombres: string
  apellidos: string
  email: string
}

export interface Docente {
  id: UUID
  usuarioId: UUID
  cedula: string
  tituloAcademico?: string | null
  departamento?: string | null
  habilitadoTutoria: boolean
  nombres: string
  apellidos: string
  email: string
  estado: EstadoUsuario
}

export interface LineaInvestigacion {
  id: UUID
  codigo: string
  nombre: string
  descripcion?: string | null
  activa: boolean
}

export interface EstudianteHabilitado {
  id: UUID
  periodoId: UUID
  estudiante: EstudianteResumen & { carrera: string; nivel: number }
  origen: OrigenHabilitacion
  loteImportacionId?: UUID | null
  estado: EstadoHabilitacion
  condicionIngreso: CondicionIngreso
  requisitoPendiente?: string | null
  situacionIngreso: SituacionIngreso
  fechaHabilitacion: ISODate
  fechaResolucionIngreso?: ISODate | null
  resueltoPor?: PersonaResumen | null
  observacionIngreso?: string | null
}

export interface LoteImportacion {
  id: UUID
  periodoId?: UUID | null
  tipo: TipoImportacion
  nombreArchivo: string
  estado: EstadoImportacion
  totalFilas: number
  filasOk: number
  filasError: number
  errores?: { fila: number; mensaje: string }[] | null
  fechaInicio: ISODate
  fechaFin?: ISODate | null
}

export interface Tema {
  id: UUID
  periodoId: UUID
  linea: Pick<LineaInvestigacion, 'id' | 'nombre'>
  docenteProponente: DocenteResumen
  titulo: string
  descripcion: string
  minIntegrantes: number
  maxIntegrantes: number
  estado: EstadoTema
  creadoEn: ISODate
  /** RF-07: publicado y sin asignación vigente */
  disponible: boolean
  /** RF-07: postulaciones PENDIENTE o EN_CONFLICTO */
  postulacionesAbiertas: number
}

export interface TemaHistorial {
  id: UUID
  temaId: UUID
  usuario: PersonaResumen
  estadoAnterior?: EstadoTema | null
  estadoNuevo: EstadoTema
  cambios?: Record<string, { antes: unknown; despues: unknown }> | null
  fecha: ISODate
}

export interface GrupoIntegrante {
  id: UUID
  estudiante: EstudianteResumen
  rolEnGrupo: RolEnGrupo
  estado: EstadoIntegrante
  fechaIngreso: ISODate
  fechaSalida?: ISODate | null
  motivoSalida?: string | null
}

export interface Grupo {
  id: UUID
  periodoId: UUID
  nombre: string
  estado: EstadoGrupo
  creadoEn: ISODate
  integrantes: GrupoIntegrante[]
  /** RF-03: tras postular la composición queda cerrada */
  composicionCerrada: boolean
}

export interface Invitacion {
  id: UUID
  grupo: Pick<Grupo, 'id' | 'nombre'>
  periodoId: UUID
  emisor: EstudianteResumen
  destino: EstudianteResumen
  estado: EstadoInvitacion
  fechaEnvio: ISODate
  expiraEn?: ISODate | null
  fechaRespuesta?: ISODate | null
}

export interface TutorPropuesto {
  id: UUID
  postulacionId: UUID
  docente: DocenteResumen
  ordenPrioridad: number
  /** Derivado (vista): el docente es el proponente del tema */
  esProponenteTema: boolean
}

export interface Postulacion {
  id: UUID
  tema: TemaResumen & { minIntegrantes: number; maxIntegrantes: number }
  periodoId: UUID
  modalidad: Modalidad
  grupo?: Pick<Grupo, 'id' | 'nombre'> | null
  estudiante?: EstudianteResumen | null
  integrantes: EstudianteResumen[]
  numIntegrantes: number
  registradaPor: PersonaResumen
  estado: EstadoPostulacion
  fechaPostulacion: ISODate
  observacion?: string | null
  tutoresPropuestos: TutorPropuesto[]
  /** Asignación vigente derivada de esta postulación, si existe */
  asignacionVigenteId?: UUID | null
}

export interface ConflictoParticipante {
  id: UUID
  postulacion: Pick<Postulacion, 'id' | 'modalidad' | 'grupo' | 'estudiante' | 'fechaPostulacion'>
  puntajeCriterio?: number | null
}

export interface ResolucionConflicto {
  id: UUID
  tema: TemaResumen
  periodoId: UUID
  resueltoPor: PersonaResumen
  criterioAplicado: CriterioConflicto
  postulacionGanadoraId: UUID
  justificacion: string
  fechaResolucion: ISODate
  participantes: ConflictoParticipante[]
}

/** Tema con varias postulaciones válidas compitiendo y sin resolución (RF-23) */
export interface ConflictoAbierto {
  tema: TemaResumen
  postulaciones: Postulacion[]
}

export interface AsignacionTema {
  id: UUID
  tema: TemaResumen
  postulacionId: UUID
  modalidad: Modalidad
  grupo?: Pick<Grupo, 'id' | 'nombre'> | null
  estudiante?: EstudianteResumen | null
  integrantes: EstudianteResumen[]
  aprobadaPor: PersonaResumen
  estado: EstadoAsignacionTema
  fechaAsignacion: ISODate
  motivo?: string | null
  causaAnulacion?: CausaAnulacion | null
  motivoAnulacion?: string | null
  anuladaPor?: PersonaResumen | null
  fechaAnulacion?: ISODate | null
  tutorVigente?: AsignacionTutor | null
  estadoPat?: EstadoDocumentoPat | null
}

export interface AsignacionTutor {
  id: UUID
  asignacionTemaId: UUID
  docente: DocenteResumen
  tutorPropuestoId?: UUID | null
  tipo: TipoAsignacionTutor
  estado: EstadoAsignacionTutor
  asignadaPor: PersonaResumen
  fechaAsignacion: ISODate
  fechaFin?: ISODate | null
  motivoCambio?: string | null
}

export interface ConfigCargaTutorial {
  id: UUID
  periodoId: UUID
  /** null ⇒ límite global del período */
  docente?: DocenteResumen | null
  maxTrabajos: number
  bloquearAlSuperar: boolean
}

export interface CargaDocente {
  docente: DocenteResumen
  habilitadoTutoria: boolean
  actual: number
  limite: number | null
  bloquear: boolean
  origenLimite: 'GLOBAL' | 'ESPECIFICO' | 'SIN_LIMITE'
}

export interface PlantillaPat {
  id: UUID
  periodoId: UUID
  version: string
  nombreArchivo: string
  mimeType: string
  tamanoBytes: number
  fechaVigenciaInicio?: ISODate | null
  fechaVigenciaFin?: ISODate | null
  publicadaPor: PersonaResumen
  activa: boolean
  creadoEn: ISODate
}

export interface RevisionPat {
  id: UUID
  documentoPatId: UUID
  revisor: PersonaResumen
  resultado: ResultadoRevision
  observaciones?: string | null
  fechaRevision: ISODate
}

export interface DocumentoPat {
  id: UUID
  asignacionTemaId: UUID
  plantillaId?: UUID | null
  version: number
  nombreArchivo: string
  formato: FormatoPat
  tamanoBytes: number
  hashSha256: string
  cargadoPor: PersonaResumen
  fechaCarga: ISODate
  estado: EstadoDocumentoPat
  revision?: RevisionPat | null
  /** Contexto para bandejas de revisión */
  tema?: TemaResumen
  integrantes?: EstudianteResumen[]
}

export interface Notificacion {
  id: UUID
  tipo: string
  titulo: string
  mensaje: string
  entidadTipo?: string | null
  entidadId?: UUID | null
  canal: CanalNotificacion
  leida: boolean
  fechaCreacion: ISODate
  fechaEnvio?: ISODate | null
}

export interface Auditoria {
  id: number
  usuario?: PersonaResumen | null
  accion: string
  entidadTipo: string
  entidadId?: UUID | null
  valoresAnteriores?: Record<string, unknown> | null
  valoresNuevos?: Record<string, unknown> | null
  ipOrigen?: string | null
  fechaHora: ISODate
}

export interface SolicitudExportacion {
  id: UUID
  periodoId?: UUID | null
  solicitadaPor: PersonaResumen
  tipoReporte: TipoReporte
  formato: FormatoExportacion
  filtros?: Record<string, unknown> | null
  estado: EstadoExportacion
  tamanoBytes?: number | null
  expiraEn?: ISODate | null
  fechaSolicitud: ISODate
  fechaGeneracion?: ISODate | null
}

// ───────────── Vistas agregadas ─────────────
export interface ResumenPeriodo {
  estudiantesHabilitados: number
  condicionadosPendientes: number
  temasPorEstado: Record<EstadoTema, number>
  postulacionesPorEstado: Record<EstadoPostulacion, number>
  conflictosAbiertos: number
  asignacionesVigentes: number
  sinTutor: number
  patPorRevisar: number
}

/** GET /me/seguimiento (RF-15) */
export interface Seguimiento {
  periodo: PeriodoTitulacion | null
  habilitacion: EstudianteHabilitado | null
  grupo: Grupo | null
  invitacionesPendientes: number
  postulacion: Postulacion | null
  asignacion: AsignacionTema | null
  ultimoPat: DocumentoPat | null
}

export interface Paginado<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
