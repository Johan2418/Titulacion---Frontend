import { Link } from 'react-router'
import {
  AlertTriangleIcon,
  ClipboardCheckIcon,
  GitMergeIcon,
  ListChecksIcon,
  UserCheckIcon,
  UserXIcon,
} from 'lucide-react'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useResumenPeriodo } from '@/features/periodos/api'
import { formatFecha } from '@/lib/fechas'
import { ESTADO_PERIODO, ESTADO_POSTULACION, ESTADO_TEMA, type InfoEstado } from '@/lib/estados'
import type { EstadoPostulacion, EstadoTema } from '@/types/dominio'

function Kpi({
  titulo,
  valor,
  icono: Icono,
  to,
  alerta,
}: {
  titulo: string
  valor: number
  icono: typeof UserCheckIcon
  to: string
  alerta?: boolean
}) {
  return (
    <Link to={to} className="group rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
      <Card className={alerta && valor > 0 ? 'border-amber-400' : undefined}>
        <CardContent className="flex items-center gap-4 pt-5">
          <span
            className={`flex size-11 items-center justify-center rounded-lg ${alerta && valor > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-primary/10 text-primary'}`}
          >
            <Icono className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{valor}</p>
            <p className="text-sm text-muted-foreground group-hover:underline">{titulo}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function Distribucion<K extends string>({
  titulo,
  datos,
  mapa,
}: {
  titulo: string
  datos: Record<K, number>
  mapa: Record<K, InfoEstado>
}) {
  const total = Object.values<number>(datos).reduce((a, b) => a + b, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {(Object.keys(datos) as K[]).map((k) => (
            <li key={k} className="flex items-center gap-3 text-sm">
              <span className="w-36 shrink-0">
                <StatusBadge mapa={mapa} valor={k} />
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${total ? (datos[k] / total) * 100 : 0}%` }}
                />
              </span>
              <span className="w-8 text-right tabular-nums">{datos[k]}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function Panel() {
  const { periodo, periodoId } = usePeriodo()
  const query = useResumenPeriodo(periodoId)
  if (!periodo)
    return (
      <Vacio
        titulo="No hay períodos registrados"
        descripcion={
          <Link to="/admin/periodos" className="underline">
            Cree el primer período
          </Link>
        }
      />
    )
  return (
    <>
      <PageHeader
        titulo="Panel del proceso de titulación"
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            {periodo.nombre} <StatusBadge mapa={ESTADO_PERIODO} valor={periodo.estado} /> ·
            Postulación {formatFecha(periodo.fechaInicioPostulacion)} –{' '}
            {formatFecha(periodo.fechaFinPostulacion)} · Inicio{' '}
            {formatFecha(periodo.fechaInicioTitulacion)}
          </span>
        }
      />
      <ConsultaEstado query={query} filas={6}>
        {(r) => (
          <div className="space-y-6">
            {r.condicionadosPendientes > 0 && (
              <Alert variant="warning">
                <AlertTriangleIcon />
                <AlertTitle>
                  {r.condicionadosPendientes} estudiante(s) condicionado(s) sin resolver
                </AlertTitle>
                <AlertDescription>
                  No se puede iniciar la titulación hasta resolver su ingreso (RN-02).{' '}
                  <Link to="/admin/habilitados" className="font-medium underline">
                    Resolver ahora
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Kpi
                titulo="Estudiantes habilitados"
                valor={r.estudiantesHabilitados}
                icono={UserCheckIcon}
                to="/admin/habilitados"
              />
              <Kpi
                titulo="Condicionados pendientes"
                valor={r.condicionadosPendientes}
                icono={UserXIcon}
                to="/admin/habilitados"
                alerta
              />
              <Kpi
                titulo="Conflictos abiertos"
                valor={r.conflictosAbiertos}
                icono={GitMergeIcon}
                to="/admin/conflictos"
                alerta
              />
              <Kpi
                titulo="Asignaciones vigentes"
                valor={r.asignacionesVigentes}
                icono={ListChecksIcon}
                to="/admin/asignaciones"
              />
              <Kpi
                titulo="Asignaciones sin tutor"
                valor={r.sinTutor}
                icono={AlertTriangleIcon}
                to="/admin/asignaciones"
                alerta
              />
              <Kpi
                titulo="PAT por revisar"
                valor={r.patPorRevisar}
                icono={ClipboardCheckIcon}
                to="/admin/pat/revision"
                alerta
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Distribucion<EstadoTema>
                titulo="Temas por estado"
                datos={r.temasPorEstado}
                mapa={ESTADO_TEMA}
              />
              <Distribucion<EstadoPostulacion>
                titulo="Postulaciones por estado"
                datos={r.postulacionesPorEstado}
                mapa={ESTADO_POSTULACION}
              />
            </div>
          </div>
        )}
      </ConsultaEstado>
    </>
  )
}
