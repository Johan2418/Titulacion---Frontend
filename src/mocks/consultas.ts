/** Consultas reutilizadas por los handlers y los mapeadores. */
import { db, type ConfigCargaRow, type PostulacionRow } from './db'

export const ESTADOS_POSTULACION_ACTIVA = ['PENDIENTE', 'EN_CONFLICTO', 'ACEPTADA'] as const

export const usuario = (id: string | null | undefined) => db.usuarios.find((u) => u.id === id)
export const estudiante = (id: string | null | undefined) => db.estudiantes.find((e) => e.id === id)
export const docente = (id: string | null | undefined) => db.docentes.find((d) => d.id === id)
export const estudianteDeUsuario = (usuarioId: string) =>
  db.estudiantes.find((e) => e.usuarioId === usuarioId)
export const docenteDeUsuario = (usuarioId: string) =>
  db.docentes.find((d) => d.usuarioId === usuarioId)
export const periodo = (id: string | null | undefined) => db.periodos.find((p) => p.id === id)
export const tema = (id: string | null | undefined) => db.temas.find((t) => t.id === id)
export const grupo = (id: string | null | undefined) => db.grupos.find((g) => g.id === id)

export function periodoActual() {
  const orden = ['POSTULACION_ABIERTA', 'POSTULACION_CERRADA', 'EN_CURSO', 'BORRADOR']
  return (
    [...db.periodos]
      .filter((p) => p.estado !== 'ARCHIVADO')
      .sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado))[0] ?? null
  )
}

export function habilitacion(periodoId: string, estudianteId: string) {
  return db.habilitados.find((h) => h.periodoId === periodoId && h.estudianteId === estudianteId)
}

export function integrantesActivos(grupoId: string) {
  return db.integrantes.filter((i) => i.grupoId === grupoId && i.estado === 'ACTIVO')
}

export function grupoActivoDe(periodoId: string, estudianteId: string) {
  const i = db.integrantes.find(
    (x) => x.periodoId === periodoId && x.estudianteId === estudianteId && x.estado === 'ACTIVO',
  )
  const g = i ? grupo(i.grupoId) : undefined
  return g && (g.estado === 'ACTIVO' || g.estado === 'EN_CONFORMACION') ? g : undefined
}

export function esActiva(p: PostulacionRow) {
  return (ESTADOS_POSTULACION_ACTIVA as readonly string[]).includes(p.estado)
}

export function postulacionActivaDeGrupo(grupoId: string) {
  return db.postulaciones.find((p) => p.grupoId === grupoId && esActiva(p))
}

export function postulacionActivaIndividual(periodoId: string, estudianteId: string) {
  return db.postulaciones.find(
    (p) => p.periodoId === periodoId && p.estudianteId === estudianteId && esActiva(p),
  )
}

/** Postulación activa del estudiante, individual o a través de su grupo. */
export function postulacionActivaDe(periodoId: string, estudianteId: string) {
  const ind = postulacionActivaIndividual(periodoId, estudianteId)
  if (ind) return ind
  const g = grupoActivoDe(periodoId, estudianteId)
  return g ? postulacionActivaDeGrupo(g.id) : undefined
}

export function integrantesDePostulacion(p: PostulacionRow) {
  if (p.estudianteId) return [p.estudianteId]
  return p.grupoId ? integrantesActivos(p.grupoId).map((i) => i.estudianteId) : []
}

export function asignacionVigenteDeTema(temaId: string) {
  return db.asignacionesTema.find((a) => a.temaId === temaId && a.estado === 'VIGENTE')
}

export function asignacionVigenteDe(periodoId: string, estudianteId: string) {
  return db.asignacionesTema.find((a) => {
    if (a.estado !== 'VIGENTE' || tema(a.temaId)?.periodoId !== periodoId) return false
    if (a.estudianteId === estudianteId) return true
    return !!a.grupoId && integrantesActivos(a.grupoId).some((i) => i.estudianteId === estudianteId)
  })
}

export function estudiantesDeAsignacion(asignacionId: string) {
  const a = db.asignacionesTema.find((x) => x.id === asignacionId)
  if (!a) return []
  if (a.estudianteId) return [a.estudianteId]
  return a.grupoId ? integrantesActivos(a.grupoId).map((i) => i.estudianteId) : []
}

export function usuariosDeEstudiantes(ids: string[]) {
  return ids.map((id) => estudiante(id)?.usuarioId)
}

export function postulacionesAbiertasDeTema(temaId: string) {
  return db.postulaciones.filter(
    (p) => p.temaId === temaId && (p.estado === 'PENDIENTE' || p.estado === 'EN_CONFLICTO'),
  )
}

export function temaDisponible(temaId: string) {
  const t = tema(temaId)
  return !!t && t.estado === 'PUBLICADO' && !asignacionVigenteDeTema(temaId)
}

export function tutorVigente(asignacionId: string) {
  return db.asignacionesTutor.find(
    (t) => t.asignacionTemaId === asignacionId && t.estado === 'VIGENTE',
  )
}

/** RN-11: carga actual y límite aplicable de un docente en un período. */
export function cargaDocente(periodoId: string, docenteId: string) {
  const actual = db.asignacionesTutor.filter((t) => {
    if (t.docenteId !== docenteId || t.estado !== 'VIGENTE') return false
    const a = db.asignacionesTema.find((x) => x.id === t.asignacionTemaId)
    return a?.estado === 'VIGENTE' && tema(a.temaId)?.periodoId === periodoId
  }).length
  const especifico = db.configCarga.find(
    (c) => c.periodoId === periodoId && c.docenteId === docenteId,
  )
  const global = db.configCarga.find((c) => c.periodoId === periodoId && c.docenteId === null)
  const cfg: ConfigCargaRow | undefined = especifico ?? global
  return {
    actual,
    limite: cfg?.maxTrabajos ?? null,
    bloquear: cfg?.bloquearAlSuperar ?? false,
    origenLimite: (especifico ? 'ESPECIFICO' : global ? 'GLOBAL' : 'SIN_LIMITE') as
      'ESPECIFICO' | 'GLOBAL' | 'SIN_LIMITE',
  }
}

export function documentosDeAsignacion(asignacionId: string) {
  return db.documentosPat
    .filter((d) => d.asignacionTemaId === asignacionId)
    .sort((a, b) => a.version - b.version)
}

export function revisionDe(documentoId: string) {
  return db.revisionesPat.find((r) => r.documentoPatId === documentoId)
}

export function estadoDocumento(documentoId: string) {
  return revisionDe(documentoId)?.resultado ?? 'PENDIENTE'
}

export function condicionadosPendientes(periodoId: string) {
  return db.habilitados.filter(
    (h) =>
      h.periodoId === periodoId &&
      h.condicionIngreso === 'CONDICIONADO' &&
      h.situacionIngreso === 'PENDIENTE',
  ).length
}
