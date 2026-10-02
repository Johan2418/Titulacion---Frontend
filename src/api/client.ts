import { env } from '@/lib/env'

/**
 * Formato de error acordado con el backend:
 * { statusCode, code, message, regla?, detalles? }
 * `regla` referencia la regla de negocio incumplida (p. ej. "RN-05").
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

type Query = Record<string, string | number | boolean | null | undefined>

interface Opciones {
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

let obtenerToken: () => string | null | Promise<string | null> = () => null
let alNoAutorizado: () => void = () => {}

export function configurarCliente(opts: {
  obtenerToken: typeof obtenerToken
  alNoAutorizado: typeof alNoAutorizado
}) {
  obtenerToken = opts.obtenerToken
  alNoAutorizado = opts.alNoAutorizado
}

function construirUrl(path: string, query?: Query) {
  const base = env.apiUrl.replace(/\/$/, '')
  const origen = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(`${base}${path}`, origen)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function solicitar<T>(metodo: string, path: string, opts: Opciones = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = await obtenerToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opts.body instanceof FormData) {
    body = opts.body
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  let res: Response
  try {
    res = await fetch(construirUrl(path, opts.query), {
      method: metodo,
      headers,
      body,
      signal: opts.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError({
      statusCode: 0,
      code: 'RED_NO_DISPONIBLE',
      message: 'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
    })
  }

  if (res.status === 204) return undefined as T
  const texto = await res.text()
  const datos = texto ? JSON.parse(texto) : undefined

  if (!res.ok) {
    if (res.status === 401) alNoAutorizado()
    const cuerpo: ErrorApiBody =
      datos && typeof datos === 'object' && 'message' in datos
        ? {
            statusCode: res.status,
            code: datos.code ?? `HTTP_${res.status}`,
            message: Array.isArray(datos.message) ? datos.message.join('. ') : datos.message,
            regla: datos.regla,
            detalles: datos.detalles,
          }
        : { statusCode: res.status, code: `HTTP_${res.status}`, message: res.statusText }
    throw new ApiError(cuerpo)
  }
  return datos as T
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    solicitar<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => solicitar<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => solicitar<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => solicitar<T>('PATCH', path, { body }),
  delete: <T>(path: string) => solicitar<T>('DELETE', path),
}
