import { Vacio } from '@/components/Estados'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { agruparPorPrograma } from '@/features/programas/reglas'
import { ESTADO_TEMA } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { Tema } from '@/types/dominio'

/** Bloque 4: vista del banco agrupada por programa, con la categoría de cada tema. */
export function TemasPorPrograma({ temas }: { temas: Tema[] }) {
  const grupos = agruparPorPrograma(temas)
  if (!grupos.length) return <Vacio titulo="Sin temas" />
  return (
    <div className="space-y-4">
      {grupos.map((g) => {
        const titulo = g.programa?.nombre ?? 'Sin programa'
        return (
          <Card key={g.programa?.id ?? 'sin-programa'}>
            <CardHeader>
              <CardTitle className="text-base">
                {titulo}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  ({g.temas.length} tema{g.temas.length === 1 ? '' : 's'})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y" aria-label={`Temas de ${titulo}`}>
                {g.temas.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.carrera.nombre} · {nombreCompleto(t.docenteProponente)}
                      </span>
                    </span>
                    {t.categoria && <Badge tono="neutral">{t.categoria}</Badge>}
                    <StatusBadge mapa={ESTADO_TEMA} valor={t.estado} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
