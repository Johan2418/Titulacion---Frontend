/**
 * Traducción de las respuestas del backend (ya en camelCase) a los tipos de dominio del frontend.
 * El backend devuelve resúmenes más pequeños (p. ej. personas sin email ni cédula); los campos
 * que no envía se completan con valores neutros para que las pantallas no cambien.
 */
import type {
  AsignacionTema,
  AsignacionTutor,
  CargaDocente,
  ConfigCargaTutorial,
  Docente,
  DocenteResumen,
  DocumentoPat,
  Estudiante,
  EstudianteHabilitado,
  EstudianteResumen,
  Grupo,
  Invitacion,
  ISODate,
  LoteImportacion,
  Modalidad,
  PersonaResumen,
  PlantillaPat,
  Postulacion,
  ResultadoRevision,
  RevisionPat,
  Tema,
  TemaHistorial,
  TutorPropuesto,
  UUID,
  Usuario,
} from '@/types/dominio'

// ───────────── Formas del backend ─────────────
export interface PersonaB {
  id: UUID
  nombres: string
  apellidos: string
  email?: string
  matricula?: string
}

export interface DocenteB {
  id: UUID
  usuario: Usuario
  cedula: string
  tituloAcademico: string | null
  departamento: string | null
  habilitadoTutoria: boolean
}

export interface EstudianteB {
  id: UUID
  usuario: Usuario
  cedula: string
  matricula: string
  carrera: string
  nivel: number
}

export interface HabilitadoB extends Omit<
  EstudianteHabilitado,
  'estudiante' | 'resueltoPor' | 'periodoId'
> {
  periodoId: UUID
  estudianteId: UUID
  estudiante: PersonaB
  resueltoPorId: UUID | null
}

export interface TemaB {
  id: UUID
  periodoId: UUID
  linea: { id: UUID; codigo: string; nombre: string }
  docenteProponente: PersonaB
  titulo: string
  descripcion: string
  minIntegrantes: number
  maxIntegrantes: number
  estado: Tema['estado']
  creadoEn: ISODate
  disponible: boolean
  postulacionesAbiertas: number
}

export interface TemaHistorialB {
  id: UUID
  temaId: UUID
  responsable: PersonaB
  estadoAnterior: TemaHistorial['estadoAnterior']
  estadoNuevo: TemaHistorial['estadoNuevo']
  cambios: { anteriores?: Record<string, unknown> | null; nuevos?: Record<string, unknown> } | null
  fecha: ISODate
}

export interface GrupoB {
  id: UUID
  periodoId: UUID
  nombre: string
  estado: Grupo['estado']
  creadoEn: ISODate
  composicionCerrada: boolean
  integrantes: {
    id: UUID
    estudiante: PersonaB
    rolEnGrupo: Grupo['integrantes'][number]['rolEnGrupo']
    estado: Grupo['integrantes'][number]['estado']
    fechaIngreso: ISODate
    fechaSalida: ISODate | null
    motivoSalida: string | null
  }[]
}

export interface InvitacionB {
  id: UUID
  periodoId: UUID
  grupo: { id: UUID; nombre: string }
  estudianteEmisor: PersonaB
  estudianteDestino: PersonaB
  estado: Invitacion['estado']
  fechaEnvio: ISODate
  expiraEn: ISODate | null
  fechaRespuesta: ISODate | null
}

export interface PostulacionB {
  id: UUID
  periodoId: UUID
  tema: { id: UUID; titulo: string; minIntegrantes: number; maxIntegrantes: number }
  grupoId: UUID | null
  grupo: { id: UUID; nombre: string } | null
  estudianteId: UUID | null
  participantes: PersonaB[]
  numIntegrantes: number
  registradaPor: PersonaB
  estado: Postulacion['estado']
  fechaPostulacion: ISODate
  observacion: string | null
}

export interface TutorPropuestoB {
  id: UUID
  postulacionId: UUID
  docenteId: UUID
  ordenPrioridad: number
  docente: PersonaB
  esProponenteTema: boolean
}

export interface TutorDisponibleB extends PersonaB {
  tituloAcademico: string | null
  departamento: string | null
  esProponenteTema: boolean
}

