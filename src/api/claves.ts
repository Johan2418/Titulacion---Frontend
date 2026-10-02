/** Query keys centralizadas: el primer segmento agrupa para invalidaciones por prefijo. */
export const K = {
  periodos: ['periodos'] as const,
  periodoActual: ['periodos', 'actual'] as const,
  resumen: (pid: string) => ['periodos', pid, 'resumen'] as const,
  lineas: ['lineas'] as const,
  docentes: ['docentes'] as const,
  estudiantes: ['estudiantes'] as const,
  habilitados: ['habilitados'] as const,
  lotes: ['lotes'] as const,
  temas: ['temas'] as const,
  grupos: ['grupos'] as const,
  invitaciones: ['invitaciones'] as const,
  postulaciones: ['postulaciones'] as const,
  conflictos: ['conflictos'] as const,
  asignaciones: ['asignaciones'] as const,
  carga: ['carga'] as const,
  pat: ['pat'] as const,
  notificaciones: ['notificaciones'] as const,
  auditoria: ['auditoria'] as const,
  exportaciones: ['exportaciones'] as const,
  me: ['me'] as const,
}

/** Prefijos afectados por cambios en el flujo principal (postulación → asignación). */
export const FLUJO = [
  K.temas,
  K.postulaciones,
  K.conflictos,
  K.asignaciones,
  K.grupos,
  K.invitaciones,
  K.me,
  K.periodos,
  K.carga,
  K.notificaciones,
  K.habilitados,
]
