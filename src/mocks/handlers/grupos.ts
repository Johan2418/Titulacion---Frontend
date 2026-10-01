import { http } from 'msw'
import { ahora, db, uid } from '../db'
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
import type { UsuarioRow } from '../db'

const DIAS_EXPIRACION_INVITACION = 7

function estudianteSesion(u: UsuarioRow) {
  requiereRol(u, 'ESTUDIANTE')
  const e = q.estudianteDeUsuario(u.id)
  if (!e) throw prohibido()
  return e
}

/** RF-01 / RF-03: el estudiante debe estar habilitado y no admitido no participa. */
function exigirHabilitado(periodoId: string, estudianteId: string) {
  const h = q.habilitacion(periodoId, estudianteId)
  if (!h || h.estado !== 'HABILITADO')
    throw falla(409, 'NO_HABILITADO', 'El estudiante no está habilitado en el período.')
  if (h.situacionIngreso === 'NO_ADMITIDO')
    throw falla(409, 'NO_ADMITIDO', 'El estudiante no fue admitido en el período.', 'RN-03')
  return h
}

function exigirRepresentante(grupoId: string, estudianteId: string) {
  const g = q.grupo(grupoId)
  if (!g) throw noEncontrado('El grupo')
  const r = db.integrantes.find(
    (i) => i.grupoId === g.id && i.estudianteId === estudianteId && i.estado === 'ACTIVO',
  )
  if (r?.rolEnGrupo !== 'REPRESENTANTE')
    throw prohibido('Solo el representante del grupo puede realizar esta acción.')
  return g
}

function composicionCerrada(grupoId: string) {
  return db.postulaciones.some((p) => p.grupoId === grupoId && p.estado !== 'CANCELADA')
}

