import { useState } from 'react'
import { Navigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { GraduationCapIcon, LogInIcon, RotateCcwIcon } from 'lucide-react'
import { api } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { RUTA_INICIO } from '@/auth/RoleGuard'
import { ConsultaEstado } from '@/components/Estados'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { env } from '@/lib/env'
import { ROL } from '@/lib/estados'
import type { SesionUsuario } from '@/types/dominio'

type UsuarioDemo = SesionUsuario & { escenario: string }

function LoginMock() {
  const { iniciarSesion } = useAuth()
  const [entrando, setEntrando] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['usuarios-demo'],
    queryFn: () => api.get<UsuarioDemo[]>('/auth/usuarios-demo'),
  })
  return (
    <>
      <CardHeader>
        <CardTitle>Ingreso simulado</CardTitle>
        <CardDescription>
          Modo de desarrollo con datos simulados. Elija un usuario para probar cada rol; en
          producción el ingreso se realiza con el servicio de autenticación institucional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ConsultaEstado query={query} filas={6}>
          {(usuarios) => (
            <ul className="grid gap-2 sm:grid-cols-2">
              {usuarios.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={!!entrando}
                    onClick={async () => {
                      setEntrando(u.id)
                      await iniciarSesion(u.id)
                    }}
                    className="flex h-full w-full flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="font-medium">
                        {u.nombres} {u.apellidos}
                      </span>
                      <Badge tono={ROL[u.rol].tono}>{ROL[u.rol].label}</Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">{u.escenario}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ConsultaEstado>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await api.post('/mock/reiniciar')
            window.location.reload()
          }}
        >
          <RotateCcwIcon /> Restablecer datos simulados
        </Button>
      </CardContent>
    </>
  )
}

function LoginOidc() {
  const { iniciarSesion } = useAuth()
  return (
    <>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Use su cuenta institucional para ingresar al sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" size="lg" onClick={() => void iniciarSesion()}>
          <LogInIcon /> Ingresar con cuenta institucional
        </Button>
      </CardContent>
    </>
  )
}

export default function Login() {
  const { estado, usuario } = useAuth()
  if (estado === 'autenticado' && usuario) return <Navigate to={RUTA_INICIO[usuario.rol]} replace />
  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-br from-sidebar to-primary p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-center gap-3 text-white">
          <GraduationCapIcon className="size-10" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold">Sistema de Titulación</h1>
            <p className="text-sm opacity-90">Asignación de temas, tutores y PAT</p>
          </div>
        </div>
        <Card className={env.useMocks ? '' : 'mx-auto max-w-md'}>
          {env.useMocks ? <LoginMock /> : <LoginOidc />}
        </Card>
      </div>
    </main>
  )
}
