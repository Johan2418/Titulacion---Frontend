import { http } from 'msw'
import type { EstadoTema } from '@/types/dominio'
import { ahora, db, uid, type TemaRow } from '../db'
import * as q from '../consultas'
import * as dto from '../dto'
import {
  API,
  auditar,
  cuerpo,
  falla,
  noEncontrado,
  notificar,
  requerido,
  requiereRol,
  ruta,
} from '../util'

function historial(
  t: TemaRow,
  usuarioId: string,
  anterior: EstadoTema | null,
  cambios: Record<string, { antes: unknown; despues: unknown }> | null = null,
) {
  db.temaHistorial.push({
    id: uid(),
    temaId: t.id,
    usuarioId,
    estadoAnterior: anterior,
    estadoNuevo: t.estado,
    cambios,
    fecha: ahora(),
  })
}

function validarRango(min: number, max: number) {
  if (!(min >= 1))
    throw falla(400, 'RANGO_INVALIDO', 'El mínimo de integrantes debe ser al menos 1.', 'RN-05')
  if (!(max >= min))
    throw falla(
      400,
      'RANGO_INVALIDO',
      'El máximo de integrantes debe ser mayor o igual al mínimo.',
      'RN-05',
    )
}

/** Rechaza (sin eliminar) las postulaciones abiertas de un tema. */
export function rechazarPostulacionesAbiertas(temaId: string, motivo: string, excepto?: string) {
  for (const p of q.postulacionesAbiertasDeTema(temaId)) {
    if (p.id === excepto) continue
    p.estado = 'RECHAZADA'
    p.observacion = motivo
    notificar(
      q.usuariosDeEstudiantes(q.integrantesDePostulacion(p)),
      'POSTULACION_RECHAZADA',
      'Postulación rechazada',
      `Tu postulación al tema "${q.tema(temaId)?.titulo}" fue rechazada: ${motivo}`,
      { tipo: 'postulacion', id: p.id },
    )
  }
}

const ACCIONES: Record<string, { desde: EstadoTema[]; hacia: EstadoTema; verbo: string }> = {
  publicar: { desde: ['BORRADOR', 'CERRADO'], hacia: 'PUBLICADO', verbo: 'publicar' },
  cerrar: { desde: ['PUBLICADO'], hacia: 'CERRADO', verbo: 'cerrar' },
  retirar: { desde: ['BORRADOR', 'PUBLICADO', 'CERRADO'], hacia: 'RETIRADO', verbo: 'retirar' },
}

