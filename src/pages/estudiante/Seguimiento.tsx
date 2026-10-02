import { Link } from 'react-router'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleIcon,
  FileTextIcon,
  MailIcon,
} from 'lucide-react'
import { useUsuario } from '@/auth/AuthProvider'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useSeguimiento } from '@/features/seguimiento/api'
import { formatFecha, formatFechaHora } from '@/lib/fechas'
import {
  CONDICION_INGRESO,
  ESTADO_ASIGNACION_TEMA,
  ESTADO_GRUPO,
  ESTADO_PAT,
  ESTADO_POSTULACION,
  MODALIDAD,
  SITUACION_INGRESO,
} from '@/lib/estados'
import { cn, nombreCompleto } from '@/lib/utils'
import type { Seguimiento as SeguimientoT } from '@/types/dominio'

type EstadoPaso = 'hecho' | 'actual' | 'pendiente' | 'alerta'

function pasos(s: SeguimientoT): { titulo: string; detalle: string; estado: EstadoPaso }[] {
  const h = s.habilitacion
  const noAdmitido = h?.situacionIngreso === 'NO_ADMITIDO'
  const activa =
    s.postulacion && ['PENDIENTE', 'EN_CONFLICTO', 'ACEPTADA'].includes(s.postulacion.estado)
  return [
    {
      titulo: 'Habilitación',
      detalle: !h
        ? 'No habilitado en el período'
        : noAdmitido
          ? 'No admitido'
          : h.condicionIngreso === 'CONDICIONADO' && h.situacionIngreso === 'PENDIENTE'
            ? 'Condicionado: requisito pendiente'
            : 'Habilitado',
      estado: !h || noAdmitido ? 'alerta' : h.situacionIngreso === 'PENDIENTE' ? 'actual' : 'hecho',
    },
    {
      titulo: 'Postulación',
      detalle: s.postulacion ? ESTADO_POSTULACION[s.postulacion.estado].label : 'Sin postulación',
      estado: s.asignacion
        ? 'hecho'
        : activa
          ? s.postulacion!.estado === 'EN_CONFLICTO'
            ? 'alerta'
            : 'actual'
          : h && !noAdmitido
            ? 'actual'
            : 'pendiente',
    },
    {
      titulo: 'Asignación de tema',
      detalle: s.asignacion ? 'Tema asignado' : 'Pendiente',
      estado: s.asignacion ? 'hecho' : 'pendiente',
    },
    {
      titulo: 'Tutor',
      detalle: s.asignacion?.tutorVigente
        ? nombreCompleto(s.asignacion.tutorVigente.docente)
        : 'Pendiente',
      estado: s.asignacion?.tutorVigente ? 'hecho' : s.asignacion ? 'actual' : 'pendiente',
    },
    {
      titulo: 'PAT',
      detalle: s.ultimoPat
        ? `v${s.ultimoPat.version}: ${ESTADO_PAT[s.ultimoPat.estado].label}`
        : 'Sin cargar',
      estado:
        s.ultimoPat?.estado === 'APROBADO'
          ? 'hecho'
          : s.ultimoPat && s.ultimoPat.estado !== 'PENDIENTE'
            ? 'alerta'
            : s.asignacion
              ? 'actual'
              : 'pendiente',
    },
  ]
}

const ICONO: Record<EstadoPaso, React.ReactNode> = {
  hecho: <CheckCircle2Icon className="size-6 text-emerald-600" aria-hidden />,
  actual: <CircleDashedIcon className="size-6 text-primary" aria-hidden />,
  pendiente: <CircleIcon className="size-6 text-muted-foreground" aria-hidden />,
  alerta: <AlertTriangleIcon className="size-6 text-amber-600" aria-hidden />,
}

