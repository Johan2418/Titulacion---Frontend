/** Mapeadores fila → DTO expandido (lo que devuelve la API REST). */
import type * as D from '@/types/dominio'
import {
  db,
  type AsignacionTemaRow,
  type AsignacionTutorRow,
  type DocumentoPatRow,
  type ExportacionRow,
  type GrupoRow,
  type HabilitadoRow,
  type InvitacionRow,
  type LoteRow,
  type PeriodoRow,
  type PlantillaRow,
  type PostulacionRow,
  type ResolucionRow,
  type TemaRow,
  type UsuarioRow,
} from './db'
import * as q from './consultas'

export function persona(usuarioId: string | null | undefined): D.PersonaResumen {
  const u = q.usuario(usuarioId)
  return u
    ? { id: u.id, nombres: u.nombres, apellidos: u.apellidos, email: u.email }
    : { id: usuarioId ?? '', nombres: 'Sistema', apellidos: '', email: '' }
}

export function estudianteResumen(estudianteId: string): D.EstudianteResumen {
  const e = q.estudiante(estudianteId)!
  const u = q.usuario(e.usuarioId)!
  return {
    id: e.id,
    nombres: u.nombres,
    apellidos: u.apellidos,
    email: u.email,
    cedula: e.cedula,
    matricula: e.matricula,
  }
}

export function docenteResumen(docenteId: string): D.DocenteResumen {
  const d = q.docente(docenteId)!
  const u = q.usuario(d.usuarioId)!
  return { id: d.id, nombres: u.nombres, apellidos: u.apellidos, email: u.email, cedula: d.cedula }
}

export function sesion(u: UsuarioRow): D.SesionUsuario {
  return {
    id: u.id,
    email: u.email,
    nombres: u.nombres,
    apellidos: u.apellidos,
    rol: u.rol,
    estado: u.estado,
    ultimoAcceso: u.ultimoAcceso,
    creadoEn: u.creadoEn,
    estudianteId: q.estudianteDeUsuario(u.id)?.id ?? null,
    docenteId: q.docenteDeUsuario(u.id)?.id ?? null,
  }
}

export function periodoDto(p: PeriodoRow): D.PeriodoTitulacion {
  return { ...p, condicionadosPendientes: q.condicionadosPendientes(p.id) }
}

export function estudianteDto(id: string): D.Estudiante {
  const e = q.estudiante(id)!
  const u = q.usuario(e.usuarioId)!
  return { ...e, nombres: u.nombres, apellidos: u.apellidos, email: u.email }
}

export function docenteDto(id: string): D.Docente {
  const d = q.docente(id)!
  const u = q.usuario(d.usuarioId)!
  return { ...d, nombres: u.nombres, apellidos: u.apellidos, email: u.email, estado: u.estado }
}

export function habilitadoDto(h: HabilitadoRow): D.EstudianteHabilitado {
  const e = q.estudiante(h.estudianteId)!
  return {
    id: h.id,
    periodoId: h.periodoId,
    estudiante: { ...estudianteResumen(h.estudianteId), carrera: e.carrera, nivel: e.nivel },
    origen: h.origen,
    loteImportacionId: h.loteImportacionId,
    estado: h.estado,
    condicionIngreso: h.condicionIngreso,
    requisitoPendiente: h.requisitoPendiente,
    situacionIngreso: h.situacionIngreso,
    fechaHabilitacion: h.fechaHabilitacion,
    fechaResolucionIngreso: h.fechaResolucionIngreso,
    resueltoPor: h.resueltoPorId ? persona(h.resueltoPorId) : null,
    observacionIngreso: h.observacionIngreso,
  }
}

export function loteDto(l: LoteRow): D.LoteImportacion {
  const { ejecutadoPorId: _e, rutaAlmacenamiento: _r, ...resto } = l
  return resto
}

export function temaDto(t: TemaRow): D.Tema {
  const l = db.lineas.find((x) => x.id === t.lineaId)!
  return {
    id: t.id,
    periodoId: t.periodoId,
    linea: { id: l.id, nombre: l.nombre },
    docenteProponente: docenteResumen(t.docenteProponenteId),
    titulo: t.titulo,
    descripcion: t.descripcion,
    minIntegrantes: t.minIntegrantes,
    maxIntegrantes: t.maxIntegrantes,
    estado: t.estado,
    creadoEn: t.creadoEn,
    disponible: q.temaDisponible(t.id),
    postulacionesAbiertas: q.postulacionesAbiertasDeTema(t.id).length,
  }
}