export interface AsignacionTemaB {
  id: UUID
  periodoId: UUID
  tema: { id: UUID; titulo: string }
  postulacionId: UUID
  postulacion: { id: UUID; modalidad: Modalidad }
  grupo: { id: UUID; nombre: string } | null
  estudianteId: UUID | null
  participantes: PersonaB[]
  aprobadaPor: PersonaB
  estado: AsignacionTema['estado']
  fechaAsignacion: ISODate
  motivo: string | null
  causaAnulacion: AsignacionTema['causaAnulacion']
  motivoAnulacion: string | null
  fechaAnulacion: ISODate | null
}

export interface AsignacionTutorB {
  id: UUID
  asignacionTemaId: UUID
  tutorPropuestoId: UUID | null
  tipo: AsignacionTutor['tipo']
  estado: AsignacionTutor['estado']
  fechaAsignacion: ISODate
  fechaFin: ISODate | null
  motivoCambio: string | null
  docente: PersonaB
  responsable: PersonaB
  trabajo: {
    id: UUID
    tema: { id: UUID; titulo: string }
    postulacion: { id: UUID; modalidad: Modalidad }
    grupo: { id: UUID; nombre: string } | null
    participantes: PersonaB[]
  }
}

export interface ConfigCargaB {
  id: UUID
  periodoId: UUID
  docenteId: UUID | null
  maxTrabajos: number
  bloquearAlSuperar: boolean
}

export interface CargaActualB {
  docenteId: UUID
  cargaActual: number
  origen: 'DOCENTE' | 'GLOBAL' | 'SIN_CONFIGURACION'
  configuracion: { id: UUID; maxTrabajos: number; bloquearAlSuperar: boolean } | null
}

export interface PlantillaB {
  id: UUID
  periodoId: UUID
  version: string
  nombreArchivo: string
  mimeType: string
  tamanoBytes: number
  fechaVigenciaInicio: ISODate | null
  fechaVigenciaFin: ISODate | null
  activa: boolean
  publicador: PersonaB
}

export interface RevisionB {
  id: UUID
  documentoPatId: UUID
  resultado: ResultadoRevision
  observaciones: string | null
  fechaRevision: ISODate
  revisor: PersonaB
}

export interface DocumentoPatB {
  id: UUID
  asignacionTemaId: UUID
  plantillaId: UUID | null
  version: number
  nombreArchivo: string
  formato: DocumentoPat['formato']
  tamanoBytes: number
  hashSha256: string
  fechaCarga: ISODate
  revision: DocumentoPat['estado']
  detalleRevision: RevisionB | null
  cargador: PersonaB
}

export interface UrlFirmadaB {
  url: string
  expiraEn: ISODate
}

// ───────────── Resúmenes ─────────────
export const persona = (p: PersonaB | null | undefined): PersonaResumen => ({
  id: p?.id ?? '',
  nombres: p?.nombres ?? '',
  apellidos: p?.apellidos ?? '',
  email: p?.email ?? '',
})

export const estudianteResumen = (p: PersonaB): EstudianteResumen => ({
  ...persona(p),
  cedula: '',
  matricula: p.matricula ?? '',
})

export const docenteResumen = (p: PersonaB): DocenteResumen => ({ ...persona(p), cedula: '' })

// ───────────── Entidades ─────────────
export const docente = (d: DocenteB): Docente => ({
  id: d.id,
  usuarioId: d.usuario.id,
  cedula: d.cedula,
  tituloAcademico: d.tituloAcademico,
  departamento: d.departamento,
  habilitadoTutoria: d.habilitadoTutoria,
  nombres: d.usuario.nombres,
  apellidos: d.usuario.apellidos,
  email: d.usuario.email,
  estado: d.usuario.estado,
})

/** Tutores elegibles que el backend ofrece a un estudiante para un tema. */
export const docenteDisponible = (d: TutorDisponibleB): Docente => ({
  id: d.id,
  usuarioId: '',
  cedula: '',
  tituloAcademico: d.tituloAcademico,
  departamento: d.departamento,
  habilitadoTutoria: true,
  nombres: d.nombres,
  apellidos: d.apellidos,
  email: d.email ?? '',
  estado: 'ACTIVO',
})

