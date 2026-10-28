import { api, oNulo } from '@/api/client'
import type { SesionUsuario, Usuario } from '@/types/dominio'

/**
 * Autenticación propia del backend (correo y contraseña, JWT RS256):
 * - `POST /auth/login` devuelve un token de acceso de 15 min y fija una cookie HttpOnly de renovación;
 * - `POST /auth/refresh` (con cabecera CSRF) rota la cookie y emite un token nuevo;
 * - con clave temporal, el login devuelve un token limitado a `POST /auth/change-initial-password`.
 * El token de acceso solo vive en memoria; al recargar se recupera con la cookie de renovación.
 */

interface RespuestaToken {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  requiereCambioClave?: boolean
  csrfToken?: string
}

let token: string | null = null
let expiraEn = 0
/** El token de primer acceso no tiene sesión asociada y no se puede renovar. */
let primerAcceso = false
let renovando: Promise<boolean> | null = null

/** Margen para renovar antes de que el token venza. */
const MARGEN_MS = 30_000

function guardar(r: RespuestaToken) {
  token = r.accessToken
  expiraEn = Date.now() + r.expiresIn * 1000
  primerAcceso = !!r.requiereCambioClave
}

export function descartarToken() {
  token = null
  expiraEn = 0
  primerAcceso = false
}

export const hayToken = () => token !== null

async function cabeceraCsrf() {
  const { csrfToken } = await api.get<{ csrfToken: string }>('/auth/csrf')
  return { 'X-CSRF-Token': csrfToken }
}

/** Renueva el token con la cookie de sesión. Las llamadas concurrentes comparten la misma renovación. */
export function renovar(): Promise<boolean> {
  renovando ??= (async () => {
    try {
      guardar(await api.post<RespuestaToken>('/auth/refresh', undefined, await cabeceraCsrf()))
      return true
    } catch {
      descartarToken()
      return false
    } finally {
      renovando = null
    }
  })()
  return renovando
}

/** Token vigente para la cabecera Authorization; se renueva poco antes de vencer. */
export async function tokenActual(): Promise<string | null> {
  if (renovando) await renovando
  if (token && !primerAcceso && Date.now() > expiraEn - MARGEN_MS) await renovar()
  return token
}

export async function ingresar(email: string, password: string) {
  const r = await api.post<RespuestaToken>('/auth/login', { email, password })
  guardar(r)
  return { requiereCambioClave: !!r.requiereCambioClave }
}

/** Primer acceso: fija la contraseña personal. El token temporal deja de servir. */
export async function establecerClaveInicial(password: string) {
  await api.post<void>('/auth/change-initial-password', { password })
  descartarToken()
}

/**
 * Cambio de contraseña con sesión iniciada. El backend revoca todas las sesiones vigentes, así
 * que el token actual deja de servir y hay que volver a ingresar con la nueva contraseña.
 */
export async function cambiarClave(actual: string, nueva: string) {
  await api.post<void>('/auth/change-password', { currentPassword: actual, password: nueva })
  descartarToken()
}

export async function solicitarRecuperacion(email: string) {
  return api.post<{ message: string }>('/auth/forgot-password', { email })
}

export async function restablecerClave(code: string, password: string) {
  await api.post<void>('/auth/reset-password', { code, password })
}

export async function salir() {
  try {
    await api.post<void>('/auth/logout', undefined, await cabeceraCsrf())
  } finally {
    descartarToken()
  }
}

/** Arma la sesión que usan las pantallas: cuenta + perfil de estudiante o docente. */
export async function cargarPerfil(): Promise<SesionUsuario> {
  const usuario = await api.get<Usuario>('/usuarios/me')
  if (usuario.rol === 'ESTUDIANTE') {
    const e = await oNulo(api.get<{ id: string }>('/estudiantes/me'))
    return { ...usuario, estudianteId: e?.id ?? null, docenteId: null }
  }
  if (usuario.rol === 'DOCENTE') {
    const d = await oNulo(api.get<{ id: string }>('/docentes/me'))
    return { ...usuario, estudianteId: null, docenteId: d?.id ?? null }
  }
  return { ...usuario, estudianteId: null, docenteId: null }
}
