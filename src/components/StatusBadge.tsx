import type { InfoEstado } from '@/lib/estados'
import { Badge } from './ui/badge'

/** Badge consistente para cualquier enum de estado (ver lib/estados.ts). */
export function StatusBadge<K extends string>({
  mapa,
  valor,
  className,
}: {
  mapa: Record<K, InfoEstado>
  valor: K | null | undefined
  className?: string
}) {
  if (!valor) return <span className="text-muted-foreground">—</span>
  const info = mapa[valor] ?? { label: valor, tono: 'neutral' as const }
  return (
    <Badge tono={info.tono} className={className}>
      {info.label}
    </Badge>
  )
}
