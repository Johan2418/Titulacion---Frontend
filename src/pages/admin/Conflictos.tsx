import { useState } from 'react'
import { GitMergeIcon, TrophyIcon } from 'lucide-react'
import { Campo, SelectSimple } from '@/components/Campo'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useConflictos, useResoluciones, useResolverConflicto } from '@/features/postulaciones/api'
import { formatFechaHora } from '@/lib/fechas'
import { CRITERIO_CONFLICTO, MODALIDAD, opciones } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { ConflictoAbierto, CriterioConflicto } from '@/types/dominio'

function nombrePostulacion(p: {
  grupo?: { nombre: string } | null
  estudiante?: { nombres: string; apellidos: string } | null
}) {
  return p.grupo ? `Grupo ${p.grupo.nombre}` : nombreCompleto(p.estudiante)
}

function ResolverConflicto({ conflicto }: { conflicto: ConflictoAbierto }) {
  const resolver = useResolverConflicto()
  const [criterio, setCriterio] = useState<CriterioConflicto>('ORDEN_LLEGADA')
  const [ganadora, setGanadora] = useState('')
  const [puntajes, setPuntajes] = useState<Record<string, string>>({})
  const [justificacion, setJustificacion] = useState('')
  const [intentado, setIntentado] = useState(false)
  const errores = {
    ganadora: !ganadora ? 'Seleccione la postulación ganadora.' : undefined,
    justificacion: !justificacion.trim() ? 'La justificación es obligatoria.' : undefined,
  }

  const sugerir = () => {
    // orden de llegada: la primera postulación; con puntajes: el mayor
    if (criterio === 'ORDEN_LLEGADA') setGanadora(conflicto.postulaciones[0].id)
    else {
      const mejor = [...conflicto.postulaciones].sort(
        (a, b) => Number(puntajes[b.id] ?? -1) - Number(puntajes[a.id] ?? -1),
      )[0]
      if (mejor) setGanadora(mejor.id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitMergeIcon className="size-4 text-destructive" aria-hidden /> {conflicto.tema.titulo}
        </CardTitle>
        <CardDescription>
          {conflicto.postulaciones.length} postulaciones válidas compiten por este tema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setIntentado(true)
            if (errores.ganadora || errores.justificacion) return
            resolver.mutate({
              temaId: conflicto.tema.id,
              criterioAplicado: criterio,
              postulacionGanadoraId: ganadora,
              justificacion,
              participantes: conflicto.postulaciones.map((p) => ({
                postulacionId: p.id,
                puntajeCriterio: puntajes[p.id] ? Number(puntajes[p.id]) : null,
              })),
            })
          }}
        >
          <Campo etiqueta="Criterio aplicado" requerido className="space-y-1.5 sm:w-72">
            {(p) => (
              <SelectSimple
                {...p}
                value={criterio}
                onChange={(v) => setCriterio(v as CriterioConflicto)}
                opciones={opciones(CRITERIO_CONFLICTO)}
              />
            )}
          </Campo>
          <Table aria-label="Participantes del conflicto">
            <TableHeader>
              <TableRow>
                <TableHead>Ganadora</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Fecha de postulación</TableHead>
                <TableHead>Puntaje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conflicto.postulaciones.map((p, i) => (
                <TableRow
                  key={p.id}
                  className={ganadora === p.id ? 'bg-emerald-50 dark:bg-emerald-950' : undefined}
                >
                  <TableCell>
                    <input
                      type="radio"
                      name={`ganadora-${conflicto.tema.id}`}
                      checked={ganadora === p.id}
                      onChange={() => setGanadora(p.id)}
                      aria-label={`Elegir a ${nombrePostulacion(p)} como ganadora`}
                      className="size-4 accent-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{nombrePostulacion(p)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.integrantes.map(nombreCompleto).join(', ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge mapa={MODALIDAD} valor={p.modalidad} />
                  </TableCell>
                  <TableCell>
                    {formatFechaHora(p.fechaPostulacion)}{' '}
                    {i === 0 && <Badge tono="info">1.º</Badge>}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-24"
                      aria-label={`Puntaje de ${nombrePostulacion(p)}`}
                      value={puntajes[p.id] ?? ''}
                      onChange={(e) => setPuntajes({ ...puntajes, [p.id]: e.target.value })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {intentado && errores.ganadora && (
            <p className="text-sm text-destructive">{errores.ganadora}</p>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={sugerir}>
            Sugerir ganadora según el criterio
          </Button>
          <Campo
            etiqueta="Justificación"
            requerido
            error={intentado ? errores.justificacion : undefined}
          >
            {(p) => (
              <Textarea
                {...p}
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
              />
            )}
          </Campo>
          <Button type="submit" disabled={resolver.isPending}>
            <TrophyIcon /> Registrar resolución
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** RF-23 */
export default function Conflictos() {
  const { periodoId } = usePeriodo()
  const abiertos = useConflictos(periodoId)
  const resueltos = useResoluciones(periodoId)
  if (!periodoId) return <Vacio titulo="Seleccione un período" />
  return (
    <>
      <PageHeader
        titulo="Conflictos de postulación"
        descripcion="Cuando varias postulaciones válidas compiten por un tema, registre el criterio, los puntajes, la ganadora y la justificación."
      />
      <Tabs defaultValue="abiertos">
        <TabsList>
          <TabsTrigger value="abiertos">
            Abiertos {abiertos.data ? `(${abiertos.data.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="resueltos">Resueltos</TabsTrigger>
        </TabsList>
        <TabsContent value="abiertos">
          <ConsultaEstado query={abiertos}>
            {(l) =>
              l.length === 0 ? (
                <Vacio titulo="No hay conflictos abiertos" />
              ) : (
                <div className="space-y-4">
                  {l.map((c) => (
                    <ResolverConflicto key={c.tema.id} conflicto={c} />
                  ))}
                </div>
              )
            }
          </ConsultaEstado>
        </TabsContent>
        <TabsContent value="resueltos">
          <ConsultaEstado query={resueltos}>
            {(l) =>
              l.length === 0 ? (
                <Vacio titulo="Sin resoluciones registradas" />
              ) : (
                <div className="space-y-3">
                  {l.map((r) => (
                    <Card key={r.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{r.tema.titulo}</CardTitle>
                        <CardDescription>
                          {CRITERIO_CONFLICTO[r.criterioAplicado].label} ·{' '}
                          {formatFechaHora(r.fechaResolucion)} · {nombreCompleto(r.resueltoPor)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <ul className="space-y-1">
                          {r.participantes.map((p) => (
                            <li key={p.id} className="flex items-center gap-2">
                              {p.postulacion.id === r.postulacionGanadoraId ? (
                                <TrophyIcon
                                  className="size-4 text-amber-600"
                                  aria-label="Ganadora"
                                />
                              ) : (
                                <span className="size-4" />
                              )}
                              {nombrePostulacion(p.postulacion)}
                              {p.puntajeCriterio != null && (
                                <span className="text-muted-foreground">
                                  · puntaje {p.puntajeCriterio}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="text-muted-foreground">Justificación: {r.justificacion}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            }
          </ConsultaEstado>
        </TabsContent>
      </Tabs>
    </>
  )
}
