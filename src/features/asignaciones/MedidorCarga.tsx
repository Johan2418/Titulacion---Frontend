import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { CargaDocente } from '@/types/dominio'

export function nivelCarga(c: Pick<CargaDocente, 'actual' | 'limite'>, adicional = 0) {
  if (c.limite === null) return 'libre'
  const total = c.actual + adicional
  if (total > c.limite) return 'excedido'
  if (total === c.limite) return 'lleno'
  return 'libre'
}

/** Barra de carga tutorial (RF-30 / RF-39). */
export function MedidorCarga({
  carga,
  compacto,
}: {
  carga: Pick<CargaDocente, 'actual' | 'limite'>
  compacto?: boolean
}) {
  const nivel = nivelCarga(carga)
  const pct = carga.limite
    ? Math.min(100, (carga.actual / carga.limite) * 100)
    : carga.actual
      ? 30
      : 0
  return (
    <div className={cn('space-y-1', compacto && 'min-w-28')}>
      <Progress
        value={pct}
        aria-label={`Carga tutorial: ${carga.actual}${carga.limite !== null ? ` de ${carga.limite}` : ''}`}
        indicatorClassName={cn(
          nivel === 'excedido'
            ? 'bg-destructive'
            : nivel === 'lleno'
              ? 'bg-amber-500'
              : 'bg-emerald-600',
        )}
      />
      <p className="text-xs text-muted-foreground">
        {carga.actual} / {carga.limite ?? '∞'}
        {nivel === 'excedido' && ' · límite superado'}
        {nivel === 'lleno' && ' · en el límite'}
      </p>
    </div>
  )
}
