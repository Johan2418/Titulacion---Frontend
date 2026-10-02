import { Link } from 'react-router'
import { ShieldAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SinPermiso() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <ShieldAlertIcon className="size-12 text-destructive" aria-hidden />
      <h1 className="text-xl font-semibold">Sin permiso</h1>
      <p className="max-w-md text-muted-foreground">
        Su rol no tiene acceso a esta sección. Si cree que es un error, contacte al responsable de
        titulación.
      </p>
      <Button asChild>
        <Link to="/">Ir al inicio</Link>
      </Button>
    </div>
  )
}
