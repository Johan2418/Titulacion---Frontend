import { AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const MENSAJE_ERROR_CATALOGO = 'No se pudo cargar el catálogo de carreras.'

/**
 * Aviso en línea cuando falla GET /facultades. Sin él, los selects quedan vacíos y
 * parecen «sin carreras disponibles». No renderiza nada si la consulta no falló.
 */
export function ErrorCatalogo({
  consulta,
}: {
  consulta: { isError: boolean; isRefetching?: boolean; refetch: () => unknown }
}) {
  if (!consulta.isError) return null
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
    >
      <span className="flex items-center gap-2">
        <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
        {MENSAJE_ERROR_CATALOGO}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={consulta.isRefetching}
        onClick={() => consulta.refetch()}
      >
        Reintentar
      </Button>
    </div>
  )
}
