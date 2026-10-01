import { http, HttpResponse } from 'msw'
import { ESTADOS_POSTULACION, ESTADOS_TEMA, type TipoReporte } from '@/types/dominio'
import { ahora, db, uid, type ExportacionRow } from '../db'
import * as q from '../consultas'
import * as dto from '../dto'
import {
  API,
  auditar,
  cuerpo,
  falla,
  noEncontrado,
  prohibido,
  requiereRol,
  ruta,
  urlPrefirmada,
} from '../util'

function filasReporte(tipo: TipoReporte, periodoId: string | null): (string | number)[][] {
  const temas = db.temas.filter((t) => !periodoId || t.periodoId === periodoId)
  const nombre = (id: string) => {
    const u = q.usuario(id)
    return u ? `${u.nombres} ${u.apellidos}` : ''
  }
  switch (tipo) {
    case 'ESTUDIANTES':
      return [
        ['Cédula', 'Estudiante', 'Condición', 'Situación', 'Estado'],
        ...db.habilitados
          .filter((h) => !periodoId || h.periodoId === periodoId)
          .map((h) => {
            const e = q.estudiante(h.estudianteId)!
            return [e.cedula, nombre(e.usuarioId), h.condicionIngreso, h.situacionIngreso, h.estado]
          }),
      ]
    case 'GRUPOS':
      return [
        ['Grupo', 'Estado', 'Integrantes'],
        ...db.grupos
          .filter((g) => !periodoId || g.periodoId === periodoId)
          .map((g) => [g.nombre, g.estado, q.integrantesActivos(g.id).length]),
      ]
    case 'TEMAS_OFERTADOS':
      return [
        ['Tema', 'Docente proponente', 'Estado', 'Mín', 'Máx'],
        ...temas
          .filter((t) => t.estado !== 'BORRADOR')
          .map((t) => [
            t.titulo,
            nombre(q.docente(t.docenteProponenteId)!.usuarioId),
            t.estado,
            t.minIntegrantes,
            t.maxIntegrantes,
          ]),
      ]
    case 'TEMAS_ASIGNADOS':
      return [
        ['Tema', 'Asignado a', 'Fecha'],
        ...db.asignacionesTema
          .filter((a) => a.estado === 'VIGENTE' && temas.some((t) => t.id === a.temaId))
          .map((a) => {
            const d = dto.asignacionDto(a)
            return [
              d.tema.titulo,
              d.grupo?.nombre ?? `${d.estudiante?.nombres} ${d.estudiante?.apellidos}`,
              d.fechaAsignacion,
            ]
          }),
      ]
    case 'TEMAS_DISPONIBLES':
      return [
        ['Tema', 'Postulaciones abiertas'],
        ...temas
          .filter((t) => q.temaDisponible(t.id))
          .map((t) => [t.titulo, q.postulacionesAbiertasDeTema(t.id).length]),
      ]
    case 'DOCENTES':
      return [
        ['Cédula', 'Docente', 'Departamento', 'Habilitado tutoría'],
        ...db.docentes.map((d) => [
          d.cedula,
          nombre(d.usuarioId),
          d.departamento ?? '',
          d.habilitadoTutoria ? 'Sí' : 'No',
        ]),
      ]
    case 'CARGA_TUTORIAL':
      return [
        ['Docente', 'Carga actual', 'Límite'],
        ...db.docentes.map((d) => {
          const c = q.cargaDocente(periodoId ?? q.periodoActual()?.id ?? '', d.id)
          return [nombre(d.usuarioId), c.actual, c.limite ?? 'Sin límite']
        }),
      ]
  }
}

