import type {
  CausaAnulacion,
  CondicionIngreso,
  CriterioConflicto,
  EstadoAsignacionTema,
  EstadoAsignacionTutor,
  EstadoDocumentoPat,
  EstadoExportacion,
  EstadoGrupo,
  EstadoHabilitacion,
  EstadoImportacion,
  EstadoIntegrante,
  EstadoInvitacion,
  EstadoPeriodo,
  EstadoPostulacion,
  EstadoTema,
  Modalidad,
  OrigenHabilitacion,
  Rol,
  RolEnGrupo,
  SituacionIngreso,
  TipoAsignacionTutor,
  TipoReporte,
} from '@/types/dominio'

/** Variante visual del badge (ver components/StatusBadge). */
export type Tono = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'muted'

export interface InfoEstado {
  label: string
  tono: Tono
}

type Mapa<K extends string> = Record<K, InfoEstado>

export const ESTADO_PERIODO: Mapa<EstadoPeriodo> = {
  BORRADOR: { label: 'Borrador', tono: 'muted' },
  POSTULACION_ABIERTA: { label: 'Postulación abierta', tono: 'success' },
  POSTULACION_CERRADA: { label: 'Postulación cerrada', tono: 'warning' },
  EN_CURSO: { label: 'En curso', tono: 'info' },
  ARCHIVADO: { label: 'Archivado', tono: 'neutral' },
}

export const ESTADO_TEMA: Mapa<EstadoTema> = {
  BORRADOR: { label: 'Borrador', tono: 'muted' },
  PUBLICADO: { label: 'Publicado', tono: 'success' },
  CERRADO: { label: 'Cerrado', tono: 'warning' },
  ASIGNADO: { label: 'Asignado', tono: 'info' },
  RETIRADO: { label: 'Retirado', tono: 'danger' },
}

export const ESTADO_POSTULACION: Mapa<EstadoPostulacion> = {
  PENDIENTE: { label: 'Pendiente', tono: 'warning' },
  EN_CONFLICTO: { label: 'En conflicto', tono: 'danger' },
  ACEPTADA: { label: 'Aceptada', tono: 'success' },
  RECHAZADA: { label: 'Rechazada', tono: 'neutral' },
  CANCELADA: { label: 'Cancelada', tono: 'muted' },
  ANULADA: { label: 'Anulada', tono: 'muted' },
}

export const ESTADO_GRUPO: Mapa<EstadoGrupo> = {
  EN_CONFORMACION: { label: 'En conformación', tono: 'warning' },
  ACTIVO: { label: 'Activo', tono: 'success' },
  DISUELTO: { label: 'Disuelto', tono: 'muted' },
  ANULADO: { label: 'Anulado', tono: 'danger' },
}

export const ESTADO_INTEGRANTE: Mapa<EstadoIntegrante> = {
  ACTIVO: { label: 'Activo', tono: 'success' },
  RETIRADO: { label: 'Retirado', tono: 'muted' },
}

export const ROL_EN_GRUPO: Mapa<RolEnGrupo> = {
  REPRESENTANTE: { label: 'Representante', tono: 'info' },
  INTEGRANTE: { label: 'Integrante', tono: 'neutral' },
}

export const ESTADO_INVITACION: Mapa<EstadoInvitacion> = {
  PENDIENTE: { label: 'Pendiente', tono: 'warning' },
  ACEPTADA: { label: 'Aceptada', tono: 'success' },
  RECHAZADA: { label: 'Rechazada', tono: 'danger' },
  CANCELADA: { label: 'Cancelada', tono: 'muted' },
  EXPIRADA: { label: 'Expirada', tono: 'muted' },
}

export const ESTADO_HABILITACION: Mapa<EstadoHabilitacion> = {
  HABILITADO: { label: 'Habilitado', tono: 'success' },
  SUSPENDIDO: { label: 'Suspendido', tono: 'danger' },
}

export const CONDICION_INGRESO: Mapa<CondicionIngreso> = {
  REGULAR: { label: 'Regular', tono: 'neutral' },
  CONDICIONADO: { label: 'Condicionado', tono: 'warning' },
}

export const SITUACION_INGRESO: Mapa<SituacionIngreso> = {
  PENDIENTE: { label: 'Pendiente', tono: 'warning' },
  ADMITIDO: { label: 'Admitido', tono: 'success' },
  NO_ADMITIDO: { label: 'No admitido', tono: 'danger' },
}

