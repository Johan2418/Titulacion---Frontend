import { CloudOffIcon, LogOutIcon, RotateCwIcon, UserXIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

/** Pantallas para sesiones que no pueden continuar: cuenta no registrada o autenticación no disponible. */
export function EstadoSesion({ tipo }: { tipo: 'no-registrado' | 'no-disponible' }) {
  const { cerrarSesion, reintentar } = useAuth()
  const noRegistrado = tipo === 'no-registrado'
  const Icono = noRegistrado ? UserXIcon : CloudOffIcon
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <Icono
            className={noRegistrado ? 'size-12 text-amber-600' : 'size-12 text-muted-foreground'}
            aria-hidden
          />
          <h1 className="pt-2 text-xl font-semibold tracking-tight">
            {noRegistrado ? 'Tu cuenta no está registrada' : 'No pudimos verificar tu sesión'}
          </h1>
          <CardDescription>
            {noRegistrado
              ? 'Ingresaste con tu cuenta institucional, pero aún no tienes un perfil en el sistema de titulación. Contacta al responsable de titulación para que te habilite.'
              : 'El servicio de autenticación no está disponible en este momento. Intenta nuevamente en unos minutos.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-center gap-2 sm:flex-row">
          {!noRegistrado && (
            <Button onClick={() => void reintentar()}>
              <RotateCwIcon /> Reintentar
            </Button>
          )}
          <Button
            variant={noRegistrado ? 'default' : 'outline'}
            onClick={() => void cerrarSesion()}
          >
            <LogOutIcon /> {noRegistrado ? 'Ingresar con otra cuenta' : 'Cerrar sesión'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
