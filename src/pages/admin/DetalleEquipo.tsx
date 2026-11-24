import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeftIcon, FileTextIcon, UserCheckIcon } from 'lucide-react'
import { Campo } from '@/components/Campo'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
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
  useAsignarTutorCandidato,
  useConfirmarPatInverso,
  useEntregarPatFirmado,
  useEquipo,
  useGenerarPatEstudiante,
  usePrepararPatInverso,
  type CandidatoTutor,
  type Equipo,
  type IntegranteEquipo,
  type VistaPatInverso,
} from '@/features/equipos/api'
import { formatFechaHora } from '@/lib/fechas'
import {
  ESTADO_ASIGNACION_TEMA,
  ESTADO_PAT,
  MODALIDAD,
  ORIGEN_ASIGNACION,
  ROL_EN_GRUPO,
  SITUACION_INGRESO,
  TIPO_ASIGNACION_TUTOR,
} from '@/lib/estados'
import { useUuidParam } from '@/lib/useUuidParam'
import { nombreCompleto } from '@/lib/utils'
import NoEncontrado from '@/pages/comun/NoEncontrado'
import type { EstadoDocumentoPat } from '@/types/dominio'

const ESTADO_GENERACION: Record<string, string> = {
  EN_COLA: 'En cola',
  PROCESANDO: 'Generándose',
  LISTO: 'Generado',
  FALLIDO: 'Falló la generación',
}