export const ORIGEN_HABILITACION: Mapa<OrigenHabilitacion> = {
  MANUAL: { label: 'Manual', tono: 'neutral' },
  IMPORTACION: { label: 'Importación', tono: 'info' },
  SINCRONIZACION: { label: 'Sincronización', tono: 'info' },
}

export const ESTADO_IMPORTACION: Mapa<EstadoImportacion> = {
  EN_PROCESO: { label: 'En proceso', tono: 'info' },
  COMPLETADO: { label: 'Completado', tono: 'success' },
  COMPLETADO_CON_ERRORES: { label: 'Completado con errores', tono: 'warning' },
  FALLIDO: { label: 'Fallido', tono: 'danger' },
}

export const ESTADO_ASIGNACION_TEMA: Mapa<EstadoAsignacionTema> = {
  VIGENTE: { label: 'Vigente', tono: 'success' },
  ANULADA: { label: 'Anulada', tono: 'danger' },
}

export const CAUSA_ANULACION: Mapa<CausaAnulacion> = {
  INCUMPLIMIENTO_CONDICION: { label: 'Incumplimiento de condición', tono: 'danger' },
  OTRA: { label: 'Otra', tono: 'neutral' },
}

export const ESTADO_ASIGNACION_TUTOR: Mapa<EstadoAsignacionTutor> = {
  VIGENTE: { label: 'Vigente', tono: 'success' },
  REEMPLAZADA: { label: 'Reemplazada', tono: 'muted' },
  ANULADA: { label: 'Anulada', tono: 'danger' },
}

export const TIPO_ASIGNACION_TUTOR: Mapa<TipoAsignacionTutor> = {
  PROPUESTO_CONFIRMADO: { label: 'Propuesto confirmado', tono: 'info' },
  ASIGNADO_DIRECTO: { label: 'Asignado directo', tono: 'neutral' },
}

export const CRITERIO_CONFLICTO: Mapa<CriterioConflicto> = {
  ORDEN_LLEGADA: { label: 'Orden de llegada', tono: 'neutral' },
  PROMEDIO: { label: 'Promedio', tono: 'neutral' },
  SORTEO: { label: 'Sorteo', tono: 'neutral' },
  DECISION_COMISION: { label: 'Decisión de comisión', tono: 'neutral' },
}

export const ESTADO_PAT: Mapa<EstadoDocumentoPat> = {
  PENDIENTE: { label: 'Pendiente de revisión', tono: 'warning' },
  APROBADO: { label: 'Aprobado', tono: 'success' },
  OBSERVADO: { label: 'Observado', tono: 'warning' },
  RECHAZADO: { label: 'Rechazado', tono: 'danger' },
}

export const ESTADO_EXPORTACION: Mapa<EstadoExportacion> = {
  EN_COLA: { label: 'En cola', tono: 'muted' },
  PROCESANDO: { label: 'Procesando', tono: 'info' },
  LISTO: { label: 'Listo', tono: 'success' },
  FALLIDO: { label: 'Fallido', tono: 'danger' },
}

export const MODALIDAD: Mapa<Modalidad> = {
  INDIVIDUAL: { label: 'Individual', tono: 'neutral' },
  GRUPAL: { label: 'Grupal', tono: 'info' },
}

export const ROL: Mapa<Rol> = {
  ESTUDIANTE: { label: 'Estudiante', tono: 'info' },
  DOCENTE: { label: 'Docente', tono: 'success' },
  ADMIN: { label: 'Administrador', tono: 'warning' },
}

export const TIPO_REPORTE: Record<TipoReporte, string> = {
  ESTUDIANTES: 'Estudiantes habilitados',
  GRUPOS: 'Grupos',
  TEMAS_OFERTADOS: 'Temas ofertados',
  TEMAS_ASIGNADOS: 'Temas asignados',
  TEMAS_DISPONIBLES: 'Temas disponibles',
  DOCENTES: 'Docentes',
  CARGA_TUTORIAL: 'Carga tutorial',
}

export function opciones<K extends string>(mapa: Mapa<K>) {
  return (Object.keys(mapa) as K[]).map((value) => ({ value, label: mapa[value].label }))
}
