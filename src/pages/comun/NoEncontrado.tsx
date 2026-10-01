import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function NoEncontrado() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground">La dirección solicitada no existe.</p>
      <Button asChild>
        <Link to="/">Ir al inicio</Link>
      </Button>
    </div>
  )
}