export const sistemaHandlers = [
  // ── Seguimiento del estudiante (RF-15) ──
  http.get(
    `${API}/me/seguimiento`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ESTUDIANTE')
      const e = q.estudianteDeUsuario(u.id)!
      const p = q.periodo(url.searchParams.get('periodoId')) ?? q.periodoActual()
      if (!p)
        return {
          periodo: null,
          habilitacion: null,
          grupo: null,
          invitacionesPendientes: 0,
          postulacion: null,
          asignacion: null,
          ultimoPat: null,
        }
      const h = q.habilitacion(p.id, e.id)
      const g = q.grupoActivoDe(p.id, e.id)
      const pos =
        q.postulacionActivaDe(p.id, e.id) ??
        db.postulaciones
          .filter(
            (x) => x.periodoId === p.id && (x.estudianteId === e.id || (g && x.grupoId === g.id)),
          )
          .sort((a, b) => b.fechaPostulacion.localeCompare(a.fechaPostulacion))[0]
      const asg = q.asignacionVigenteDe(p.id, e.id)
      const ultimo = asg ? q.documentosDeAsignacion(asg.id).at(-1) : undefined
      return {
        periodo: dto.periodoDto(p),
        habilitacion: h ? dto.habilitadoDto(h) : null,
        grupo: g ? dto.grupoDto(g) : null,
        invitacionesPendientes: db.invitaciones.filter(
          (i) => i.estudianteDestinoId === e.id && dto.invitacionDto(i).estado === 'PENDIENTE',
        ).length,
        postulacion: pos ? dto.postulacionDto(pos) : null,
        asignacion: asg ? dto.asignacionDto(asg) : null,
        ultimoPat: ultimo ? dto.documentoDto(ultimo) : null,
      }
    }),
  ),
  http.get(
    `${API}/me/asignacion`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ESTUDIANTE')
      const e = q.estudianteDeUsuario(u.id)!
      const periodoId = url.searchParams.get('periodoId') ?? q.periodoActual()?.id ?? ''
      const a = q.asignacionVigenteDe(periodoId, e.id)
      return a ? dto.asignacionDto(a) : Response.json(null)
    }),
  ),

  // ── Docente (RF-37 a RF-39) ──
  http.get(
    `${API}/me/temas`,
    ruta(({ u, url }) => {
      requiereRol(u, 'DOCENTE')
      const d = q.docenteDeUsuario(u.id)!
      const periodoId = url.searchParams.get('periodoId')
      return db.temas
        .filter((t) => t.docenteProponenteId === d.id && (!periodoId || t.periodoId === periodoId))
        .map((t) => ({
          ...dto.temaDto(t),
          postulaciones: db.postulaciones.filter((p) => p.temaId === t.id).map(dto.postulacionDto),
        }))
    }),
  ),
  http.get(
    `${API}/me/tutorias`,
    ruta(({ u, url }) => {
      requiereRol(u, 'DOCENTE')
      const d = q.docenteDeUsuario(u.id)!
      const periodoId = url.searchParams.get('periodoId')
      const ids = new Set(
        db.asignacionesTutor
          .filter((t) => t.docenteId === d.id && t.estado === 'VIGENTE')
          .map((t) => t.asignacionTemaId),
      )
      return db.asignacionesTema
        .filter((a) => ids.has(a.id) && (!periodoId || q.tema(a.temaId)?.periodoId === periodoId))
        .map(dto.asignacionDto)
    }),
  ),
  http.get(
    `${API}/me/carga`,
    ruta(({ u, url }) => {
      requiereRol(u, 'DOCENTE')
      const d = q.docenteDeUsuario(u.id)!
      const periodoId = url.searchParams.get('periodoId') ?? q.periodoActual()?.id ?? ''
      return {
        docente: dto.docenteResumen(d.id),
        habilitadoTutoria: d.habilitadoTutoria,
        ...q.cargaDocente(periodoId, d.id),
      }
    }),
  ),

  // ── Resumen para el panel admin ──
  http.get(
    `${API}/periodos/:pid/resumen`,
    ruta(({ u, params }) => {
      requiereRol(u, 'ADMIN')
      const pid = params.pid
      const temas = db.temas.filter((t) => t.periodoId === pid)
      const postulaciones = db.postulaciones.filter((p) => p.periodoId === pid)
      const asignaciones = db.asignacionesTema.filter(
        (a) => a.estado === 'VIGENTE' && temas.some((t) => t.id === a.temaId),
      )
      return {
        estudiantesHabilitados: db.habilitados.filter(
          (h) => h.periodoId === pid && h.estado === 'HABILITADO',
        ).length,
        condicionadosPendientes: q.condicionadosPendientes(pid),
        temasPorEstado: Object.fromEntries(
          ESTADOS_TEMA.map((e) => [e, temas.filter((t) => t.estado === e).length]),
        ),
        postulacionesPorEstado: Object.fromEntries(
          ESTADOS_POSTULACION.map((e) => [e, postulaciones.filter((p) => p.estado === e).length]),
        ),
        conflictosAbiertos: new Set(
          postulaciones.filter((p) => p.estado === 'EN_CONFLICTO').map((p) => p.temaId),
        ).size,
        asignacionesVigentes: asignaciones.length,
        sinTutor: asignaciones.filter((a) => !q.tutorVigente(a.id)).length,
        patPorRevisar: db.documentosPat.filter(
          (d) => asignaciones.some((a) => a.id === d.asignacionTemaId) && !q.revisionDe(d.id),
        ).length,
      }
    }),
  ),

  // ── Notificaciones (RF-16) ──
  http.get(
    `${API}/me/notificaciones`,
    ruta(({ u }) =>
      db.notificaciones
        .filter((n) => n.usuarioId === u.id)
        .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
        .map(({ usuarioId: _u, ...n }) => n),
    ),
  ),
  http.post(
    `${API}/notificaciones/:id/leida`,
    ruta(({ u, params }) => {
      const n = db.notificaciones.find((x) => x.id === params.id)
      if (!n) throw noEncontrado('La notificación')
      if (n.usuarioId !== u.id) throw prohibido()
      n.leida = true
    }),
  ),
  http.post(
    `${API}/me/notificaciones/leer-todas`,
    ruta(({ u }) => {
      for (const n of db.notificaciones.filter((x) => x.usuarioId === u.id)) n.leida = true
    }),
  ),

  // ── Historial y auditoría (RF-34) ──
  http.get(
    `${API}/auditoria`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ADMIN')
      const f = Object.fromEntries(url.searchParams)
      const page = Math.max(1, Number(f.page) || 1)
      const pageSize = Math.min(100, Number(f.pageSize) || 20)
      const texto = (f.q ?? '').toLowerCase()
      const filtrados = db.auditoria
        .filter((a) => !f.entidadTipo || a.entidadTipo === f.entidadTipo)
        .filter((a) => !f.entidadId || a.entidadId === f.entidadId)
        .filter((a) => !f.accion || a.accion === f.accion)
        .filter((a) => !f.desde || a.fechaHora >= f.desde)
        .filter((a) => !f.hasta || a.fechaHora <= f.hasta)
        .filter((a) => !texto || JSON.stringify(a).toLowerCase().includes(texto))
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
      return {
        items: filtrados
          .slice((page - 1) * pageSize, page * pageSize)
          .map(({ usuarioId, ...a }) => ({
            ...a,
            usuario: usuarioId ? dto.persona(usuarioId) : null,
          })),
        total: filtrados.length,
        page,
        pageSize,
      }
    }),
  ),

  // ── Reportes y exportación (RF-35, RF-36) ──
  http.get(
    `${API}/exportaciones`,
    ruta(({ u }) => {
      requiereRol(u, 'ADMIN')
      return [...db.exportaciones]
        .sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud))
        .map(dto.exportacionDto)
    }),
  ),
  http.post(
    `${API}/exportaciones`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ADMIN')
      const b =
        await cuerpo<Pick<ExportacionRow, 'tipoReporte' | 'formato' | 'periodoId' | 'filtros'>>(req)
      if (!b.tipoReporte || !b.formato)
        throw falla(400, 'VALIDACION', 'Debe indicar el tipo de reporte y el formato.')
      const e: ExportacionRow = {
        id: uid(),
        periodoId: b.periodoId ?? null,
        solicitadaPorId: u.id,
        tipoReporte: b.tipoReporte,
        formato: b.formato,
        filtros: b.filtros ?? null,
        estado: 'EN_COLA',
        rutaAlmacenamiento: null,
        tamanoBytes: null,
        expiraEn: null,
        fechaSolicitud: ahora(),
        fechaGeneracion: null,
      }
      db.exportaciones.push(e)
      auditar(u, 'SOLICITAR_EXPORTACION', 'solicitud_exportacion', e.id, null, {
        tipoReporte: e.tipoReporte,
        formato: e.formato,
      })
      return HttpResponse.json(dto.exportacionDto(e), { status: 202 })
    }),
  ),
  http.get(
    `${API}/exportaciones/:id/descarga`,
    ruta(({ u, params }) => {
      requiereRol(u, 'ADMIN')
      const e = db.exportaciones.find((x) => x.id === params.id)
      if (!e) throw noEncontrado('La exportación')
      const d = dto.exportacionDto(e)
      if (d.estado !== 'LISTO') throw falla(409, 'NO_LISTO', 'El archivo aún no está listo.')
      if (d.expiraEn && new Date(d.expiraEn) < new Date())
        throw falla(410, 'EXPIRADO', 'El archivo de exportación expiró.', 'RNF-33')
      const csv = filasReporte(e.tipoReporte, e.periodoId)
        .map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      return urlPrefirmada(
        `${e.tipoReporte.toLowerCase()}.${e.formato === 'CSV' ? 'csv' : e.formato === 'XLSX' ? 'csv' : 'txt'}`,
        csv,
        'text/csv',
      )
    }),
  ),
]