/** Confirmación de un candidato como tutor; si ya hay tutor vigente exige motivo (reemplazo). */
function DialogoTutor({
  equipo,
  candidato,
  onClose,
}: {
  equipo: Equipo
  candidato: CandidatoTutor
  onClose: () => void
}) {
  const asignar = useAsignarTutorCandidato()
  const [motivo, setMotivo] = useState('')
  const reemplazo = !!equipo.tutorVigente
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {reemplazo ? 'Reemplazar tutor' : 'Asignar tutor'}: {nombreCompleto(candidato.docente)}
          </DialogTitle>
          <DialogDescription>
            {reemplazo
              ? `El tutor actual (${nombreCompleto(equipo.tutorVigente?.docente)}) quedará como reemplazado en el historial.`
              : 'El candidato quedará como tutor vigente del equipo, respetando su límite de carga.'}
          </DialogDescription>
        </DialogHeader>
        {reemplazo && (
          <Campo etiqueta="Motivo del reemplazo" requerido>
            {(p) => (
              <Textarea
                {...p}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={1000}
              />
            )}
          </Campo>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={asignar.isPending || (reemplazo && !motivo.trim())}
            onClick={() =>
              asignar.mutate(
                {
                  equipoId: equipo.id,
                  candidatoId: candidato.id,
                  motivo: reemplazo ? motivo : undefined,
                },
                { onSuccess: onClose },
              )
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TutorYCandidatos({ equipo }: { equipo: Equipo }) {
  const [elegido, setElegido] = useState<CandidatoTutor | null>(null)
  const vigente = equipo.tutorVigente
  const operable = equipo.estado === 'VIGENTE'
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tutor</CardTitle>
        <CardDescription>
          {vigente ? (
            <span className="flex flex-wrap items-center gap-2">
              Tutor vigente: <strong>{nombreCompleto(vigente.docente)}</strong>
              <StatusBadge mapa={TIPO_ASIGNACION_TUTOR} valor={vigente.tipo} />
              desde {formatFechaHora(vigente.fechaAsignacion)}
            </span>
          ) : (
            'Sin tutor vigente: confirme uno de los candidatos.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {equipo.candidatos.length === 0 ? (
          <Vacio
            titulo="Este trabajo no tiene candidatos a tutor"
            descripcion="Proviene de una postulación; su tutor se gestiona en la asignación."
          />
        ) : (
          <Table aria-label="Candidatos a tutor">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Prioridad</TableHead>
                <TableHead>Docente</TableHead>
                <TableHead>Carga</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipo.candidatos.map((c) => {
                const esVigente =
                  vigente?.candidatoTutorId === c.id || vigente?.docente.id === c.docente.id
                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.prioridad}</TableCell>
                    <TableCell>
                      <span className="font-medium">{nombreCompleto(c.docente)}</span>
                      {c.docente.tituloAcademico && (
                        <span className="block text-xs text-muted-foreground">
                          {c.docente.tituloAcademico}
                        </span>
                      )}
                      {!c.elegibleActualmente && (
                        <Badge tono="danger">No habilitado actualmente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.carga.actual}
                      {c.carga.maxTrabajos !== null
                        ? ` de ${c.carga.maxTrabajos}`
                        : ' (sin límite configurado)'}
                    </TableCell>
                    <TableCell className="text-right">
                      {esVigente ? (
                        <Badge tono="success">Tutor vigente</Badge>
                      ) : (
                        operable && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!c.elegibleActualmente}
                            onClick={() => setElegido(c)}
                          >
                            <UserCheckIcon />{' '}
                            {vigente ? 'Reemplazar por este' : 'Asignar como tutor'}
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {elegido && (
        <DialogoTutor equipo={equipo} candidato={elegido} onClose={() => setElegido(null)} />
      )}
    </Card>
  )
}

const marca = (ok: boolean, si: string, no: string) => (
  <Badge tono={ok ? 'success' : 'warning'}>{ok ? si : no}</Badge>
)

/** Sección PAT por integrante. La carga del Word del PAT (pieza B) se incorporará aquí. */
function CargaPatInverso({
  equipoId,
  integrante,
  candidatos,
}: {
  equipoId: Equipo['id']
  integrante: IntegranteEquipo
  candidatos: CandidatoTutor[]
}) {
  const preparar = usePrepararPatInverso(equipoId, integrante.estudianteId)
  const confirmar = useConfirmarPatInverso(equipoId, integrante.estudianteId)
  const generar = useGenerarPatEstudiante(equipoId, integrante.estudianteId)
  const entregar = useEntregarPatFirmado(equipoId, integrante.estudianteId)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)
  const [candidatoId, setCandidatoId] = useState('')
  const vista = preparar.data
  const generacionId = generar.data?.id ?? integrante.pat.ultimaGeneracion?.id
  const sinCoincidencia = vista?.tutor.confianza === 'nula'
  return (
    <form
      className="space-y-2"
      onSubmit={(evento) => {
        evento.preventDefault()
        if (archivo) preparar.mutate(archivo)
      }}
    >
      <label className="block text-xs font-medium" htmlFor={`pat-word-${integrante.estudianteId}`}>
        Word del PAT de {nombreCompleto(integrante)}
      </label>
      <input
        id={`pat-word-${integrante.estudianteId}`}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="block w-full text-xs"
        onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
      />
      <Button type="submit" size="sm" disabled={!archivo || preparar.isPending}>
        Leer Word
      </Button>
      {vista && <VistaPrevia vista={vista} />}
      {vista && sinCoincidencia && (
        <label className="block text-xs">
          Elige el tutor candidato
          <select
            className="mt-1 block w-full rounded-md border bg-background px-2 py-1"
            value={candidatoId}
            onChange={(evento) => setCandidatoId(evento.target.value)}
          >
            <option value="">Selecciona un candidato</option>
            {candidatos.map((candidato) => (
              <option key={candidato.id} value={candidato.id}>
                {candidato.prioridad}. {candidato.docente.nombres} {candidato.docente.apellidos}
              </option>
            ))}
          </select>
        </label>
      )}
      {vista && (
        <Button
          type="button"
          size="sm"
          disabled={!vista.puedeConfirmar || confirmar.isPending || (sinCoincidencia && !candidatoId)}
          onClick={() =>
            confirmar.mutate({
              preparacionId: vista.preparacionId,
              candidatoId: sinCoincidencia ? candidatoId : (vista.tutor.candidatoId ?? undefined),
            })
          }
        >
          Confirmar datos
        </Button>
      )}
      <Button type="button" size="sm" variant="outline" disabled={generar.isPending} onClick={() => generar.mutate()}>
        Generar PAT
      </Button>
      <label className="block text-xs font-medium" htmlFor={`pat-pdf-${integrante.estudianteId}`}>
        PDF firmado de {nombreCompleto(integrante)}
      </label>
      <input
        id={`pat-pdf-${integrante.estudianteId}`}
        type="file"
        accept="application/pdf,.pdf"
        className="block w-full text-xs"
        onChange={(evento) => setPdf(evento.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!pdf || !generacionId || entregar.isPending}
        onClick={() => pdf && generacionId && entregar.mutate({ generacionId, archivo: pdf })}
      >
        Subir PDF firmado
      </Button>
    </form>
  )
}

function VistaPrevia({ vista }: { vista: VistaPatInverso }) {
  return (
    <div className="space-y-1 text-xs">
      <p>
        Tutor del Word: {vista.extraido.tutorSolicitado || 'sin nombre'} · coincidencia {vista.tutor.confianza}
        {vista.tutor.nombreSistema ? ` (${vista.tutor.nombreSistema})` : ''}
      </p>
      <p>Título en el Word: {vista.extraido.tituloProvisional}</p>
      {vista.diferencias.length > 0 && (
        <ul className="list-disc pl-4">
          {vista.diferencias.map((diferencia) => (
            <li key={`${diferencia.campo}-${diferencia.word}`}>
              {diferencia.campo}: el Word dice «{diferencia.word}» y el sistema «{diferencia.sistema}». Se conserva el del sistema.
            </li>
          ))}
        </ul>
      )}
      {vista.errores.length > 0 && (
        <ul className="list-disc pl-4 text-destructive">
          {vista.errores.map((error) => (
            <li key={`${error.campo}-${error.mensaje}`}>{error.mensaje}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PatIntegrante({
  integrante,
  equipo,
}: {
  integrante: IntegranteEquipo
  equipo: Equipo
}) {
  const { pat } = integrante
  return (
    <div
      className="space-y-2 rounded-md border bg-muted/30 p-3"
      aria-label={`PAT de ${nombreCompleto(integrante)}`}
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <FileTextIcon className="size-4" /> PAT
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        {marca(
          pat.datosPersonalesRegistrados,
          'Datos personales registrados',
          'Datos personales pendientes',
        )}
        {marca(pat.contenidoRegistrado, 'Contenido registrado', 'Contenido pendiente')}
        {pat.ultimaGeneracion ? (
          <Badge tono={pat.ultimaGeneracion.estado === 'FALLIDO' ? 'danger' : 'info'}>
            {ESTADO_GENERACION[pat.ultimaGeneracion.estado] ?? pat.ultimaGeneracion.estado} ·{' '}
            {formatFechaHora(pat.ultimaGeneracion.solicitadaEn)}
          </Badge>
        ) : (
          <Badge tono="muted">Sin generación</Badge>
        )}
        {pat.ultimaEntrega ? (
          <span className="flex items-center gap-1">
            <Badge tono="neutral">Versión {pat.ultimaEntrega.version}</Badge>
            <StatusBadge
              mapa={ESTADO_PAT}
              valor={(pat.ultimaEntrega.revision ?? 'PENDIENTE') as EstadoDocumentoPat}
            />
          </span>
        ) : (
          <Badge tono="muted">Sin entrega</Badge>
        )}
      </div>
      <CargaPatInverso equipoId={equipo.id} integrante={integrante} candidatos={equipo.candidatos} />
    </div>
  )
}

function Integrantes({ equipo }: { equipo: Equipo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {equipo.grupo ? `Integrantes de ${equipo.grupo.nombre}` : 'Estudiante'}
        </CardTitle>
        <CardDescription>El PAT es individual aunque el trabajo sea grupal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {equipo.integrantes.length === 0 ? (
          <Vacio titulo="Sin integrantes activos" />
        ) : (
          equipo.integrantes.map((i) => (
            <div key={i.estudianteId} className="space-y-2">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{nombreCompleto(i)}</span>
                <span className="text-xs text-muted-foreground">{i.matricula}</span>
                {i.rolEnGrupo && <StatusBadge mapa={ROL_EN_GRUPO} valor={i.rolEnGrupo} />}
                {i.situacionIngreso && (
                  <StatusBadge mapa={SITUACION_INGRESO} valor={i.situacionIngreso} />
                )}
              </p>
              <PatIntegrante integrante={i} equipo={equipo} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

/** Detalle administrativo de un equipo: tema, integrantes con su PAT, candidatos y tutor vigente. */
export default function DetalleEquipo() {
  const id = useUuidParam()
  const query = useEquipo(id ?? undefined)
  if (!id) return <NoEncontrado />
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link to="/admin/equipos">
          <ArrowLeftIcon /> Equipos
        </Link>
      </Button>
      <ConsultaEstado query={query}>
        {(e) => (
          <>
            <PageHeader
              titulo={e.tema.titulo}
              descripcion={
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge mapa={ESTADO_ASIGNACION_TEMA} valor={e.estado} />
                  <StatusBadge mapa={MODALIDAD} valor={e.modalidad} />
                  <StatusBadge mapa={ORIGEN_ASIGNACION} valor={e.origen} />
                  Conformado el {formatFechaHora(e.fechaAsignacion)}
                </span>
              }
              acciones={
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/asignaciones/${e.id}`}>Ver asignación</Link>
                </Button>
              }
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <TutorYCandidatos equipo={e} />
              <Integrantes equipo={e} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Motivo: {e.motivo}</p>
          </>
        )}
      </ConsultaEstado>
    </>
  )
}
