import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertTriangleIcon, ArrowLeftIcon, BanIcon, StarIcon, UserCheckIcon } from 'lucide-react'
import { ApiError } from '@/api/client'
import { Campo, SelectSimple } from '@/components/Campo'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  CODIGO_ADVERTENCIA_CARGA,
  useAnularAsignacion,
  useAsignacion,
  useAsignarTutor,
  useHistorialTutores,
} from '@/features/asignaciones/api'
import { MedidorCarga, nivelCarga } from '@/features/asignaciones/MedidorCarga'
import { useCargaTutorial, useDocentes } from '@/features/catalogos/api'
import { useDocumentosPat } from '@/features/pat/api'
import { HistorialVersionesPat } from '@/features/pat/HistorialVersiones'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { usePostulacion } from '@/features/postulaciones/api'
import { formatFechaHora } from '@/lib/fechas'
import {
  CAUSA_ANULACION,
  ESTADO_ASIGNACION_TEMA,
  ESTADO_ASIGNACION_TUTOR,
  MODALIDAD,
  opciones,
  TIPO_ASIGNACION_TUTOR,
} from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { AsignacionTema, CargaDocente, CausaAnulacion } from '@/types/dominio'

/** RF-27, RF-28, RF-30: asignación o reemplazo de tutor con control de carga. */
function AsignarTutor({ asignacion }: { asignacion: AsignacionTema }) {
  const { periodoId } = usePeriodo()
  const postulacion = usePostulacion(asignacion.postulacionId)
  const docentes = useDocentes({ habilitadoTutoria: true })
  const carga = useCargaTutorial(periodoId)
  const asignar = useAsignarTutor()
  const [docenteId, setDocenteId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [advertencia, setAdvertencia] = useState<string | null>(null)

  const vigente = asignacion.tutorVigente
  const cargaPorDocente = new Map<string, CargaDocente>(
    (carga.data ?? []).map((c) => [c.docente.id, c]),
  )
  const propuestos = postulacion.data?.tutoresPropuestos ?? []
  // RF-28: el docente proponente aparece primero cuando fue propuesto
  const ordenados = [...propuestos].sort(
    (a, b) =>
      Number(b.esProponenteTema) - Number(a.esProponenteTema) ||
      a.ordenPrioridad - b.ordenPrioridad,
  )
  const idsPropuestos = new Set(propuestos.map((p) => p.docente.id))
  const otros = (docentes.data ?? []).filter((d) => !idsPropuestos.has(d.id))
  const seleccion = docenteId ? cargaPorDocente.get(docenteId) : undefined
  const nivel = seleccion ? nivelCarga(seleccion, 1) : 'libre'
  const bloqueado = nivel === 'excedido' && seleccion?.bloquear

  const enviar = (confirmarExceso = false) =>
    asignar.mutate(
      {
        asignacionId: asignacion.id,
        docenteId,
        motivoCambio: vigente ? motivo : undefined,
        confirmarExceso,
      },
      {
        onSuccess: () => {
          setDocenteId('')
          setMotivo('')
          setAdvertencia(null)
        },
        onError: (e) => {
          if (e instanceof ApiError && e.code === CODIGO_ADVERTENCIA_CARGA)
            setAdvertencia(e.message)
        },
      },
    )

  const filaDocente = (id: string, nombre: string, extra?: React.ReactNode) => {
    const c = cargaPorDocente.get(id)
    return (
      <TableRow key={id} className={docenteId === id ? 'bg-primary/5' : undefined}>
        <TableCell>
          <input
            type="radio"
            name="docente-tutor"
            className="size-4 accent-primary"
            checked={docenteId === id}
            disabled={vigente?.docente.id === id}
            onChange={() => setDocenteId(id)}
            aria-label={`Seleccionar a ${nombre}`}
          />
        </TableCell>
        <TableCell>
          <span className="font-medium">{nombre}</span>
          {extra}
          {vigente?.docente.id === id && (
            <span className="block text-xs text-muted-foreground">Tutor vigente</span>
          )}
        </TableCell>
        <TableCell>{c ? <MedidorCarga carga={c} compacto /> : '—'}</TableCell>
      </TableRow>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vigente ? 'Reemplazar tutor' : 'Asignar tutor'}</CardTitle>
        <CardDescription>
          Confirme uno de los docentes propuestos o asigne directamente otro docente habilitado. El
          docente proponente y el tutor pueden ser distintos (RN-09).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table aria-label="Docentes propuestos">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Seleccionar</span>
              </TableHead>
              <TableHead>Docente propuesto</TableHead>
              <TableHead>Carga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenados.map((p) =>
              filaDocente(
                p.docente.id,
                nombreCompleto(p.docente),
                <span className="block text-xs text-muted-foreground">
                  Prioridad {p.ordenPrioridad}
                  {p.esProponenteTema && (
                    <span className="ml-2 inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <StarIcon className="size-3" aria-hidden /> Proponente del tema
                    </span>
                  )}
                </span>,
              ),
            )}
          </TableBody>
        </Table>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Asignar directamente otro docente habilitado ({otros.length})
          </summary>
          <Table aria-label="Otros docentes habilitados">
            <TableBody>{otros.map((d) => filaDocente(d.id, nombreCompleto(d)))}</TableBody>
          </Table>
        </details>

        {seleccion && nivel === 'excedido' && (
          <Alert variant={bloqueado ? 'destructive' : 'warning'}>
            <AlertTriangleIcon />
            <AlertTitle>
              {bloqueado
                ? 'Asignación bloqueada por carga tutorial'
                : 'El docente superará su límite'}
            </AlertTitle>
            <AlertDescription>
              Carga actual {seleccion.actual} de {seleccion.limite} (
              {seleccion.origenLimite === 'GLOBAL' ? 'límite global' : 'límite específico'}).
              {bloqueado
                ? ' La configuración impide superar el límite (RN-11).'
                : ' Se pedirá confirmación (RN-11).'}
            </AlertDescription>
          </Alert>
        )}
        {vigente && (
          <Campo
            etiqueta="Motivo del reemplazo"
            requerido
            ayuda="El tutor anterior queda como reemplazado en el historial."
          >
            {(p) => <Textarea {...p} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Campo>
        )}
        <Button
          onClick={() => enviar(false)}
          disabled={!docenteId || !!bloqueado || asignar.isPending || (!!vigente && !motivo.trim())}
        >
          <UserCheckIcon /> {vigente ? 'Reemplazar tutor' : 'Asignar tutor'}
        </Button>
      </CardContent>

      <Dialog open={!!advertencia} onOpenChange={(o) => !o && setAdvertencia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advertencia de carga tutorial</DialogTitle>
            <DialogDescription>{advertencia}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvertencia(null)}>
              Cancelar
            </Button>
            <Button onClick={() => enviar(true)} disabled={asignar.isPending}>
              Asignar de todos modos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function AnularAsignacion({ asignacion }: { asignacion: AsignacionTema }) {
  const [abierto, setAbierto] = useState(false)
  const [causa, setCausa] = useState<CausaAnulacion>('OTRA')
  const [motivo, setMotivo] = useState('')
  const anular = useAnularAsignacion()
  return (
    <>
      <Button variant="outline" onClick={() => setAbierto(true)}>
        <BanIcon /> Anular asignación
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular asignación</DialogTitle>
            <DialogDescription>
              Se registra causa, motivo, responsable y fecha; no se elimina ningún dato (RN-13). El
              tema volverá a estar disponible.
            </DialogDescription>
          </DialogHeader>
          <Campo etiqueta="Causa" requerido>
            {(p) => (
              <SelectSimple
                {...p}
                value={causa}
                onChange={(v) => setCausa(v as CausaAnulacion)}
                opciones={opciones(CAUSA_ANULACION)}
              />
            )}
          </Campo>
          <Campo etiqueta="Motivo" requerido>
            {(p) => <Textarea {...p} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Campo>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!motivo.trim() || anular.isPending}
              onClick={() =>
                anular.mutate(
                  { id: asignacion.id, causaAnulacion: causa, motivoAnulacion: motivo },
                  { onSuccess: () => setAbierto(false) },
                )
              }
            >
              Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function DetalleAsignacion() {
  const { id } = useParams()
  const query = useAsignacion(id)
  const historial = useHistorialTutores(id)
  const documentos = useDocumentosPat(id)
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link to="/admin/asignaciones">
          <ArrowLeftIcon /> Asignaciones
        </Link>
      </Button>
      <ConsultaEstado query={query}>
        {(a) => (
          <>
            <PageHeader
              titulo={a.tema.titulo}
              descripcion={
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge mapa={ESTADO_ASIGNACION_TEMA} valor={a.estado} />
                  <StatusBadge mapa={MODALIDAD} valor={a.modalidad} />
                  Asignado el {formatFechaHora(a.fechaAsignacion)} por{' '}
                  {nombreCompleto(a.aprobadaPor)}
                </span>
              }
              acciones={a.estado === 'VIGENTE' ? <AnularAsignacion asignacion={a} /> : undefined}
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {a.estado === 'ANULADA' && (
                  <Alert variant="destructive">
                    <AlertTitle>
                      Asignación anulada ·{' '}
                      {a.causaAnulacion && CAUSA_ANULACION[a.causaAnulacion].label}
                    </AlertTitle>
                    <AlertDescription>
                      {a.motivoAnulacion} — {nombreCompleto(a.anuladaPor)},{' '}
                      {formatFechaHora(a.fechaAnulacion)}
                    </AlertDescription>
                  </Alert>
                )}
                {a.estado === 'VIGENTE' && <AsignarTutor asignacion={a} />}
                <Card>
                  <CardHeader>
                    <CardTitle>Historial de tutores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConsultaEstado query={historial}>
                      {(h) =>
                        h.length === 0 ? (
                          <Vacio titulo="Aún no se ha asignado tutor" />
                        ) : (
                          <Table aria-label="Historial de tutores">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Docente</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Desde</TableHead>
                                <TableHead>Hasta / motivo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {h.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell className="font-medium">
                                    {nombreCompleto(t.docente)}
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge mapa={TIPO_ASIGNACION_TUTOR} valor={t.tipo} />
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge mapa={ESTADO_ASIGNACION_TUTOR} valor={t.estado} />
                                  </TableCell>
                                  <TableCell>{formatFechaHora(t.fechaAsignacion)}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {t.fechaFin ? formatFechaHora(t.fechaFin) : '—'}
                                    {t.motivoCambio && (
                                      <span className="block">{t.motivoCambio}</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )
                      }
                    </ConsultaEstado>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{a.grupo ? `Grupo ${a.grupo.nombre}` : 'Estudiante'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {(a.integrantes.length
                        ? a.integrantes
                        : a.estudiante
                          ? [a.estudiante]
                          : []
                      ).map((e) => (
                        <li key={e.id}>
                          <span className="font-medium">{nombreCompleto(e)}</span>
                          <span className="block text-xs text-muted-foreground">{e.email}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>PAT</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConsultaEstado query={documentos}>
                      {(d) => <HistorialVersionesPat documentos={d} />}
                    </ConsultaEstado>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </ConsultaEstado>
    </>
  )
}