export const estudiante = (e: EstudianteB): Estudiante => ({
  id: e.id,
  usuarioId: e.usuario.id,
  cedula: e.cedula,
  matricula: e.matricula,
  carrera: e.carrera,
  nivel: e.nivel,
  nombres: e.usuario.nombres,
  apellidos: e.usuario.apellidos,
  email: e.usuario.email,
})

export const habilitado = (
  h: HabilitadoB,
  perfiles?: Map<UUID, Estudiante>,
): EstudianteHabilitado => {
  const perfil = perfiles?.get(h.estudianteId)
  return {
    id: h.id,
    periodoId: h.periodoId,
    estudiante: {
      ...estudianteResumen(h.estudiante),
      id: h.estudianteId,
      email: perfil?.email ?? '',
      cedula: perfil?.cedula ?? '',
      carrera: perfil?.carrera ?? '',
      nivel: perfil?.nivel ?? 0,
    },
    origen: h.origen,
    loteImportacionId: h.loteImportacionId,
    estado: h.estado,
    condicionIngreso: h.condicionIngreso,
    requisitoPendiente: h.requisitoPendiente,
    situacionIngreso: h.situacionIngreso,
    fechaHabilitacion: h.fechaHabilitacion,
    fechaResolucionIngreso: h.fechaResolucionIngreso,
    resueltoPor: null,
    observacionIngreso: h.observacionIngreso,
  }
}

export const tema = (t: TemaB): Tema => ({
  id: t.id,
  periodoId: t.periodoId,
  linea: { id: t.linea.id, nombre: t.linea.nombre },
  docenteProponente: docenteResumen(t.docenteProponente),
  titulo: t.titulo,
  descripcion: t.descripcion,
  minIntegrantes: t.minIntegrantes,
  maxIntegrantes: t.maxIntegrantes,
  estado: t.estado,
  creadoEn: t.creadoEn,
  disponible: t.disponible,
  postulacionesAbiertas: t.postulacionesAbiertas,
})

/** El backend guarda { anteriores, nuevos }; el front muestra { campo: { antes, despues } }. */
export const temaHistorial = (h: TemaHistorialB): TemaHistorial => {
  const antes = h.cambios?.anteriores ?? {}
  const despues = h.cambios?.nuevos ?? {}
  const cambios: NonNullable<TemaHistorial['cambios']> = {}
  for (const campo of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
    if (JSON.stringify(antes[campo]) !== JSON.stringify(despues[campo]))
      cambios[campo] = { antes: antes[campo], despues: despues[campo] }
  }
  return {
    id: h.id,
    temaId: h.temaId,
    usuario: persona(h.responsable),
    estadoAnterior: h.estadoAnterior,
    estadoNuevo: h.estadoNuevo,
    cambios: Object.keys(cambios).length ? cambios : null,
    fecha: h.fecha,
  }
}

export const grupo = (g: GrupoB): Grupo => ({
  id: g.id,
  periodoId: g.periodoId,
  nombre: g.nombre,
  estado: g.estado,
  creadoEn: g.creadoEn,
  composicionCerrada: g.composicionCerrada,
  integrantes: g.integrantes.map((i) => ({
    id: i.id,
    estudiante: estudianteResumen(i.estudiante),
    rolEnGrupo: i.rolEnGrupo,
    estado: i.estado,
    fechaIngreso: i.fechaIngreso,
    fechaSalida: i.fechaSalida,
    motivoSalida: i.motivoSalida,
  })),
})

export const invitacion = (i: InvitacionB): Invitacion => ({
  id: i.id,
  grupo: { id: i.grupo.id, nombre: i.grupo.nombre },
  periodoId: i.periodoId,
  emisor: estudianteResumen(i.estudianteEmisor),
  destino: estudianteResumen(i.estudianteDestino),
  estado: i.estado,
  fechaEnvio: i.fechaEnvio,
  expiraEn: i.expiraEn,
  fechaRespuesta: i.fechaRespuesta,
})

export const tutorPropuesto = (t: TutorPropuestoB): TutorPropuesto => ({
  id: t.id,
  postulacionId: t.postulacionId,
  docente: { ...docenteResumen(t.docente), id: t.docenteId },
  ordenPrioridad: t.ordenPrioridad,
  esProponenteTema: t.esProponenteTema,
})