export const grupoHandlers = [
  http.get(
    `${API}/me/grupo`,
    ruta(({ u, url }) => {
      const e = estudianteSesion(u)
      const periodoId = url.searchParams.get('periodoId') ?? q.periodoActual()?.id ?? ''
      const g = q.grupoActivoDe(periodoId, e.id)
      return g ? dto.grupoDto(g) : Response.json(null)
    }),
  ),
  http.get(
    `${API}/grupos`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ADMIN')
      const periodoId = url.searchParams.get('periodoId')
      return db.grupos.filter((g) => !periodoId || g.periodoId === periodoId).map(dto.grupoDto)
    }),
  ),
  // RF-01: crear grupo (queda como representante)
  http.post(
    `${API}/grupos`,
    ruta(async ({ req, u }) => {
      const e = estudianteSesion(u)
      const b = await cuerpo<{ periodoId: string; nombre: string }>(req)
      const p = q.periodo(b.periodoId)
      if (!p) throw noEncontrado('El período')
      if (p.estado !== 'POSTULACION_ABIERTA')
        throw falla(
          409,
          'PERIODO_CERRADO',
          'Solo se pueden conformar grupos con la postulación abierta.',
        )
      exigirHabilitado(p.id, e.id)
      if (q.grupoActivoDe(p.id, e.id))
        throw falla(409, 'YA_EN_GRUPO', 'Ya perteneces a un grupo activo en este período.', 'RN-06')
      if (q.postulacionActivaIndividual(p.id, e.id))
        throw falla(
          409,
          'POSTULACION_INDIVIDUAL_ACTIVA',
          'Tienes una postulación individual activa; cancélala antes de conformar un grupo.',
          'RN-04',
        )
      const nombre = b.nombre?.trim() || `Grupo de ${q.usuario(e.usuarioId)!.nombres}`
      const g = {
        id: uid(),
        periodoId: p.id,
        nombre,
        estado: 'EN_CONFORMACION' as const,
        creadoEn: ahora(),
      }
      db.grupos.push(g)
      db.integrantes.push({
        id: uid(),
        grupoId: g.id,
        periodoId: p.id,
        estudianteId: e.id,
        rolEnGrupo: 'REPRESENTANTE',
        estado: 'ACTIVO',
        fechaIngreso: ahora(),
        fechaSalida: null,
        motivoSalida: null,
      })
      auditar(u, 'CREAR', 'grupo', g.id, null, { ...g })
      return dto.grupoDto(g)
    }),
  ),
  // Salir del grupo (integrante) o disolverlo (representante), solo antes de postular
  http.post(
    `${API}/grupos/:id/salir`,
    ruta(({ u, params }) => {
      const e = estudianteSesion(u)
      const g = q.grupo(params.id)
      if (!g) throw noEncontrado('El grupo')
      if (composicionCerrada(g.id))
        throw falla(
          409,
          'COMPOSICION_CERRADA',
          'El grupo ya postuló; su composición está cerrada.',
          'RF-03',
        )
      const integ = db.integrantes.find(
        (i) => i.grupoId === g.id && i.estudianteId === e.id && i.estado === 'ACTIVO',
      )
      if (!integ) throw prohibido()
      const fecha = ahora()
      if (integ.rolEnGrupo === 'REPRESENTANTE') {
        g.estado = 'DISUELTO'
        for (const i of q.integrantesActivos(g.id)) {
          i.estado = 'RETIRADO'
          i.fechaSalida = fecha
          i.motivoSalida = 'Grupo disuelto por el representante.'
        }
        for (const inv of db.invitaciones.filter(
          (x) => x.grupoId === g.id && x.estado === 'PENDIENTE',
        )) {
          inv.estado = 'CANCELADA'
          inv.fechaRespuesta = fecha
        }
        auditar(u, 'DISOLVER', 'grupo', g.id, { estado: 'ACTIVO' }, { estado: 'DISUELTO' })
      } else {
        integ.estado = 'RETIRADO'
        integ.fechaSalida = fecha
        integ.motivoSalida = 'Salida voluntaria.'
        if (q.integrantesActivos(g.id).length < 2) g.estado = 'EN_CONFORMACION'
        auditar(
          u,
          'SALIR',
          'grupo_integrante',
          integ.id,
          { estado: 'ACTIVO' },
          { estado: 'RETIRADO' },
        )
      }
    }),
  ),

  // ── Invitaciones (RF-02) ──
  http.get(
    `${API}/me/invitaciones`,
    ruta(({ u }) => {
      const e = estudianteSesion(u)
      return db.invitaciones
        .filter((i) => i.estudianteDestinoId === e.id)
        .reverse()
        .map(dto.invitacionDto)
    }),
  ),
  http.get(
    `${API}/grupos/:id/invitaciones`,
    ruta(({ u, params }) => {
      if (u.rol === 'ESTUDIANTE') {
        const e = estudianteSesion(u)
        if (!db.integrantes.some((i) => i.grupoId === params.id && i.estudianteId === e.id))
          throw prohibido()
      }
      return db.invitaciones
        .filter((i) => i.grupoId === params.id)
        .reverse()
        .map(dto.invitacionDto)
    }),
  ),
  http.post(
    `${API}/grupos/:id/invitaciones`,
    ruta(async ({ req, u, params }) => {
      const e = estudianteSesion(u)
      const g = exigirRepresentante(params.id, e.id)
      if (composicionCerrada(g.id))
        throw falla(
          409,
          'COMPOSICION_CERRADA',
          'El grupo ya postuló; no se pueden agregar integrantes.',
          'RF-03',
        )
      const p = q.periodo(g.periodoId)!
      if (p.estado !== 'POSTULACION_ABIERTA')
        throw falla(409, 'PERIODO_CERRADO', 'Solo se puede invitar con la postulación abierta.')
      const { estudianteId } = await cuerpo<{ estudianteId: string }>(req)
      if (estudianteId === e.id)
        throw falla(400, 'AUTOINVITACION', 'No puedes invitarte a ti mismo.')
      exigirHabilitado(g.periodoId, estudianteId)
      if (q.grupoActivoDe(g.periodoId, estudianteId))
        throw falla(
          409,
          'DESTINO_EN_GRUPO',
          'El estudiante ya pertenece a un grupo activo.',
          'RN-06',
        )
      if (
        db.invitaciones.some(
          (i) =>
            i.grupoId === g.id &&
            i.estudianteDestinoId === estudianteId &&
            i.estado === 'PENDIENTE',
        )
      )
        throw falla(
          409,
          'INVITACION_DUPLICADA',
          'Ya existe una invitación pendiente para ese estudiante.',
        )
      const inv = {
        id: uid(),
        grupoId: g.id,
        periodoId: g.periodoId,
        estudianteEmisorId: e.id,
        estudianteDestinoId: estudianteId,
        estado: 'PENDIENTE' as const,
        fechaEnvio: ahora(),
        expiraEn: new Date(Date.now() + DIAS_EXPIRACION_INVITACION * 86400000).toISOString(),
        fechaRespuesta: null,
      }
      db.invitaciones.push(inv)
      auditar(u, 'INVITAR', 'invitacion', inv.id, null, { ...inv })
      const emisor = q.usuario(e.usuarioId)!
      notificar(
        [q.estudiante(estudianteId)?.usuarioId],
        'INVITACION',
        'Nueva invitación a grupo',
        `${emisor.nombres} ${emisor.apellidos} te invitó a unirte al grupo "${g.nombre}".`,
        { tipo: 'invitacion', id: inv.id },
      )
      return dto.invitacionDto(inv)
    }),
  ),
  http.post(
    `${API}/invitaciones/:id/:accion`,
    ruta(
      ({ u, params }) => {
        const e = estudianteSesion(u)
        const inv = db.invitaciones.find((i) => i.id === params.id)
        if (!inv) throw noEncontrado('La invitación')
        const actual = dto.invitacionDto(inv).estado
        if (actual !== 'PENDIENTE')
          throw falla(409, 'INVITACION_NO_PENDIENTE', `La invitación está ${actual.toLowerCase()}.`)
        const g = q.grupo(inv.grupoId)!
        const fecha = ahora()
        const emisorUsuario = q.estudiante(inv.estudianteEmisorId)?.usuarioId
        const destino = q.usuario(q.estudiante(inv.estudianteDestinoId)?.usuarioId)!
        switch (params.accion) {
          case 'cancelar':
            exigirRepresentante(g.id, e.id)
            inv.estado = 'CANCELADA'
            break
          case 'rechazar':
            if (inv.estudianteDestinoId !== e.id) throw prohibido()
            inv.estado = 'RECHAZADA'
            notificar(
              [emisorUsuario],
              'INVITACION_RECHAZADA',
              'Invitación rechazada',
              `${destino.nombres} ${destino.apellidos} rechazó la invitación a "${g.nombre}".`,
            )
            break
          case 'aceptar': {
            if (inv.estudianteDestinoId !== e.id) throw prohibido()
            exigirHabilitado(g.periodoId, e.id)
            if (g.estado !== 'ACTIVO' && g.estado !== 'EN_CONFORMACION')
              throw falla(409, 'GRUPO_NO_ACTIVO', 'El grupo ya no está activo.')
            if (composicionCerrada(g.id))
              throw falla(
                409,
                'COMPOSICION_CERRADA',
                'El grupo ya postuló; su composición está cerrada.',
                'RF-03',
              )
            if (q.grupoActivoDe(g.periodoId, e.id))
              throw falla(
                409,
                'YA_EN_GRUPO',
                'Ya perteneces a un grupo activo en este período.',
                'RN-06',
              )
            if (q.postulacionActivaIndividual(g.periodoId, e.id))
              throw falla(
                409,
                'POSTULACION_INDIVIDUAL_ACTIVA',
                'Tienes una postulación individual activa; cancélala antes de unirte a un grupo.',
                'RN-04',
              )
            inv.estado = 'ACEPTADA'
            db.integrantes.push({
              id: uid(),
              grupoId: g.id,
              periodoId: g.periodoId,
              estudianteId: e.id,
              rolEnGrupo: 'INTEGRANTE',
              estado: 'ACTIVO',
              fechaIngreso: fecha,
              fechaSalida: null,
              motivoSalida: null,
            })
            if (q.integrantesActivos(g.id).length >= 2) g.estado = 'ACTIVO'
            // las demás invitaciones pendientes del estudiante quedan canceladas
            for (const otra of db.invitaciones.filter(
              (x) => x.estudianteDestinoId === e.id && x.estado === 'PENDIENTE' && x.id !== inv.id,
            )) {
              otra.estado = 'CANCELADA'
              otra.fechaRespuesta = fecha
            }
            notificar(
              [emisorUsuario],
              'INVITACION_ACEPTADA',
              'Invitación aceptada',
              `${destino.nombres} ${destino.apellidos} se unió al grupo "${g.nombre}".`,
            )
            break
          }
          default:
            throw noEncontrado('La acción')
        }
        inv.fechaRespuesta = fecha
        auditar(
          u,
          `INVITACION_${params.accion.toUpperCase()}`,
          'invitacion',
          inv.id,
          { estado: 'PENDIENTE' },
          { estado: inv.estado },
        )
        return dto.invitacionDto(inv)
      },
      { status: 200 },
    ),
  ),
]
