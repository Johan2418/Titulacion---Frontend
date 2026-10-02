import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { RUTA_INICIO } from '@/auth/RoleGuard'
import { CargandoPagina, ErrorBloque } from '@/components/Estados'

/** Retorno del proveedor OIDC (authorization code + PKCE). */
export default function AuthCallback() {
  const { completarCallback, usuario } = useAuth()
  const [error, setError] = useState<unknown>(null)
  const iniciado = useRef(false)
  useEffect(() => {
    if (iniciado.current) return
    iniciado.current = true
    completarCallback().catch(setError)
  }, [completarCallback])
  if (usuario) return <Navigate to={RUTA_INICIO[usuario.rol]} replace />
  if (error)
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorBloque error={error} />
      </div>
    )
  return <CargandoPagina />
}
