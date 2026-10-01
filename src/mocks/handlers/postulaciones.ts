import { http } from 'msw'
import type { CriterioConflicto } from '@/types/dominio'
import { ahora, db, uid, type PostulacionRow } from '../db'
import * as q from '../consultas'
import * as dto from '../dto'
import {
  API,
  auditar,
  cuerpo,
  falla,
  noEncontrado,
  notificar,
  prohibido,
  requiereRol,
  ruta,
} from '../util'
import { rechazarPostulacionesAbiertas } from './temas'

/** Recalcula PENDIENTE / EN_CONFLICTO según cuántas postulaciones compiten por el tema. */
export function recalcularConflicto(temaId: string) {
  const abiertas = q.postulacionesAbiertasDeTema(temaId)
  const conflicto = abiertas.length > 1
  for (const p of abiertas) {
    const nuevo = conflicto ? 'EN_CONFLICTO' : 'PENDIENTE'
    if (p.estado !== nuevo && nuevo === 'EN_CONFLICTO') {
      notificar(
        q.usuariosDeEstudiantes(q.integrantesDePostulacion(p)),
        'POSTULACION_CONFLICTO',
        'Postulación en conflicto',
        `Otra postulación compite por el tema "${q.tema(temaId)?.titulo}". El responsable resolverá el conflicto.`,
        { tipo: 'postulacion', id: p.id },
      )
    }
    p.estado = nuevo
  }
}

function notificarEstado(p: PostulacionRow, titulo: string, mensaje: string) {
  notificar(
    q.usuariosDeEstudiantes(q.integrantesDePostulacion(p)),
    `POSTULACION_${p.estado}`,
    titulo,
    mensaje,
    { tipo: 'postulacion', id: p.id },
  )
}