export const postulacion = (
  p: PostulacionB,
  extra: { tutores?: TutorPropuesto[]; asignacionVigenteId?: UUID | null } = {},
): Postulacion => {
  const integrantes = p.participantes.map(estudianteResumen)
  return {
    id: p.id,
    tema: p.tema,
    periodoId: p.periodoId,
    modalidad: p.grupoId ? 'GRUPAL' : 'INDIVIDUAL',
    grupo: p.grupo,
    estudiante: p.estudianteId ? (integrantes[0] ?? null) : null,
    integrantes,
    numIntegrantes: p.numIntegrantes,
    registradaPor: persona(p.registradaPor),
    estado: p.estado,
    fechaPostulacion: p.fechaPostulacion,
    observacion: p.observacion,
    tutoresPropuestos: extra.tutores ?? [],
    asignacionVigenteId: extra.asignacionVigenteId ?? null,
  }
}

export const asignacionTutor = (a: AsignacionTutorB): AsignacionTutor => ({
  id: a.id,
  asignacionTemaId: a.asignacionTemaId,
  docente: docenteResumen(a.docente),
  tutorPropuestoId: a.tutorPropuestoId,
  tipo: a.tipo,
  estado: a.estado,
  asignadaPor: persona(a.responsable),
  fechaAsignacion: a.fechaAsignacion,
  fechaFin: a.fechaFin,
  motivoCambio: a.motivoCambio,
})

export const asignacionTema = (
  a: AsignacionTemaB,
  extra: Pick<AsignacionTema, 'tutorVigente' | 'estadoPat'> = {},
): AsignacionTema => {
  const integrantes = a.participantes.map(estudianteResumen)
  return {
    id: a.id,
    tema: a.tema,
    postulacionId: a.postulacionId,
    modalidad: a.postulacion.modalidad,
    grupo: a.grupo,
    estudiante: a.estudianteId ? (integrantes[0] ?? null) : null,
    integrantes,
    aprobadaPor: persona(a.aprobadaPor),
    estado: a.estado,
    fechaAsignacion: a.fechaAsignacion,
    motivo: a.motivo,
    causaAnulacion: a.causaAnulacion,
    motivoAnulacion: a.motivoAnulacion,
    anuladaPor: null,
    fechaAnulacion: a.fechaAnulacion,
    tutorVigente: extra.tutorVigente ?? null,
    estadoPat: extra.estadoPat ?? null,
  }
}

/** Para el docente, cada tutoría trae el trabajo (asignación de tema) embebido. */
export const asignacionDesdeTutoria = (t: AsignacionTutorB): AsignacionTema => {
  const integrantes = t.trabajo.participantes.map(estudianteResumen)
  const modalidad = t.trabajo.postulacion.modalidad
  return {
    id: t.trabajo.id,
    tema: t.trabajo.tema,
    postulacionId: t.trabajo.postulacion.id,
    modalidad,
    grupo: t.trabajo.grupo,
    estudiante: modalidad === 'INDIVIDUAL' ? (integrantes[0] ?? null) : null,
    integrantes,
    aprobadaPor: persona(null),
    estado: 'VIGENTE',
    fechaAsignacion: t.fechaAsignacion,
    tutorVigente: asignacionTutor(t),
    estadoPat: null,
  }
}

export const configCarga = (c: ConfigCargaB, docentes: Map<UUID, Docente>): ConfigCargaTutorial => {
  const d = c.docenteId ? docentes.get(c.docenteId) : undefined
  return {
    id: c.id,
    periodoId: c.periodoId,
    docente: c.docenteId
      ? d
        ? { id: d.id, nombres: d.nombres, apellidos: d.apellidos, email: d.email, cedula: d.cedula }
        : { id: c.docenteId, nombres: '', apellidos: '', email: '', cedula: '' }
      : null,
    maxTrabajos: c.maxTrabajos,
    bloquearAlSuperar: c.bloquearAlSuperar,
  }
}

