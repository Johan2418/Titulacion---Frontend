import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { GraduationCapIcon, InfoIcon, KeyRoundIcon, LogInIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { CamposNuevaClave } from '@/auth/CamposNuevaClave'
import { validarClave } from '@/auth/clave'
import { restablecerClave, solicitarRecuperacion } from '@/auth/backend'
import { RUTA_INICIO } from '@/auth/RoleGuard'
import { Campo } from '@/components/Campo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { mensajeError } from '@/lib/errores'

type Vista = 'ingreso' | 'recuperar' | 'restablecer'

function useEnvio() {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enviar = async (fn: () => Promise<void>) => {
    setEnviando(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }
  return { enviando, error, setError, enviar }
}

function ErrorFormulario({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}

function FormIngreso({ alRecuperar }: { alRecuperar: () => void }) {
  const { iniciarSesion } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { enviando, error, enviar } = useEnvio()
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void enviar(() => iniciarSesion(email.trim(), password))
  }
  return (
    <>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Ingrese con su correo institucional y su contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <ErrorFormulario error={error} />
          <Campo etiqueta="Correo institucional" requerido>
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
          </Campo>
          <Campo etiqueta="Contraseña" requerido>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
          </Campo>
          <Button className="w-full" size="lg" disabled={enviando || !email || !password}>
            <LogInIcon /> {enviando ? 'Ingresando…' : 'Ingresar'}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={alRecuperar}>
            ¿Olvidó su contraseña?
          </Button>
        </form>
      </CardContent>
    </>
  )
}

/** Primer acceso con la clave temporal recibida por correo. */
function FormClaveInicial() {
  const { cambiarClaveInicial, cerrarSesion } = useAuth()
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const { enviando, error, setError, enviar } = useEnvio()
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const invalida = validarClave(clave, confirmacion)
    if (invalida) return setError(invalida)
    void enviar(() => cambiarClaveInicial(clave))
  }
  return (
    <>
      <CardHeader>
        <CardTitle>Establezca su contraseña</CardTitle>
        <CardDescription>
          Ingresó con una clave temporal. Defina su contraseña personal para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <ErrorFormulario error={error} />
          <CamposNuevaClave {...{ clave, confirmacion, setClave, setConfirmacion }} />
          <Button className="w-full" size="lg" disabled={enviando}>
            <KeyRoundIcon /> {enviando ? 'Guardando…' : 'Guardar y continuar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => void cerrarSesion()}
          >
            Cancelar
          </Button>
        </form>
      </CardContent>
    </>
  )
}

function FormRecuperar({ alEnviar, alVolver }: { alEnviar: () => void; alVolver: () => void }) {
  const [email, setEmail] = useState('')
  const { enviando, error, enviar } = useEnvio()
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void enviar(async () => {
      await solicitarRecuperacion(email.trim())
      alEnviar()
    })
  }
  return (
    <>
      <CardHeader>
        <CardTitle>Recuperar acceso</CardTitle>
        <CardDescription>
          Si existe una cuenta activa con su correo, recibirá un código para restablecer la
          contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <ErrorFormulario error={error} />
          <Campo etiqueta="Correo institucional" requerido>
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
          </Campo>
          <Button className="w-full" disabled={enviando || !email}>
            {enviando ? 'Enviando…' : 'Enviar código'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={alVolver}>
            Volver al ingreso
          </Button>
        </form>
      </CardContent>
    </>
  )
}

function FormRestablecer({ alTerminar }: { alTerminar: (aviso: string) => void }) {
  const [codigo, setCodigo] = useState('')
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const { enviando, error, setError, enviar } = useEnvio()
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const invalida = validarClave(clave, confirmacion)
    if (invalida) return setError(invalida)
    void enviar(async () => {
      await restablecerClave(codigo.trim(), clave)
      alTerminar('Contraseña restablecida. Ingrese con su nueva contraseña.')
    })
  }
  return (
    <>
      <CardHeader>
        <CardTitle>Restablecer contraseña</CardTitle>
        <CardDescription>
          Escriba el código recibido por correo y su nueva contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <ErrorFormulario error={error} />
          <Campo etiqueta="Código" requerido>
            {(p) => (
              <Input
                {...p}
                autoComplete="one-time-code"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
              />
            )}
          </Campo>
          <CamposNuevaClave {...{ clave, confirmacion, setClave, setConfirmacion }} />
          <Button className="w-full" disabled={enviando || !codigo}>
            {enviando ? 'Guardando…' : 'Restablecer contraseña'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => alTerminar('')}>
            Volver al ingreso
          </Button>
        </form>
      </CardContent>
    </>
  )
}

export default function Login() {
  const { estado, usuario, aviso } = useAuth()
  const [vista, setVista] = useState<Vista>('ingreso')
  const [mensaje, setMensaje] = useState<string | null>(null)
  if (estado === 'autenticado' && usuario) return <Navigate to={RUTA_INICIO[usuario.rol]} replace />
  if (estado === 'no-registrado' || estado === 'no-disponible') return <Navigate to="/" replace />
  const avisoVisible = mensaje || aviso
  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-br from-sidebar to-primary p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3 text-white">
          <GraduationCapIcon className="size-10" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold">Sistema de Titulación</h1>
            <p className="text-sm opacity-90">Asignación de temas, tutores y PAT</p>
          </div>
        </div>
        {avisoVisible && (
          <Alert variant="warning">
            <InfoIcon />
            <AlertDescription>{avisoVisible}</AlertDescription>
          </Alert>
        )}
        <Card>
          {estado === 'cambio-clave' ? (
            <FormClaveInicial />
          ) : vista === 'recuperar' ? (
            <FormRecuperar
              alEnviar={() => {
                setMensaje('Si la cuenta existe, se envió un código a su correo.')
                setVista('restablecer')
              }}
              alVolver={() => setVista('ingreso')}
            />
          ) : vista === 'restablecer' ? (
            <FormRestablecer
              alTerminar={(m) => {
                setMensaje(m || null)
                setVista('ingreso')
              }}
            />
          ) : (
            <FormIngreso alRecuperar={() => setVista('recuperar')} />
          )}
        </Card>
      </div>
    </main>
  )
}
