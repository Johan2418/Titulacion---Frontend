import { CheckCheckIcon } from 'lucide-react'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  useMarcarLeida,
  useMarcarTodasLeidas,
  useNotificaciones,
} from '@/features/notificaciones/api'
import { formatFechaHora } from '@/lib/fechas'
import { cn } from '@/lib/utils'

export default function Notificaciones() {
  const query = useNotificaciones()
  const marcar = useMarcarLeida()
  const todas = useMarcarTodasLeidas()
  return (
    <>
      <PageHeader
        titulo="Notificaciones"
        descripcion="Cambios relevantes de tu proceso de titulación. También se envían por correo electrónico."
        acciones={
          <Button variant="outline" onClick={() => todas.mutate()} disabled={todas.isPending}>
            <CheckCheckIcon /> Marcar todas como leídas
          </Button>
        }
      />
      <ConsultaEstado query={query}>
        {(lista) =>
          lista.length === 0 ? (
            <Vacio titulo="Sin notificaciones" />
          ) : (
            <Card className="divide-y">
              {lista.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex flex-col gap-1 p-4 sm:flex-row sm:items-start',
                    !n.leida && 'bg-primary/5',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', !n.leida && 'font-semibold')}>
                      {!n.leida && <span className="sr-only">Sin leer: </span>}
                      {n.titulo}
                    </p>
                    <p className="text-sm text-muted-foreground">{n.mensaje}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFechaHora(n.fechaCreacion)}
                    </p>
                  </div>
                  {!n.leida && (
                    <Button variant="ghost" size="sm" onClick={() => marcar.mutate(n.id)}>
                      Marcar como leída
                    </Button>
                  )}
                </div>
              ))}
            </Card>
          )
        }
      </ConsultaEstado>
    </>
  )
}
