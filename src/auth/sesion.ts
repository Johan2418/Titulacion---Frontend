import { ApiError } from '@/api/client'
import { ROLES, type SesionUsuario } from '@/types/dominio'

/** Resultado de intentar cargar el perfil (`GET /usuarios/me` y el perfil del rol). */
export type FalloPerfil =
  /** 401: token ausente, vencido o inválido y sin sesión renovable → pedir nuevo ingreso */
  | 'sin-sesion'
  /** 403 (p. ej. cuenta inactiva) o cuenta sin rol válido en el sistema */
  | 'no-registrado'
  /** 503, error de red o del servidor → no se descarta la sesión */
  | 'no-disponible'

export const CODIGO_NO_REGISTRADO = 'USUARIO_NO_REGISTRADO'

export function clasificarFalloPerfil(error: unknown): FalloPerfil {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'sin-sesion'
    if (error.status === 403) return 'no-registrado'
  }
  return 'no-disponible'
}

/** La sesión solo es utilizable si la cuenta tiene un rol conocido por el frontend. */
export function esPerfilCompleto(datos: unknown): datos is SesionUsuario {
  if (!datos || typeof datos !== 'object') return false
  const d = datos as Partial<SesionUsuario>
  return typeof d.id === 'string' && (ROLES as readonly string[]).includes(d.rol ?? '')
}
