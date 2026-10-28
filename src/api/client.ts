import { env } from '@/lib/env'
import { claveASnake, clavesACamel, clavesASnake } from './casos'

/**
 * Formato de error del backend (NestJS): { statusCode, message, error? }.
 * Se aceptan además `code`, `regla` y `detalles` cuando el backend los envía.
 */
export interface ErrorApiBody {
  statusCode: number
  code: string
  message: string
  regla?: string
  detalles?: Record<string, unknown> | { campo: string; mensaje: string }[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly regla?: string
  readonly detalles?: ErrorApiBody['detalles']

  constructor(body: ErrorApiBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = body.statusCode
    this.code = body.code
    this.regla = body.regla
    this.detalles = body.detalles
  }
}

export const CODIGO_NO_DISPONIBLE = 'NO_DISPONIBLE_BACKEND'

/** Operación que el frontend ofrece pero el backend todavía no implementa. */
export function noDisponible(funcion: string): never {
  throw new ApiError({
    statusCode: 501,
    code: CODIGO_NO_DISPONIBLE,
    message: `${funcion} todavía no está disponible en el backend.`,
  })
}

type Query = Record<string, string | number | boolean | null | undefined>

interface Opciones {
  query?: Query
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
  /** Devuelve el cuerpo binario (p. ej. una plantilla XLSX) en lugar de JSON. */
  blob?: boolean
}

let obtenerToken: () => string | null | Promise<string | null> = () => null
let alNoAutorizado: () => void = () => {}
let renovarSesion: () => Promise<boolean> = async () => false

export function configurarCliente(opts: {
  obtenerToken: typeof obtenerToken
  alNoAutorizado: typeof alNoAutorizado
  /** Intenta renovar el token de acceso; true si se obtuvo uno nuevo. */
  renovarSesion?: typeof renovarSesion
}) {
  obtenerToken = opts.obtenerToken
  alNoAutorizado = opts.alNoAutorizado
  if (opts.renovarSesion) renovarSesion = opts.renovarSesion
}

function construirUrl(path: string, query?: Query) {
  const base = env.apiUrl.replace(/\/$/, '')
  const origen = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(`${base}${path}`, origen)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(claveASnake(k), String(v))
    }
  }
  return url.toString()
}

/** Las rutas de /auth gestionan su propio 401 (credenciales, renovación, primer acceso). */
const esRutaAuth = (path: string) => path.startsWith('/auth/')
/** Rutas públicas: no llevan Bearer (y no deben esperar una renovación en curso). */
const esRutaPublica = (path: string) =>
  /^\/auth\/(login|csrf|refresh|logout|forgot-password|reset-password)$/.test(path)

async function solicitar<T>(
  metodo: string,
  path: string,
  opts: Opciones = {},
  reintento = false,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  const token = esRutaPublica(path) ? null : await obtenerToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opts.body instanceof FormData) {
    body = opts.body
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(clavesASnake(opts.body))
  }

  let res: Response
  try {
    res = await fetch(construirUrl(path, opts.query), {
      method: metodo,
      headers,
      body,
      signal: opts.signal,
      // la cookie HttpOnly de renovación viaja solo a /auth
      credentials: 'include',
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError({
      statusCode: 0,
      code: 'RED_NO_DISPONIBLE',
      message: 'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
    })
  }

  if (res.status === 401 && !esRutaAuth(path) && !reintento && (await renovarSesion()))
    return solicitar<T>(metodo, path, opts, true)

  if (res.status === 204) return undefined as T
  if (opts.blob && res.ok) return (await res.blob()) as T
  const texto = await res.text()
  let datos: unknown
  try {
    datos = texto ? JSON.parse(texto) : undefined
  } catch {
    datos = undefined
  }

  if (!res.ok) {
    if (res.status === 401 && !esRutaAuth(path)) alNoAutorizado()
    const d = datos as Partial<ErrorApiBody> & { message?: string | string[] }
    const cuerpo: ErrorApiBody =
      d && typeof d === 'object' && 'message' in d
        ? {
            statusCode: res.status,
            code: d.code ?? `HTTP_${res.status}`,
            message: Array.isArray(d.message) ? d.message.join('. ') : String(d.message),
            regla: d.regla,
            detalles: d.detalles,
          }
        : { statusCode: res.status, code: `HTTP_${res.status}`, message: res.statusText }
    throw new ApiError(cuerpo)
  }
  return clavesACamel<T>(datos)
}

/** Respuesta paginada del backend: { data, total, page, limit }. */
export interface Pagina<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

const LIMITE_PAGINA = 100

/** Recorre todas las páginas de un listado del backend y devuelve un arreglo simple. */
async function todas<T>(path: string, query: Query = {}): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; ; page++) {
    const r = await solicitar<Pagina<T>>('GET', path, {
      query: { ...query, page, limit: LIMITE_PAGINA },
    })
    items.push(...r.data)
    if (r.data.length < LIMITE_PAGINA || items.length >= r.total) return items
  }
}

/** Convierte un 404 en `null` (p. ej. "no tienes grupo en este período"). */
export async function oNulo<T>(promesa: Promise<T>): Promise<T | null> {
  try {
    return await promesa
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    solicitar<T>('GET', path, { query, signal }),
  todas,
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    solicitar<T>('POST', path, { body, headers }),
  put: <T>(path: string, body?: unknown) => solicitar<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => solicitar<T>('PATCH', path, { body }),
  delete: <T>(path: string) => solicitar<T>('DELETE', path),
  blob: (path: string) => solicitar<Blob>('GET', path, { blob: true }),
}
