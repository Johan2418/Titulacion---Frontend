import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { AlertTriangleIcon, InboxIcon, Loader2Icon } from 'lucide-react'
import { mensajeError } from '@/lib/errores'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

export function CargandoPagina() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <Loader2Icon className="size-8 animate-spin text-primary" aria-hidden />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

export function CargandoBloque({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function Vacio({
  titulo = 'Sin resultados',
  descripcion,
  accion,
  icono,
}: {
  titulo?: string
  descripcion?: ReactNode
  accion?: ReactNode
  icono?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <div className="text-muted-foreground" aria-hidden>
        {icono ?? <InboxIcon className="size-8" />}
      </div>
      <p className="font-medium">{titulo}</p>
      {descripcion && <p className="max-w-md text-sm text-muted-foreground">{descripcion}</p>}
      {accion}
    </div>
  )
}

export function ErrorBloque({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-6 text-center text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
    >
      <AlertTriangleIcon className="size-6" aria-hidden />
      <p className="text-sm">{mensajeError(error)}</p>
      {reintentar && (
        <Button size="sm" variant="outline" onClick={reintentar}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

/** Renderiza carga / error / contenido de una query de TanStack. */
export function ConsultaEstado<T>({
  query,
  children,
  filas,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  filas?: number
}) {
  if (query.isPending) return <CargandoBloque filas={filas} />
  if (query.isError) return <ErrorBloque error={query.error} reintentar={() => query.refetch()} />
  return <>{children(query.data)}</>
}