export const postulacionHandlers = [
  // RF-22: consulta admin con filtros
  http.get(
    `${API}/postulaciones`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ADMIN', 'DOCENTE')
      const f = Object.fromEntries(url.searchParams)
      const docente = u.rol === 'DOCENTE' ? q.docenteDeUsuario(u.id) : undefined
      return db.postulaciones
        .filter((p) => !f.periodoId || p.periodoId === f.periodoId)
        .filter((p) => !f.temaId || p.temaId === f.temaId)
        .filter((p) => !f.estado || p.estado === f.estado)
        .filter((p) => !f.modalidad || (f.modalidad === 'GRUPAL') === !!p.grupoId)
        .filter((p) => !docente || q.tema(p.temaId)?.docenteProponenteId === docente.id)
        .sort((a, b) => b.fechaPostulacion.localeCompare(a.fechaPostulacion))
        .map(dto.postulacionDto)
    }),
  ),
  http.get(
    `${API}/postulaciones/:id`,
    ruta(({ u, params }) => {
      const p = db.postulaciones.find((x) => x.id === params.id)
      if (!p) throw noEncontrado('La postulación')
      if (u.rol === 'ESTUDIANTE') {
        const e = q.estudianteDeUsuario(u.id)
        if (!e || !q.integrantesDePostulacion(p).includes(e.id)) throw prohibido()
      }
      return dto.postulacionDto(p)
    }),
  ),
  http.get(
    `${API}/me/postulaciones`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ESTUDIANTE')
      const e = q.estudianteDeUsuario(u.id)!
      const periodoId = url.searchParams.get('periodoId') ?? q.periodoActual()?.id
      const misGrupos = new Set(
        db.integrantes.filter((i) => i.estudianteId === e.id).map((i) => i.grupoId),
      )
      return db.postulaciones
        .filter(
          (p) =>
            p.periodoId === periodoId &&
            (p.estudianteId === e.id || (p.grupoId && misGrupos.has(p.grupoId))),
        )
        .sort((a, b) => b.fechaPostulacion.localeCompare(a.fechaPostulacion))
        .map(dto.postulacionDto)
    }),
  ),
  // RF-04, RF-08, RF-09, RF-10: postular
  http.post(
    `${API}/postulaciones`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ESTUDIANTE')
      const e = q.estudianteDeUsuario(u.id)!
      const b = await cuerpo<{
        temaId: string
        modalidad: 'INDIVIDUAL' | 'GRUPAL'
        tutores: string[]
      }>(req)
      const t = q.tema(b.temaId)
      if (!t) throw noEncontrado('El tema')
      const p = q.periodo(t.periodoId)!
      const ahoraD = new Date()
      if (
        p.estado !== 'POSTULACION_ABIERTA' ||
        ahoraD < new Date(p.fechaInicioPostulacion) ||
        ahoraD > new Date(p.fechaFinPostulacion)
      )
        throw falla(
          409,
          'FUERA_DE_FECHAS',
          'La postulación está fuera de las fechas del período.',
          'RF-08',
        )
      const h = q.habilitacion(p.id, e.id)
      if (!h || h.estado !== 'HABILITADO')
        throw falla(409, 'NO_HABILITADO', 'No estás habilitado en el período.', 'RF-09')
      if (h.situacionIngreso === 'NO_ADMITIDO')
        throw falla(409, 'NO_ADMITIDO', 'No fuiste admitido en el período.', 'RN-03')
      if (!q.temaDisponible(t.id))
        throw falla(
          409,
          'TEMA_NO_DISPONIBLE',
          'El tema no está disponible para postulación.',
          'RF-07',
        )
      if (q.asignacionVigenteDe(p.id, e.id))
        throw falla(409, 'YA_ASIGNADO', 'Ya tienes una asignación vigente.', 'RN-08')

      const grupo = q.grupoActivoDe(p.id, e.id)
      let numIntegrantes = 1
      if (b.modalidad === 'GRUPAL') {
        if (!grupo)
          throw falla(
            409,
            'SIN_GRUPO',
            'Debes pertenecer a un grupo para postular de forma grupal.',
            'RN-04',
          )
        const rep = db.integrantes.find(
          (i) => i.grupoId === grupo.id && i.estudianteId === e.id && i.estado === 'ACTIVO',
        )
        if (rep?.rolEnGrupo !== 'REPRESENTANTE')
          throw prohibido('Solo el representante puede postular al grupo.')
        if (q.postulacionActivaDeGrupo(grupo.id))
          throw falla(
            409,
            'POSTULACION_ACTIVA',
            'El grupo ya tiene una postulación activa.',
            'RN-08',
          )
        const integrantes = q.integrantesActivos(grupo.id)
        numIntegrantes = integrantes.length
        if (numIntegrantes < 2)
          throw falla(
            409,
            'GRUPO_INSUFICIENTE',
            'Un grupo debe tener al menos 2 integrantes.',
            'RN-05',
          )
        for (const i of integrantes) {
          if (q.postulacionActivaIndividual(p.id, i.estudianteId))
            throw falla(
              409,
              'POSTULACION_SIMULTANEA',
              'Un integrante tiene una postulación individual activa.',
              'RN-04',
            )
          const hi = q.habilitacion(p.id, i.estudianteId)
          if (!hi || hi.estado !== 'HABILITADO' || hi.situacionIngreso === 'NO_ADMITIDO')
            throw falla(
              409,
              'INTEGRANTE_NO_HABILITADO',
              'Todos los integrantes deben estar habilitados y no estar marcados como no admitidos.',
              'RF-09',
            )
        }
      } else {
        if (grupo && q.postulacionActivaDeGrupo(grupo.id))
          throw falla(
            409,
            'POSTULACION_SIMULTANEA',
            'Tu grupo ya tiene una postulación activa; no puedes postular también de forma individual.',
            'RN-04',
          )
        if (q.postulacionActivaIndividual(p.id, e.id))
          throw falla(409, 'POSTULACION_ACTIVA', 'Ya tienes una postulación activa.', 'RN-08')
      }
      if (numIntegrantes < t.minIntegrantes || numIntegrantes > t.maxIntegrantes)
        throw falla(
          409,
          'RANGO_INTEGRANTES',
          `El tema admite entre ${t.minIntegrantes} y ${t.maxIntegrantes} integrante(s); la postulación tiene ${numIntegrantes}.`,
          'RN-05',
        )
      const tutores = [...new Set(b.tutores ?? [])]
      if (!tutores.length)
        throw falla(400, 'TUTOR_REQUERIDO', 'Debe proponer al menos un tutor.', 'RF-10')
      for (const d of tutores) {
        const doc = q.docente(d)
        if (!doc || !doc.habilitadoTutoria)
          throw falla(
            409,
            'TUTOR_NO_HABILITADO',
            'Uno de los docentes propuestos no está habilitado para tutoría.',
          )
      }
      const pos: PostulacionRow = {
        id: uid(),
        temaId: t.id,
        periodoId: p.id,
        grupoId: b.modalidad === 'GRUPAL' ? grupo!.id : null,
        estudianteId: b.modalidad === 'GRUPAL' ? null : e.id,
        numIntegrantes,
        registradaPorId: u.id,
        estado: 'PENDIENTE',
        fechaPostulacion: ahora(),
        observacion: null,
      }
      db.postulaciones.push(pos)
      tutores.forEach((d, i) =>
        db.tutoresPropuestos.push({
          id: uid(),
          postulacionId: pos.id,
          docenteId: d,
          ordenPrioridad: i + 1,
        }),
      )
      if (b.modalidad === 'GRUPAL') {
        for (const inv of db.invitaciones.filter(
          (x) => x.grupoId === grupo!.id && x.estado === 'PENDIENTE',
        )) {
          inv.estado = 'CANCELADA'
          inv.fechaRespuesta = ahora()
        }
      }
      recalcularConflicto(t.id)
      auditar(u, 'POSTULAR', 'postulacion', pos.id, null, {
        temaId: t.id,
        modalidad: b.modalidad,
        numIntegrantes,
        tutores,
      })
      notificarEstado(
        pos,
        'Postulación registrada',
        `Se registró la postulación al tema "${t.titulo}".`,
      )
      return dto.postulacionDto(pos)
    }),
  ),
  http.post(
    `${API}/postulaciones/:id/cancelar`,
    ruta(
      ({ u, params }) => {
        const p = db.postulaciones.find((x) => x.id === params.id)
        if (!p) throw noEncontrado('La postulación')
        if (u.rol !== 'ADMIN') {
          const e = q.estudianteDeUsuario(u.id)
          const autorizado = p.estudianteId
            ? p.estudianteId === e?.id
            : db.integrantes.some(
                (i) =>
                  i.grupoId === p.grupoId &&
                  i.estudianteId === e?.id &&
                  i.rolEnGrupo === 'REPRESENTANTE' &&
                  i.estado === 'ACTIVO',
              )
          if (!autorizado)
            throw prohibido('Solo el postulante o el representante pueden cancelar la postulación.')
        }
        if (p.estado !== 'PENDIENTE' && p.estado !== 'EN_CONFLICTO')
          throw falla(
            409,
            'NO_CANCELABLE',
            'Solo se pueden cancelar postulaciones pendientes o en conflicto.',
          )
        const anterior = p.estado
        p.estado = 'CANCELADA'
        recalcularConflicto(p.temaId)
        auditar(u, 'CANCELAR', 'postulacion', p.id, { estado: anterior }, { estado: 'CANCELADA' })
        return dto.postulacionDto(p)
      },
      { status: 200 },
    ),
  ),
  // Admin: aceptar una postulación sin competencia / rechazar
  http.post(
    `${API}/postulaciones/:id/aceptar`,
    ruta(
      ({ u, params }) => {
        requiereRol(u, 'ADMIN')
        const p = db.postulaciones.find((x) => x.id === params.id)
        if (!p) throw noEncontrado('La postulación')
        if (p.estado === 'EN_CONFLICTO')
          throw falla(
            409,
            'EN_CONFLICTO',
            'La postulación compite con otras; registre la resolución del conflicto.',
            'RF-23',
          )
        if (p.estado !== 'PENDIENTE')
          throw falla(409, 'NO_PENDIENTE', 'Solo se aceptan postulaciones pendientes.')
        p.estado = 'ACEPTADA'
        auditar(u, 'ACEPTAR', 'postulacion', p.id, { estado: 'PENDIENTE' }, { estado: 'ACEPTADA' })
        notificarEstado(
          p,
          'Postulación aceptada',
          `Tu postulación al tema "${q.tema(p.temaId)?.titulo}" fue aceptada.`,
        )
        return dto.postulacionDto(p)
      },
      { status: 200 },
    ),
  ),
  http.post(
    `${API}/postulaciones/:id/rechazar`,
    ruta(
      async ({ req, u, params }) => {
        requiereRol(u, 'ADMIN')
        const p = db.postulaciones.find((x) => x.id === params.id)
        if (!p) throw noEncontrado('La postulación')
        if (p.estado !== 'PENDIENTE' && p.estado !== 'EN_CONFLICTO' && p.estado !== 'ACEPTADA')
          throw falla(
            409,
            'NO_RECHAZABLE',
            'La postulación no puede rechazarse en su estado actual.',
          )
        if (db.asignacionesTema.some((a) => a.postulacionId === p.id && a.estado === 'VIGENTE'))
          throw falla(
            409,
            'CON_ASIGNACION',
            'La postulación tiene una asignación vigente; anule la asignación.',
          )
        const { observacion } = await cuerpo<{ observacion?: string }>(req)
        if (!observacion?.trim())
          throw falla(400, 'MOTIVO_REQUERIDO', 'Debe indicar el motivo del rechazo.', 'RN-13')
        const anterior = p.estado
        p.estado = 'RECHAZADA'
        p.observacion = observacion
        recalcularConflicto(p.temaId)
        auditar(
          u,
          'RECHAZAR',
          'postulacion',
          p.id,
          { estado: anterior },
          { estado: 'RECHAZADA', observacion },
        )
        notificarEstado(p, 'Postulación rechazada', `Tu postulación fue rechazada: ${observacion}`)
        return dto.postulacionDto(p)
      },
      { status: 200 },
    ),
  ),

  // ── Conflictos (RF-23) ──
  http.get(
    `${API}/conflictos`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ADMIN')
      const periodoId = url.searchParams.get('periodoId')
      const porTema = new Map<string, PostulacionRow[]>()
      for (const p of db.postulaciones.filter(
        (x) => x.estado === 'EN_CONFLICTO' && (!periodoId || x.periodoId === periodoId),
      )) {
        porTema.set(p.temaId, [...(porTema.get(p.temaId) ?? []), p])
      }
      return [...porTema.entries()].map(([temaId, ps]) => ({
        tema: { id: temaId, titulo: q.tema(temaId)!.titulo },
        postulaciones: ps
          .sort((a, b) => a.fechaPostulacion.localeCompare(b.fechaPostulacion))
          .map(dto.postulacionDto),
      }))
    }),
  ),
  http.get(
    `${API}/resoluciones-conflicto`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ADMIN')
      const periodoId = url.searchParams.get('periodoId')
      return db.resoluciones
        .filter((r) => !periodoId || r.periodoId === periodoId)
        .sort((a, b) => b.fechaResolucion.localeCompare(a.fechaResolucion))
        .map(dto.resolucionDto)
    }),
  ),
  http.post(
    `${API}/resoluciones-conflicto`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ADMIN')
      const b = await cuerpo<{
        temaId: string
        criterioAplicado: CriterioConflicto
        participantes: { postulacionId: string; puntajeCriterio?: number | null }[]
        postulacionGanadoraId: string
        justificacion: string
      }>(req)
      const t = q.tema(b.temaId)
      if (!t) throw noEncontrado('El tema')
      const enConflicto = db.postulaciones.filter(
        (p) => p.temaId === t.id && p.estado === 'EN_CONFLICTO',
      )
      if (enConflicto.length < 2)
        throw falla(409, 'SIN_CONFLICTO', 'El tema no tiene un conflicto abierto.')
      if (!b.justificacion?.trim())
        throw falla(400, 'JUSTIFICACION_REQUERIDA', 'La justificación es obligatoria.', 'RF-23')
      if (!b.criterioAplicado)
        throw falla(400, 'CRITERIO_REQUERIDO', 'Debe indicar el criterio aplicado.')
      const ids = new Set(enConflicto.map((p) => p.id))
      if (!ids.has(b.postulacionGanadoraId))
        throw falla(
          400,
          'GANADORA_INVALIDA',
          'La postulación ganadora debe ser una de las participantes.',
        )
      const r = {
        id: uid(),
        temaId: t.id,
        periodoId: t.periodoId,
        resueltoPorId: u.id,
        criterioAplicado: b.criterioAplicado,
        postulacionGanadoraId: b.postulacionGanadoraId,
        justificacion: b.justificacion.trim(),
        fechaResolucion: ahora(),
      }
      db.resoluciones.push(r)
      for (const p of enConflicto) {
        const puntaje =
          b.participantes?.find((x) => x.postulacionId === p.id)?.puntajeCriterio ?? null
        db.participantes.push({
          id: uid(),
          resolucionConflictoId: r.id,
          temaId: t.id,
          postulacionId: p.id,
          puntajeCriterio: puntaje,
        })
      }
      const ganadora = enConflicto.find((p) => p.id === b.postulacionGanadoraId)!
      ganadora.estado = 'ACEPTADA'
      notificarEstado(
        ganadora,
        'Conflicto resuelto a tu favor',
        `Tu postulación al tema "${t.titulo}" fue aceptada.`,
      )
      rechazarPostulacionesAbiertas(
        t.id,
        `Conflicto resuelto por ${b.criterioAplicado.toLowerCase().replace('_', ' ')}.`,
        ganadora.id,
      )
      auditar(u, 'RESOLVER_CONFLICTO', 'resolucion_conflicto', r.id, null, { ...r })
      return dto.resolucionDto(r)
    }),
  ),
]