export const temaHandlers = [
  // RF-05 / RF-20: consulta con filtros
  http.get(
    `${API}/temas`,
    ruta(({ url, u }) => {
      const f = Object.fromEntries(url.searchParams)
      let temas = db.temas.filter((t) => !f.periodoId || t.periodoId === f.periodoId)
      if (u.rol === 'ESTUDIANTE')
        temas = temas.filter((t) => t.estado !== 'BORRADOR' && t.estado !== 'RETIRADO')
      return temas
        .filter((t) => !f.lineaId || t.lineaId === f.lineaId)
        .filter((t) => !f.docenteId || t.docenteProponenteId === f.docenteId)
        .filter((t) => !f.estado || t.estado === f.estado)
        .filter(
          (t) =>
            !f.numIntegrantes ||
            (t.minIntegrantes <= Number(f.numIntegrantes) &&
              Number(f.numIntegrantes) <= t.maxIntegrantes),
        )
        .filter((t) => f.disponible !== 'true' || q.temaDisponible(t.id))
        .map(dto.temaDto)
    }),
  ),
  http.get(
    `${API}/temas/:id`,
    ruta(({ params, u }) => {
      const t = q.tema(params.id)
      if (!t || (u.rol === 'ESTUDIANTE' && t.estado === 'BORRADOR')) throw noEncontrado('El tema')
      return dto.temaDto(t)
    }),
  ),
  http.get(
    `${API}/temas/:id/historial`,
    ruta(({ params, u }) => {
      requiereRol(u, 'ADMIN', 'DOCENTE')
      return db.temaHistorial
        .filter((h) => h.temaId === params.id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map((h) => ({ ...h, usuario: dto.persona(h.usuarioId) }))
    }),
  ),
  http.post(
    `${API}/temas`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ADMIN')
      const b = await cuerpo<
        Record<string, string> & { minIntegrantes: number; maxIntegrantes: number }
      >(req)
      for (const c of ['periodoId', 'lineaId', 'docenteProponenteId', 'titulo', 'descripcion'])
        requerido(b[c], c)
      validarRango(Number(b.minIntegrantes), Number(b.maxIntegrantes))
      const p = q.periodo(b.periodoId)
      if (!p) throw noEncontrado('El período')
      if (p.estado === 'ARCHIVADO')
        throw falla(
          409,
          'PERIODO_ARCHIVADO',
          'No se pueden registrar temas en un período archivado.',
        )
      if (
        db.temas.some(
          (t) =>
            t.periodoId === b.periodoId &&
            t.titulo.trim().toLowerCase() === b.titulo.trim().toLowerCase(),
        )
      )
        throw falla(409, 'TITULO_DUPLICADO', 'Ya existe un tema con ese título en el período.')
      const t: TemaRow = {
        id: uid(),
        periodoId: b.periodoId,
        lineaId: b.lineaId,
        docenteProponenteId: b.docenteProponenteId,
        titulo: b.titulo.trim(),
        descripcion: b.descripcion.trim(),
        minIntegrantes: Number(b.minIntegrantes),
        maxIntegrantes: Number(b.maxIntegrantes),
        estado: 'BORRADOR',
        creadoEn: ahora(),
      }
      db.temas.push(t)
      historial(t, u.id, null)
      auditar(u, 'CREAR', 'tema', t.id, null, { ...t })
      return dto.temaDto(t)
    }),
  ),
  http.patch(
    `${API}/temas/:id`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const t = q.tema(params.id)
      if (!t) throw noEncontrado('El tema')
      if (t.estado === 'ASIGNADO' || t.estado === 'RETIRADO')
        throw falla(409, 'TEMA_NO_EDITABLE', `Un tema ${t.estado.toLowerCase()} no puede editarse.`)
      const b = await cuerpo<Partial<TemaRow>>(req)
      const min = Number(b.minIntegrantes ?? t.minIntegrantes)
      const max = Number(b.maxIntegrantes ?? t.maxIntegrantes)
      validarRango(min, max)
      if (
        (min !== t.minIntegrantes || max !== t.maxIntegrantes) &&
        q.postulacionesAbiertasDeTema(t.id).length
      )
        throw falla(
          409,
          'TEMA_CON_POSTULACIONES',
          'No se puede cambiar el rango de integrantes con postulaciones abiertas.',
          'RN-05',
        )
      const cambios: Record<string, { antes: unknown; despues: unknown }> = {}
      for (const k of [
        'titulo',
        'descripcion',
        'lineaId',
        'docenteProponenteId',
        'minIntegrantes',
        'maxIntegrantes',
      ] as const) {
        const nuevo = k === 'minIntegrantes' ? min : k === 'maxIntegrantes' ? max : b[k]
        if (nuevo !== undefined && nuevo !== t[k]) {
          cambios[k] = { antes: t[k], despues: nuevo }
          ;(t as unknown as Record<string, unknown>)[k] = nuevo
        }
      }
      if (Object.keys(cambios).length) {
        historial(t, u.id, t.estado, cambios)
        auditar(
          u,
          'ACTUALIZAR',
          'tema',
          t.id,
          Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, v.antes])),
          Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, v.despues])),
        )
      }
      return dto.temaDto(t)
    }),
  ),
  // RF-21 / RF-25: publicar, cerrar, retirar
  http.post(
    `${API}/temas/:id/:accion`,
    ruta(
      async ({ req, u, params }) => {
        requiereRol(u, 'ADMIN')
        const acc = ACCIONES[params.accion]
        if (!acc) throw noEncontrado('La acción')
        const t = q.tema(params.id)
        if (!t) throw noEncontrado('El tema')
        if (!acc.desde.includes(t.estado))
          throw falla(
            409,
            'TRANSICION_INVALIDA',
            `No se puede ${acc.verbo} un tema en estado ${t.estado}.`,
          )
        const { motivo } = await cuerpo<{ motivo?: string }>(req)
        if (acc.hacia === 'RETIRADO' && !motivo?.trim())
          throw falla(400, 'MOTIVO_REQUERIDO', 'Debe indicar el motivo del retiro.', 'RN-13')
        if (acc.hacia === 'PUBLICADO') {
          const p = q.periodo(t.periodoId)!
          if (p.estado === 'ARCHIVADO' || p.estado === 'EN_CURSO')
            throw falla(
              409,
              'PERIODO_NO_ADMITE',
              'El período no admite publicar temas en su estado actual.',
            )
        }
        const anterior = t.estado
        t.estado = acc.hacia
        historial(t, u.id, anterior, motivo ? { motivo: { antes: null, despues: motivo } } : null)
        if (acc.hacia === 'RETIRADO')
          rechazarPostulacionesAbiertas(t.id, `Tema retirado: ${motivo}`)
        auditar(
          u,
          `TEMA_${params.accion.toUpperCase()}`,
          'tema',
          t.id,
          { estado: anterior },
          { estado: t.estado, motivo },
        )
        return dto.temaDto(t)
      },
      { status: 200 },
    ),
  ),
]