export const cargaDocente = (c: CargaActualB, d: Docente | DocenteResumen): CargaDocente => ({
  docente: {
    id: d.id,
    nombres: d.nombres,
    apellidos: d.apellidos,
    email: d.email,
    cedula: d.cedula,
  },
  habilitadoTutoria: 'habilitadoTutoria' in d ? d.habilitadoTutoria : true,
  actual: c.cargaActual,
  limite: c.configuracion?.maxTrabajos ?? null,
  bloquear: c.configuracion?.bloquearAlSuperar ?? false,
  origenLimite:
    c.origen === 'DOCENTE' ? 'ESPECIFICO' : c.origen === 'GLOBAL' ? 'GLOBAL' : 'SIN_LIMITE',
})

export const plantilla = (p: PlantillaB): PlantillaPat => ({
  id: p.id,
  periodoId: p.periodoId,
  version: p.version,
  nombreArchivo: p.nombreArchivo,
  mimeType: p.mimeType,
  tamanoBytes: p.tamanoBytes,
  fechaVigenciaInicio: p.fechaVigenciaInicio,
  fechaVigenciaFin: p.fechaVigenciaFin,
  publicadaPor: persona(p.publicador),
  activa: p.activa,
  creadoEn: p.fechaVigenciaInicio ?? '',
})

const revision = (r: RevisionB): RevisionPat => ({
  id: r.id,
  documentoPatId: r.documentoPatId,
  revisor: persona(r.revisor),
  resultado: r.resultado,
  observaciones: r.observaciones,
  fechaRevision: r.fechaRevision,
})

export const documentoPat = (d: DocumentoPatB): DocumentoPat => ({
  id: d.id,
  asignacionTemaId: d.asignacionTemaId,
  plantillaId: d.plantillaId,
  version: d.version,
  nombreArchivo: d.nombreArchivo,
  formato: d.formato,
  tamanoBytes: d.tamanoBytes,
  hashSha256: d.hashSha256,
  cargadoPor: persona(d.cargador),
  fechaCarga: d.fechaCarga,
  estado: d.revision,
  revision: d.detalleRevision ? revision(d.detalleRevision) : null,
})

// ── Historial de importaciones ──
export type EstadoPreparacionB =
  'VALIDANDO' | 'LISTA' | 'INVALIDA' | 'EN_COLA' | 'PROCESANDO' | 'COMPLETADA' | 'FALLIDA'

export interface ImportacionHistorialB {
  id: UUID
  tipo: LoteImportacion['tipo']
  periodoId: UUID | null
  nombreArchivo: string
  estado: EstadoPreparacionB
  expirada: boolean
  totalFilas: number
  filasOk: number
  filasError: number
  errores: { fila: number; columna?: string; mensaje: string }[]
  lote: {
    id: UUID
    estado: LoteImportacion['estado']
    totalFilas: number
    filasOk: number
    filasError: number
    fechaInicio: ISODate
    fechaFin: ISODate | null
  } | null
  solicitadaPor: { id: UUID; nombres: string; apellidos: string }
  creadaEn: ISODate
  expiraEn: ISODate
}

const ESTADO_PREPARACION: Record<EstadoPreparacionB, LoteImportacion['estado']> = {
  VALIDANDO: 'EN_PROCESO',
  LISTA: 'EN_PROCESO',
  EN_COLA: 'EN_PROCESO',
  PROCESANDO: 'EN_PROCESO',
  COMPLETADA: 'COMPLETADO',
  INVALIDA: 'FALLIDO',
  FALLIDA: 'FALLIDO',
}

/** Una preparación (y su lote, si se completó) como lote de importación del frontend. */
export const loteImportacion = (p: ImportacionHistorialB): LoteImportacion => ({
  id: p.id,
  periodoId: p.periodoId,
  tipo: p.tipo,
  nombreArchivo: p.nombreArchivo,
  // una vista previa vencida ya no avanzará: deja de contarse como en proceso
  estado: p.lote?.estado ?? (p.expirada ? 'FALLIDO' : ESTADO_PREPARACION[p.estado]),
  totalFilas: p.lote?.totalFilas ?? p.totalFilas,
  filasOk: p.filasOk,
  filasError: p.filasError,
  errores: p.errores.map((e) => ({
    fila: e.fila,
    mensaje: e.columna ? `${e.columna}: ${e.mensaje}` : e.mensaje,
  })),
  fechaInicio: p.creadaEn,
  fechaFin: p.lote?.fechaFin ?? null,
  expirada: p.expirada,
  solicitadaPor: p.solicitadaPor,
})
