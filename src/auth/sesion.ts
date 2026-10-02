import { ApiError } from '@/api/client'
import { ROLES, type SesionUsuario } from '@/types/dominio'

/** Resultado de intentar cargar el perfil con `GET /auth/me`. */
export type FalloPerfil =
  /** 401: token ausente, vencido o inválido → pedir nuevo ingreso */
  | 'sin-sesion'
  /** 403, o identidad verificada sin perfil/rol en el sistema */
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

/**
 * Mientras el backend no tenga el módulo de usuarios, `/auth/me` solo devuelve la
 * identidad verificada (`{ subject, issuer }`) sin rol: se trata como cuenta no registrada.
 */
export function esPerfilCompleto(datos: unknown): datos is SesionUsuario {
  if (!datos || typeof datos !== 'object') return false
  const d = datos as Partial<SesionUsuario>
  return typeof d.id === 'string' && (ROLES as readonly string[]).includes(d.rol ?? '')
}
