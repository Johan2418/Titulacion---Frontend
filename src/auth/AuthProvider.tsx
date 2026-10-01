import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, configurarCliente } from '@/api/client'
import { env } from '@/lib/env'
import type { SesionUsuario } from '@/types/dominio'

const CLAVE_TOKEN_MOCK = 'titulacion.mockToken'

type Estado = 'cargando' | 'autenticado' | 'anonimo'

interface AuthContexto {
  estado: Estado
  usuario: SesionUsuario | null
  /** En modo mock recibe el id del usuario demo; en OIDC redirige al proveedor. */
  iniciarSesion: (usuarioIdMock?: string) => Promise<void>
  cerrarSesion: () => Promise<void>
  completarCallback: () => Promise<void>
}

const Ctx = createContext<AuthContexto | null>(null)

async function tokenActual(): Promise<string | null> {
  if (env.useMocks) return sessionStorage.getItem(CLAVE_TOKEN_MOCK)
  const { oidcManager } = await import('./oidc')
  const user = await oidcManager().getUser()
  return user && !user.expired ? user.access_token : null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null)
  const queryClient = useQueryClient()

  const cargarPerfil = useCallback(async () => {
    const token = await tokenActual()
    if (!token) {
      setUsuario(null)
      setEstado('anonimo')
      return
    }
    try {
      const me = await api.get<SesionUsuario>('/auth/me')
      setUsuario(me)
      setEstado('autenticado')
    } catch {
      setUsuario(null)
      setEstado('anonimo')
    }
  }, [])

  useEffect(() => {
    configurarCliente({
      obtenerToken: tokenActual,
      alNoAutorizado: () => {
        if (env.useMocks) sessionStorage.removeItem(CLAVE_TOKEN_MOCK)
        setUsuario(null)
        setEstado('anonimo')
      },
    })
    if (window.location.pathname !== '/auth/callback') void cargarPerfil()
  }, [cargarPerfil])

  const iniciarSesion = useCallback(
    async (usuarioIdMock?: string) => {
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

  const cerrarSesion = useCallback(async () => {
    queryClient.clear()
    setUsuario(null)
    setEstado('anonimo')
    if (env.useMocks) {
      sessionStorage.removeItem(CLAVE_TOKEN_MOCK)
      return
    }
    const { oidcManager } = await import('./oidc')
    await oidcManager().signoutRedirect()
  }, [queryClient])

  const valor = useMemo(
    () => ({ estado, usuario, iniciarSesion, cerrarSesion, completarCallback }),
    [estado, usuario, iniciarSesion, cerrarSesion, completarCallback],
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