export function grupoDto(g: GrupoRow): D.Grupo {
  return {
    id: g.id,
    periodoId: g.periodoId,
    nombre: g.nombre,
    estado: g.estado,
    creadoEn: g.creadoEn,
    composicionCerrada: db.postulaciones.some(
      (p) => p.grupoId === g.id && p.estado !== 'CANCELADA',
    ),
    integrantes: db.integrantes
      .filter((i) => i.grupoId === g.id)
      .map((i) => ({
        id: i.id,
        estudiante: estudianteResumen(i.estudianteId),
        rolEnGrupo: i.rolEnGrupo,
        estado: i.estado,
        fechaIngreso: i.fechaIngreso,
        fechaSalida: i.fechaSalida,
        motivoSalida: i.motivoSalida,
      })),
  }
}

export function invitacionDto(i: InvitacionRow): D.Invitacion {
  const g = q.grupo(i.grupoId)!
  return {
    id: i.id,
    grupo: { id: g.id, nombre: g.nombre },
    periodoId: i.periodoId,
    emisor: estudianteResumen(i.estudianteEmisorId),
    destino: estudianteResumen(i.estudianteDestinoId),
    estado:
      i.estado === 'PENDIENTE' && i.expiraEn && new Date(i.expiraEn) < new Date()
        ? 'EXPIRADA'
        : i.estado,
    fechaEnvio: i.fechaEnvio,
    expiraEn: i.expiraEn,
    fechaRespuesta: i.fechaRespuesta,
  }
}

export function postulacionDto(p: PostulacionRow): D.Postulacion {
  const t = q.tema(p.temaId)!
  const g = p.grupoId ? q.grupo(p.grupoId) : null
  return {
    id: p.id,
    tema: {
      id: t.id,
      titulo: t.titulo,
      minIntegrantes: t.minIntegrantes,
      maxIntegrantes: t.maxIntegrantes,
    },
    periodoId: p.periodoId,
    modalidad: p.grupoId ? 'GRUPAL' : 'INDIVIDUAL',
    grupo: g ? { id: g.id, nombre: g.nombre } : null,
    estudiante: p.estudianteId ? estudianteResumen(p.estudianteId) : null,
    integrantes: q.integrantesDePostulacion(p).map(estudianteResumen),
    numIntegrantes: p.numIntegrantes,
    registradaPor: persona(p.registradaPorId),
    estado: p.estado,
    fechaPostulacion: p.fechaPostulacion,
    observacion: p.observacion,
    asignacionVigenteId:
      db.asignacionesTema.find((a) => a.postulacionId === p.id && a.estado === 'VIGENTE')?.id ??
      null,
    tutoresPropuestos: db.tutoresPropuestos
      .filter((tp) => tp.postulacionId === p.id)
      .sort((a, b) => a.ordenPrioridad - b.ordenPrioridad)
      .map((tp) => ({
        id: tp.id,
        postulacionId: tp.postulacionId,
        docente: docenteResumen(tp.docenteId),
        ordenPrioridad: tp.ordenPrioridad,
        esProponenteTema: tp.docenteId === t.docenteProponenteId,
      })),
  }
}

export function resolucionDto(r: ResolucionRow): D.ResolucionConflicto {
  const t = q.tema(r.temaId)!
  return {
    id: r.id,
    tema: { id: t.id, titulo: t.titulo },
    periodoId: r.periodoId,
    resueltoPor: persona(r.resueltoPorId),
    criterioAplicado: r.criterioAplicado,
    postulacionGanadoraId: r.postulacionGanadoraId,
    justificacion: r.justificacion,
    fechaResolucion: r.fechaResolucion,
    participantes: db.participantes
      .filter((p) => p.resolucionConflictoId === r.id)
      .map((p) => {
        const pos = postulacionDto(db.postulaciones.find((x) => x.id === p.postulacionId)!)
        return {
          id: p.id,
          puntajeCriterio: p.puntajeCriterio,
          postulacion: {
            id: pos.id,
            modalidad: pos.modalidad,
            grupo: pos.grupo,
            estudiante: pos.estudiante,
            fechaPostulacion: pos.fechaPostulacion,
          },
        }
      }),
  }
}

export function asignacionTutorDto(t: AsignacionTutorRow): D.AsignacionTutor {
  return {
    id: t.id,
    asignacionTemaId: t.asignacionTemaId,
    docente: docenteResumen(t.docenteId),
    tutorPropuestoId: t.tutorPropuestoId,
    tipo: t.tipo,
    estado: t.estado,
    asignadaPor: persona(t.asignadaPorId),
    fechaAsignacion: t.fechaAsignacion,
    fechaFin: t.fechaFin,
    motivoCambio: t.motivoCambio,
  }
}