function LineaTiempo({ s }: { s: SeguimientoT }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-5" aria-label="Avance del proceso">
      {pasos(s).map((p, i) => (
        <li
          key={p.titulo}
          className={cn(
            'flex items-start gap-2 rounded-lg border bg-card p-3',
            p.estado === 'actual' && 'border-primary',
          )}
        >
          {ICONO[p.estado]}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Paso {i + 1}</p>
            <p className="text-sm font-medium">{p.titulo}</p>
            <p className="text-xs text-muted-foreground">{p.detalle}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function Seguimiento() {
  const usuario = useUsuario()
  const { periodoId } = usePeriodo()
  const query = useSeguimiento(periodoId)

  return (
    <>
      <PageHeader
        titulo={`Hola, ${usuario.nombres}`}
        descripcion="Estado de tu proceso de titulación en el período vigente."
      />
      <ConsultaEstado query={query} filas={5}>
        {(s) => (
          <div className="space-y-6">
            {!s.periodo && (
              <Alert variant="info">
                <AlertTitle>No hay un período de titulación activo</AlertTitle>
              </Alert>
            )}
            {s.periodo && <LineaTiempo s={s} />}

            {s.habilitacion?.condicionIngreso === 'CONDICIONADO' && (
              <Alert
                variant={
                  s.habilitacion.situacionIngreso === 'NO_ADMITIDO'
                    ? 'destructive'
                    : s.habilitacion.situacionIngreso === 'ADMITIDO'
                      ? 'success'
                      : 'warning'
                }
              >
                <AlertTriangleIcon />
                <AlertTitle>
                  Situación de ingreso: {SITUACION_INGRESO[s.habilitacion.situacionIngreso].label}
                </AlertTitle>
                <AlertDescription>
                  {s.habilitacion.situacionIngreso === 'PENDIENTE' ? (
                    <p>
                      Estás habilitado de forma condicionada. Debes cumplir el requisito pendiente{' '}
                      <strong>«{s.habilitacion.requisitoPendiente}»</strong> antes del inicio de
                      titulación ({formatFecha(s.periodo?.fechaInicioTitulacion)}). Mientras tanto
                      puedes conformar grupo, postular y recibir asignación.
                    </p>
                  ) : (
                    <p>{s.habilitacion.observacionIngreso ?? 'Resolución registrada.'}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {s.periodo && !s.habilitacion && (
              <Alert variant="warning">
                <AlertTriangleIcon />
                <AlertTitle>No estás habilitado en este período</AlertTitle>
                <AlertDescription>Consulta con el responsable de titulación.</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Período</CardTitle>
                  <CardDescription>{s.periodo?.nombre ?? '—'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    Postulación: {formatFecha(s.periodo?.fechaInicioPostulacion)} –{' '}
                    {formatFecha(s.periodo?.fechaFinPostulacion)}
                  </p>
                  <p>Inicio de titulación: {formatFecha(s.periodo?.fechaInicioTitulacion)}</p>
                  {s.habilitacion && (
                    <p className="flex items-center gap-2 pt-1">
                      Condición:{' '}
                      <StatusBadge
                        mapa={CONDICION_INGRESO}
                        valor={s.habilitacion.condicionIngreso}
                      />
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grupo</CardTitle>
                  <CardDescription>
                    Opcional: solo se requiere para postular de forma grupal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {s.grupo ? (
                    <>
                      <p className="flex items-center gap-2 font-medium">
                        {s.grupo.nombre} <StatusBadge mapa={ESTADO_GRUPO} valor={s.grupo.estado} />
                      </p>
                      <p className="text-muted-foreground">
                        {s.grupo.integrantes
                          .filter((i) => i.estado === 'ACTIVO')
                          .map((i) => nombreCompleto(i.estudiante))
                          .join(', ')}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No perteneces a un grupo.</p>
                  )}
                  {s.invitacionesPendientes > 0 && (
                    <p className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <MailIcon className="size-4" aria-hidden /> Tienes {s.invitacionesPendientes}{' '}
                      invitación(es) pendiente(s).
                    </p>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to="/estudiante/grupo">Ir a mi grupo</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Postulación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {s.postulacion ? (
                    <>
                      <p className="font-medium">{s.postulacion.tema.titulo}</p>
                      <p className="flex flex-wrap items-center gap-2">
                        <StatusBadge mapa={ESTADO_POSTULACION} valor={s.postulacion.estado} />
                        <StatusBadge mapa={MODALIDAD} valor={s.postulacion.modalidad} />
                      </p>
                      <p className="text-muted-foreground">
                        Registrada el {formatFechaHora(s.postulacion.fechaPostulacion)}
                      </p>
                      {s.postulacion.observacion && (
                        <p className="text-muted-foreground">
                          Observación: {s.postulacion.observacion}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Aún no has postulado a un tema.</p>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to={s.postulacion ? '/estudiante/postulaciones' : '/estudiante/temas'}>
                      {s.postulacion ? 'Ver postulaciones' : 'Explorar temas'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asignación y tutor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {s.asignacion ? (
                    <>
                      <p className="font-medium">{s.asignacion.tema.titulo}</p>
                      <StatusBadge mapa={ESTADO_ASIGNACION_TEMA} valor={s.asignacion.estado} />
                      <p>
                        Tutor(a):{' '}
                        {s.asignacion.tutorVigente ? (
                          <strong>{nombreCompleto(s.asignacion.tutorVigente.docente)}</strong>
                        ) : (
                          <span className="text-muted-foreground">pendiente de asignación</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Sin tema asignado.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Plan de Trabajo (PAT)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {s.ultimoPat ? (
                    <>
                      <p className="flex items-center gap-2">
                        <FileTextIcon className="size-4" aria-hidden /> Versión{' '}
                        {s.ultimoPat.version}
                        <StatusBadge mapa={ESTADO_PAT} valor={s.ultimoPat.estado} />
                      </p>
                      {s.ultimoPat.revision?.observaciones && (
                        <p className="text-muted-foreground">
                          «{s.ultimoPat.revision.observaciones}»
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      {s.asignacion
                        ? 'Aún no cargas tu PAT.'
                        : 'Disponible cuando tengas un tema asignado.'}
                    </p>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to="/estudiante/pat">Ir al PAT</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </ConsultaEstado>
    </>
  )
}
