import { Link, useParams } from 'react-router'
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TablaPostulaciones } from '@/features/postulaciones/TablaPostulaciones'
import { usePostulaciones } from '@/features/postulaciones/api'
import { AccionesTema } from '@/features/temas/AccionesTema'
import { useHistorialTema, useTema } from '@/features/temas/api'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_TEMA } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'

export default function DetalleTemaAdmin() {
  const { id } = useParams()
  const tema = useTema(id)
  const historial = useHistorialTema(id)
  const postulaciones = usePostulaciones({ periodoId: tema.data?.periodoId, temaId: id })

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link to="/admin/temas">
          <ArrowLeftIcon /> Temas
        </Link>
      </Button>
      <ConsultaEstado query={tema}>
        {(t) => (
          <>
            <PageHeader
              titulo={t.titulo}
              descripcion={
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge mapa={ESTADO_TEMA} valor={t.estado} /> {t.linea.nombre} · Proponente:{' '}
                  {nombreCompleto(t.docenteProponente)} · {t.minIntegrantes}–{t.maxIntegrantes}{' '}
                  integrante(s)
                </span>
              }
              acciones={<AccionesTema tema={t} size="default" />}
            />
            <Tabs defaultValue="postulaciones">
              <TabsList>
                <TabsTrigger value="postulaciones">Postulaciones</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
                <TabsTrigger value="descripcion">Descripción</TabsTrigger>
              </TabsList>
              <TabsContent value="postulaciones">
                <ConsultaEstado query={postulaciones}>
                  {(l) => <TablaPostulaciones datos={l} ocultarTema />}
                </ConsultaEstado>
              </TabsContent>
              <TabsContent value="historial">
                <ConsultaEstado query={historial}>
                  {(h) =>
                    h.length === 0 ? (
                      <Vacio titulo="Sin cambios registrados" />
                    ) : (
                      <Card>
                        <CardContent className="pt-5">
                          <ol className="relative space-y-4 border-l pl-6">
                            {h.map((x) => (
                              <li key={x.id} className="relative">
                                <span
                                  className="absolute top-1.5 -left-[1.95rem] size-3 rounded-full border-2 border-card bg-primary"
                                  aria-hidden
                                />
                                <p className="flex flex-wrap items-center gap-2 text-sm">
                                  {x.estadoAnterior && x.estadoAnterior !== x.estadoNuevo ? (
                                    <>
                                      <StatusBadge mapa={ESTADO_TEMA} valor={x.estadoAnterior} />
                                      <ArrowRightIcon className="size-3" aria-label="a" />
                                    </>
                                  ) : null}
                                  <StatusBadge mapa={ESTADO_TEMA} valor={x.estadoNuevo} />
                                  {!x.estadoAnterior && (
                                    <span className="text-muted-foreground">Registro</span>
                                  )}
                                  {x.estadoAnterior === x.estadoNuevo && (
                                    <span className="text-muted-foreground">Edición</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFechaHora(x.fecha)} · {nombreCompleto(x.usuario)}
                                </p>
                                {x.cambios && (
                                  <ul className="mt-1 text-xs">
                                    {Object.entries(x.cambios).map(([campo, c]) => (
                                      <li key={campo}>
                                        <span className="font-medium">{campo}</span>:{' '}
                                        {c.antes != null && (
                                          <>
                                            <s className="text-muted-foreground">
                                              {String(c.antes)}
                                            </s>{' '}
                                            →{' '}
                                          </>
                                        )}
                                        {String(c.despues)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    )
                  }
                </ConsultaEstado>
              </TabsContent>
              <TabsContent value="descripcion">
                <Card>
                  <CardContent className="pt-5 text-sm leading-relaxed whitespace-pre-line">
                    {t.descripcion}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </ConsultaEstado>
    </>
  )
}
