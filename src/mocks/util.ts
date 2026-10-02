import { HttpResponse } from 'msw'
import { env } from '@/lib/env'
import { ahora, db, guardar, type UsuarioRow } from './db'

const base = env.apiUrl.replace(/\/$/, '')
/** Con una URL relativa se usa comodín de origen para que funcione en navegador y en Node. */
export const API = base.startsWith('http') ? base : `*${base}`

/** Error con el mismo formato que el backend: { statusCode, code, message, regla? } */
export class ErrorNegocio extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly regla?: string,
    readonly detalles?: unknown,
  ) {
    super(message)
  }
}

export const falla = (
  status: number,
  code: string,
  message: string,
  regla?: string,
  detalles?: unknown,
) => new ErrorNegocio(status, code, message, regla, detalles)

export const noEncontrado = (que: string) => falla(404, 'NO_ENCONTRADO', `${que} no existe.`)
export const prohibido = (msg = 'No tiene permisos para realizar esta acción.') =>
  falla(403, 'PROHIBIDO', msg)

export function usuarioDe(request: Request): UsuarioRow {
  const auth = request.headers.get('Authorization') ?? ''
  const id = auth.startsWith('Bearer mock:') ? auth.slice('Bearer mock:'.length) : null
  // escenarios simulados de autenticación (ver ESCENARIOS_AUTH en el login)
  if (id === 'no-registrado')
    throw falla(
      403,
      'USUARIO_NO_REGISTRADO',
      'La identidad es válida pero no está registrada en el sistema.',
    )
  if (id === 'auth-caida')
    throw falla(503, 'AUTH_NO_DISPONIBLE', 'El servicio de autenticación no está disponible.')
  const u = id ? db.usuarios.find((x) => x.id === id && x.estado === 'ACTIVO') : undefined
  if (!u) throw falla(401, 'NO_AUTENTICADO', 'La sesión expiró o no es válida.')
  return u
}

export function requiereRol(u: UsuarioRow, ...roles: UsuarioRow['rol'][]) {
  if (!roles.includes(u.rol)) throw prohibido()
}

type Ctx = { request: Request; params: Record<string, string | readonly string[] | undefined> }

/**
 * Envuelve un handler: resuelve la sesión, convierte ErrorNegocio en respuesta
 * HTTP y persiste la base tras cada operación de escritura.
 */
export function ruta<R>(
  fn: (ctx: {
    req: Request
    params: Record<string, string>
    u: UsuarioRow
    url: URL
  }) => R | Promise<R>,
  opts: { publica?: boolean; status?: number } = {},
) {
  return async ({ request, params }: Ctx) => {
    if (import.meta.env.MODE !== 'test')
      await new Promise((r) => setTimeout(r, 150 + Math.random() * 200))
    try {
      const u = opts.publica ? (null as unknown as UsuarioRow) : usuarioDe(request)
      const res = await fn({
        req: request,
        params: params as Record<string, string>,
        u,
        url: new URL(request.url),
      })
      if (request.method !== 'GET') guardar()
      if (res instanceof Response) return res
      if (res === undefined) return new HttpResponse(null, { status: 204 })
      return HttpResponse.json(res as object, {
        status: opts.status ?? (request.method === 'POST' ? 201 : 200),
      })
    } catch (e) {
      if (e instanceof ErrorNegocio) {
        return HttpResponse.json(
          {
            statusCode: e.status,
            code: e.code,
            message: e.message,
            regla: e.regla,
            detalles: e.detalles,
          },
          { status: e.status },
        )
      }
      console.error('[mock]', e)
      return HttpResponse.json(
        { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor (mock).' },
        { status: 500 },
      )
    }
  }
}

export async function cuerpo<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    return {} as T
  }
}

export function requerido(valor: unknown, campo: string): asserts valor {
  if (valor === undefined || valor === null || valor === '')
    throw falla(400, 'VALIDACION', `El campo "${campo}" es obligatorio.`)
}

/** RNF-34: bitácora de auditoría. */
export function auditar(
  u: UsuarioRow | null,
  accion: string,
  entidadTipo: string,
  entidadId: string | null,
  anteriores: Record<string, unknown> | null,
  nuevos: Record<string, unknown> | null,
) {
  db.auditoria.push({
    id: (db.auditoria.at(-1)?.id ?? 0) + 1,
    usuarioId: u?.id ?? null,
    accion,
    entidadTipo,
    entidadId,
    valoresAnteriores: anteriores,
    valoresNuevos: nuevos,
    ipOrigen: '127.0.0.1',
    fechaHora: ahora(),
  })
}

/** RF-16: notificación en la app (el correo lo envía el backend de forma asíncrona). */
export function notificar(
  usuarioIds: (string | null | undefined)[],
  tipo: string,
  titulo: string,
  mensaje: string,
  entidad?: { tipo: string; id: string },
) {
  for (const usuarioId of new Set(usuarioIds.filter(Boolean) as string[])) {
    db.notificaciones.push({
      id: crypto.randomUUID(),
      usuarioId,
      tipo,
      titulo,
      mensaje,
      entidadTipo: entidad?.tipo ?? null,
      entidadId: entidad?.id ?? null,
      canal: 'EN_APP',
      leida: false,
      fechaCreacion: ahora(),
      fechaEnvio: ahora(),
    })
  }
}

export async function sha256(archivo: File) {
  const buf = await archivo.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** RNF-12: simula una URL prefirmada con vigencia limitada. */
export function urlPrefirmada(
  nombre: string,
  contenido = `Archivo simulado: ${nombre}`,
  tipo = 'text/plain',
) {
  const url = `data:${tipo};charset=utf-8,${encodeURIComponent(contenido)}`
  return {
    url,
    nombreArchivo: nombre,
    expiraEn: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  }
}
