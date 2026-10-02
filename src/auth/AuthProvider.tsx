import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, configurarCliente } from '@/api/client'
import { env } from '@/lib/env'
import type { SesionUsuario } from '@/types/dominio'
import { clasificarFalloPerfil, esPerfilCompleto, type FalloPerfil } from './sesion'

const CLAVE_TOKEN_MOCK = 'titulacion.mockToken'

export type EstadoSesion =
  'cargando' | 'autenticado' | 'anonimo' | Exclude<FalloPerfil, 'sin-sesion'>

export const AVISO_SESION_EXPIRADA = 'Tu sesión expiró o no es válida. Vuelve a ingresar.'

interface AuthContexto {
  estado: EstadoSesion
  usuario: SesionUsuario | null
  /** Mensaje para la pantalla de ingreso (p. ej. sesión expirada). */
  aviso: string | null
  /** En modo mock recibe el id del usuario demo; en OIDC redirige al proveedor. */
  iniciarSesion: (usuarioIdMock?: string) => Promise<void>
  cerrarSesion: () => Promise<void>
  completarCallback: () => Promise<void>
  /** Vuelve a consultar el perfil (p. ej. tras un 503). */
  reintentar: () => Promise<void>
}

const Ctx = createContext<AuthContexto | null>(null)

async function tokenActual(): Promise<string | null> {
  if (env.useMocks) return sessionStorage.getItem(CLAVE_TOKEN_MOCK)
  const { oidcManager } = await import('./oidc')
  const user = await oidcManager().getUser()
  return user && !user.expired ? user.access_token : null
}

/** Descarta el token local sin cerrar la sesión en el proveedor. */
async function descartarToken() {
  if (env.useMocks) {
    sessionStorage.removeItem(CLAVE_TOKEN_MOCK)
    return
  }
  const { oidcManager } = await import('./oidc')
  await oidcManager().removeUser()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando')
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const sesionInvalida = useCallback(async () => {
    await descartarToken()
    queryClient.clear()
    setUsuario(null)
    setAviso(AVISO_SESION_EXPIRADA)
    setEstado('anonimo')
  }, [queryClient])

  const cargarPerfil = useCallback(async () => {
    const token = await tokenActual()
    if (!token) {
      setUsuario(null)
      setEstado('anonimo')
      return
    }
    try {
      const me = await api.get<unknown>('/auth/me')
      if (!esPerfilCompleto(me)) {
        setUsuario(null)
        setEstado('no-registrado')
        return
      }
      setUsuario(me)
      setAviso(null)
      setEstado('autenticado')
    } catch (e) {
      const fallo = clasificarFalloPerfil(e)
      setUsuario(null)
      if (fallo === 'sin-sesion') await sesionInvalida()
      else setEstado(fallo)
    }
  }, [sesionInvalida])

  useEffect(() => {
    configurarCliente({
      obtenerToken: tokenActual,
      // RNF-18: un 401 en cualquier petición invalida la sesión local
      alNoAutorizado: () => void sesionInvalida(),
    })
    if (window.location.pathname !== '/auth/callback') void cargarPerfil()
  }, [cargarPerfil, sesionInvalida])

  const iniciarSesion = useCallback(
    async (usuarioIdMock?: string) => {
      setAviso(null)
      if (env.useMocks) {
        if (!usuarioIdMock) return
        sessionStorage.setItem(CLAVE_TOKEN_MOCK, `mock:${usuarioIdMock}`)
        queryClient.clear()
        setEstado('cargando')
        await cargarPerfil()
        return
      }
      const { oidcManager } = await import('./oidc')
      await oidcManager().signinRedirect()
    },
    [cargarPerfil, queryClient],
  )

  const completarCallback = useCallback(async () => {
    const { oidcManager } = await import('./oidc')
    await oidcManager().signinRedirectCallback()
    await cargarPerfil()
  }, [cargarPerfil])

  const reintentar = useCallback(async () => {
    setEstado('cargando')
    await cargarPerfil()
  }, [cargarPerfil])

  const cerrarSesion = useCallback(async () => {
    queryClient.clear()
    setUsuario(null)
    setAviso(null)
    setEstado('anonimo')
    if (env.useMocks) {
      sessionStorage.removeItem(CLAVE_TOKEN_MOCK)
      return
    }
    const { oidcManager } = await import('./oidc')
    await oidcManager().signoutRedirect()
  }, [queryClient])

  const valor = useMemo(
    () => ({ estado, usuario, aviso, iniciarSesion, cerrarSesion, completarCallback, reintentar }),
    [estado, usuario, aviso, iniciarSesion, cerrarSesion, completarCallback, reintentar],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

/** Para componentes que solo se renderizan con sesión iniciada. */
export function useUsuario(): SesionUsuario {
  const { usuario } = useAuth()
  if (!usuario) throw new Error('No hay sesión activa')
  return usuario
}
