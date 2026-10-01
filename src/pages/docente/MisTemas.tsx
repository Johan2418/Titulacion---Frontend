import { ChevronDownIcon } from 'lucide-react'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useMisTemas } from '@/features/temas/api'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_POSTULACION, ESTADO_TEMA, MODALIDAD } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'

/** RF-37: temas propuestos por el docente, su estado y sus postulaciones. */
export default function MisTemas() {
  const { periodoId } = usePeriodo()
  const query = useMisTemas(periodoId)
  return (
    <>
      <PageHeader
        titulo="Mis temas"
        descripcion="Temas que propusiste en el período, su estado y las postulaciones recibidas."
      />
      <ConsultaEstado query={query}>
        {(temas) =>
          temas.length === 0 ? (
            <Vacio titulo="No tienes temas en este período" />
          ) : (
            <div className="space-y-3">
              {temas.map((t) => (
                <Card key={t.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 sm:flex-row sm:items-center [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{t.titulo}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.linea.nombre} · {t.minIntegrantes}–{t.maxIntegrantes} integrante(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge mapa={ESTADO_TEMA} valor={t.estado} />
                        <Badge tono="neutral">{t.postulaciones.length} postulación(es)</Badge>
                        <ChevronDownIcon
                          className="size-4 transition-transform group-open:rotate-180"
                          aria-hidden
                        />
                      </div>
                    </summary>
                    <div className="border-t p-4">
                      {t.postulaciones.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin postulaciones.</p>
                      ) : (
                        <Table aria-label={`Postulaciones a ${t.titulo}`}>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Postulante(s)</TableHead>
                              <TableHead>Modalidad</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>¿Te propuso como tutor?</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {t.postulaciones.map((p) => {
                              const propuesto = p.tutoresPropuestos.find(
                                (tp) => tp.esProponenteTema,
                              )
                              return (
                                <TableRow key={p.id}>
                                  <TableCell>
                                    {p.grupo ? `${p.grupo.nombre}: ` : ''}
                                    {p.integrantes.map(nombreCompleto).join(', ')}
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge mapa={MODALIDAD} valor={p.modalidad} />
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge mapa={ESTADO_POSTULACION} valor={p.estado} />
                                  </TableCell>
                                  <TableCell>{formatFechaHora(p.fechaPostulacion)}</TableCell>
                                  <TableCell>
                                    {propuesto
                                      ? `Sí (prioridad ${propuesto.ordenPrioridad})`
                                      : 'No'}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </details>
                </Card>
              ))}
            </div>
          )
        }
      </ConsultaEstado>
    </>
  )
}
