import { Badge } from '@/components/ui/badge'
import { ESTADO_TEMA } from '@/lib/estados'
import type { Tema } from '@/types/dominio'

export function DisponibilidadTema({ tema }: { tema: Pick<Tema, 'disponible' | 'estado'> }) {
  if (tema.disponible) return <Badge tono="success">Disponible</Badge>
  const info = ESTADO_TEMA[tema.estado]
  return (
    <Badge tono={tema.estado === 'ASIGNADO' ? 'info' : 'muted'}>No disponible · {info.label}</Badge>
  )
}
