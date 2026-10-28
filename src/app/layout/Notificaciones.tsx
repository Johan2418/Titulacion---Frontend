import { useState } from 'react'
import { Link } from 'react-router'
import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useContadorNoLeidas,
  useMarcarLeida,
  useMarcarTodasLeidas,
  useNotificacionesRecientes,
} from '@/features/notificaciones/api'
import { formatFechaHora } from '@/lib/fechas'
import { cn } from '@/lib/utils'

export function CampanaNotificaciones() {
  const [abierto, setAbierto] = useState(false)
  // el sondeo solo consulta el contador; la lista se pide al abrir el panel
  const { data: noLeidas = 0 } = useContadorNoLeidas()
  const { data = [], isLoading } = useNotificacionesRecientes(abierto, 6)
  const marcar = useMarcarLeida()
  const marcarTodas = useMarcarTodasLeidas()

  return (
    <DropdownMenu open={abierto} onOpenChange={setAbierto}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`}
        >
          <BellIcon />
          {noLeidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
          {noLeidas > 0 && (
            <Button variant="link" size="sm" onClick={() => marcarTodas.mutate()}>
              Marcar todas como leídas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {isLoading && <p className="p-3 text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && data.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">No tienes notificaciones.</p>
        )}
        <div className="max-h-80 overflow-y-auto">
          {data.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex-col items-start gap-0.5"
              onSelect={() => !n.leida && marcar.mutate(n.id)}
            >
              <span
                className={cn(
                  'flex w-full items-center gap-2 text-sm',
                  !n.leida && 'font-semibold',
                )}
              >
                {!n.leida && (
                  <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />
                )}
                {n.titulo}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{n.mensaje}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatFechaHora(n.fechaCreacion)}
              </span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notificaciones" className="justify-center text-primary">
            Ver todas
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
