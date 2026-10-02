import { Navigate, Outlet, useLocation } from 'react-router'
import type { Rol } from '@/types/dominio'
import { CargandoPagina } from '@/components/Estados'
import { EstadoSesion } from '@/pages/comun/EstadoSesion'
import { useAuth } from './AuthProvider'

export const RUTA_INICIO: Record<Rol, string> = {
  ESTUDIANTE: '/estudiante',
  DOCENTE: '/docente',
  ADMIN: '/admin',
}

/** RNF-03: autorización por rol en el cliente (el backend es la autoridad final). */
export function RequiereSesion() {
  const { estado } = useAuth()
  const location = useLocation()
  if (estado === 'cargando') return <CargandoPagina />
  if (estado === 'no-registrado' || estado === 'no-disponible')
    return <EstadoSesion tipo={estado} />
  if (estado === 'anonimo') return <Navigate to="/login" replace state={{ desde: location }} />
  return <Outlet />
}

export function RoleGuard({ roles }: { roles: Rol[] }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (!roles.includes(usuario.rol)) return <Navigate to="/sin-permiso" replace />
  return <Outlet />
}

export function RedireccionInicio() {
  const { usuario } = useAuth()
  return <Navigate to={usuario ? RUTA_INICIO[usuario.rol] : '/login'} replace />
}
