import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { configurarCliente } from '@/api/client'
import type { SesionUsuario } from '@/types/dominio'
import {
  cargarPerfil as pedirPerfil,
  descartarToken,
  establecerClaveInicial,
  hayToken,
  ingresar,
  renovar,
  salir,
  tokenActual,
} from './backend'
import { clasificarFalloPerfil, esPerfilCompleto, type FalloPerfil } from './sesion'

export type EstadoSesion =
  | 'cargando'
  | 'autenticado'
  | 'anonimo'
  /** Ingresó con la clave temporal: debe fijar su contraseña personal. */
  | 'cambio-clave'
  | Exclude<FalloPerfil, 'sin-sesion'>

export const AVISO_SESION_EXPIRADA = 'Tu sesión expiró o no es válida. Vuelve a ingresar.'

interface AuthContexto {
  estado: EstadoSesion
  usuario: SesionUsuario | null
  /** Mensaje para la pantalla de ingreso (p. ej. sesión expirada). */
  aviso: string | null
  /** Ingreso con correo y contraseña. Lanza ApiError si las credenciales no son válidas. */
  iniciarSesion: (email: string, password: string) => Promise<void>
  /** Primer acceso: fija la contraseña personal y vuelve a ingresar con ella. */
  cambiarClaveInicial: (password: string) => Promise<void>
  cerrarSesion: () => Promise<void>
  /** Vuelve a consultar el perfil (p. ej. tras un 503). */
  reintentar: () => Promise<void>
}

const Ctx = createContext<AuthContexto | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando')
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [emailPrimerAcceso, setEmailPrimerAcceso] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const sesionInvalida = useCallback(() => {
    descartarToken()
    queryClient.clear()
    setUsuario(null)
    setAviso(AVISO_SESION_EXPIRADA)
    setEstado('anonimo')
  }, [queryClient])

  const cargarPerfil = useCallback(async () => {
    if (!hayToken()) {
      setUsuario(null)
      setEstado('anonimo')
      return
    }
    try {
      const me = await pedirPerfil()
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
      if (fallo === 'sin-sesion') sesionInvalida()
      else setEstado(fallo)
    }
  }, [sesionInvalida])

  useEffect(() => {
    configurarCliente({
      obtenerToken: tokenActual,
      // RNF-18: un 401 que no se resuelve renovando invalida la sesión local
      alNoAutorizado: sesionInvalida,
      renovarSesion: renovar,
    })
    // al recargar no hay token en memoria: se intenta recuperar con la cookie de renovación
    void renovar().then(cargarPerfil)
  }, [cargarPerfil, sesionInvalida])

  const iniciarSesion = useCallback(
    async (email: string, password: string) => {
      setAviso(null)
      const { requiereCambioClave } = await ingresar(email, password)
      queryClient.clear()
      if (requiereCambioClave) {
        setEmailPrimerAcceso(email)
        setEstado('cambio-clave')
        return
      }
      setEstado('cargando')
      await cargarPerfil()
    },
    [cargarPerfil, queryClient],
  )

  const cambiarClaveInicial = useCallback(
    async (password: string) => {
      await establecerClaveInicial(password)
      const email = emailPrimerAcceso
      setEmailPrimerAcceso(null)
      if (!email) {
        setEstado('anonimo')
        return
      }
      await iniciarSesion(email, password)
    },
    [emailPrimerAcceso, iniciarSesion],
  )

  const reintentar = useCallback(async () => {
    setEstado('cargando')
    await cargarPerfil()
  }, [cargarPerfil])

  const cerrarSesion = useCallback(async () => {
    queryClient.clear()
    setUsuario(null)
    setAviso(null)
    setEmailPrimerAcceso(null)
    setEstado('anonimo')
    await salir().catch(() => descartarToken())
  }, [queryClient])

  const valor = useMemo(
    () => ({
      estado,
      usuario,
      aviso,
      iniciarSesion,
      cambiarClaveInicial,
      cerrarSesion,
      reintentar,
    }),
    [estado, usuario, aviso, iniciarSesion, cambiarClaveInicial, cerrarSesion, reintentar],
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