export function asignacionDto(a: AsignacionTemaRow): D.AsignacionTema {
  const t = q.tema(a.temaId)!
  const g = a.grupoId ? q.grupo(a.grupoId) : null
  const tutor = q.tutorVigente(a.id)
  const ultimo = q.documentosDeAsignacion(a.id).at(-1)
  return {
    id: a.id,
    tema: { id: t.id, titulo: t.titulo },
    postulacionId: a.postulacionId,
    modalidad: a.grupoId ? 'GRUPAL' : 'INDIVIDUAL',
    grupo: g ? { id: g.id, nombre: g.nombre } : null,
    estudiante: a.estudianteId ? estudianteResumen(a.estudianteId) : null,
    integrantes: q.estudiantesDeAsignacion(a.id).map(estudianteResumen),
    aprobadaPor: persona(a.aprobadaPorId),
    estado: a.estado,
    fechaAsignacion: a.fechaAsignacion,
    motivo: a.motivo,
    causaAnulacion: a.causaAnulacion,
    motivoAnulacion: a.motivoAnulacion,
    anuladaPor: a.anuladaPorId ? persona(a.anuladaPorId) : null,
    fechaAnulacion: a.fechaAnulacion,
    tutorVigente: tutor ? asignacionTutorDto(tutor) : null,
    estadoPat: ultimo ? q.estadoDocumento(ultimo.id) : null,
  }
}

export function plantillaDto(p: PlantillaRow): D.PlantillaPat {
  const { rutaAlmacenamiento: _r, publicadaPorId, ...resto } = p
  return { ...resto, publicadaPor: persona(publicadaPorId) }
}

export function documentoDto(d: DocumentoPatRow, contexto = false): D.DocumentoPat {
  const r = q.revisionDe(d.id)
  const a = db.asignacionesTema.find((x) => x.id === d.asignacionTemaId)!
  const t = q.tema(a.temaId)!
  return {
    id: d.id,
    asignacionTemaId: d.asignacionTemaId,
    plantillaId: d.plantillaId,
    version: d.version,
    nombreArchivo: d.nombreArchivo,
    formato: d.formato,
    tamanoBytes: d.tamanoBytes,
    hashSha256: d.hashSha256,
    cargadoPor: persona(d.cargadoPorId),
    fechaCarga: d.fechaCarga,
    estado: r?.resultado ?? 'PENDIENTE',
    revision: r
      ? {
          id: r.id,
          documentoPatId: r.documentoPatId,
          revisor: persona(r.revisorId),
          resultado: r.resultado,
          observaciones: r.observaciones,
          fechaRevision: r.fechaRevision,
        }
      : null,
    ...(contexto
      ? {
          tema: { id: t.id, titulo: t.titulo },
          integrantes: q.estudiantesDeAsignacion(a.id).map(estudianteResumen),
        }
      : {}),
  }
}

/** Simula el avance del procesamiento en segundo plano según el tiempo transcurrido. */
export function exportacionDto(e: ExportacionRow): D.SolicitudExportacion {
  const transcurrido = Date.now() - new Date(e.fechaSolicitud).getTime()
  let estado = e.estado
  if (estado === 'EN_COLA' || estado === 'PROCESANDO') {
    estado = transcurrido > 5000 ? 'LISTO' : transcurrido > 2000 ? 'PROCESANDO' : 'EN_COLA'
    if (estado === 'LISTO') {
      e.estado = 'LISTO'
      e.fechaGeneracion = new Date(new Date(e.fechaSolicitud).getTime() + 5000).toISOString()
      e.expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      e.tamanoBytes = 18_000 + Math.floor(Math.random() * 40_000)
      e.rutaAlmacenamiento = `exportaciones/${e.id}.${e.formato.toLowerCase()}`
    }
  }
  return {
    id: e.id,
    periodoId: e.periodoId,
    solicitadaPor: persona(e.solicitadaPorId),
    tipoReporte: e.tipoReporte,
    formato: e.formato,
    filtros: e.filtros,
    estado,
    tamanoBytes: e.tamanoBytes,
    expiraEn: e.expiraEn,
    fechaSolicitud: e.fechaSolicitud,
    fechaGeneracion: e.fechaGeneracion,
  }
}
