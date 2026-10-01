import { Link, useParams } from 'react-router'
import { ArrowLeftIcon, SendIcon } from 'lucide-react'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTema } from '@/features/temas/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { dentroDeRango, formatFecha } from '@/lib/fechas'
import { nombreCompleto } from '@/lib/utils'
import { DisponibilidadTema } from './componentes'

/** RF-06 / RF-07 */
export default function DetalleTema() {
  const { id } = useParams()
  const query = useTema(id)
  const { periodo } = usePeriodo()
  const abierto =
    periodo?.estado === 'POSTULACION_ABIERTA' &&
    dentroDeRango(periodo.fechaInicioPostulacion, periodo.fechaFinPostulacion)

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link to="/estudiante/temas">
          <ArrowLeftIcon /> Volver al catálogo
        </Link>
      </Button>
      <ConsultaEstado query={query}>
        {(t) => (
          <>
            <PageHeader
              titulo={t.titulo}
              descripcion={<DisponibilidadTema tema={t} />}
              acciones={
                t.disponible && abierto ? (
                  <Button asChild>
                    <Link to={`/estudiante/temas/${t.id}/postular`}>
                      <SendIcon /> Postular
                    </Link>
                  </Button>
                ) : undefined
              }
            />
            {!abierto && (
              <Alert variant="info" className="mb-4">
                <AlertDescription>
                  La postulación no está abierta
                  {periodo
                    ? ` (período: ${formatFecha(periodo.fechaInicioPostulacion)} – ${formatFecha(periodo.fechaFinPostulacion)})`
                    : ''}
                  .
                </AlertDescription>
              </Alert>
            )}
            <Card>
              <CardContent className="grid gap-6 pt-5 md:grid-cols-3">
                <div className="md:col-span-2">
                  <h2 className="mb-2 font-semibold">Descripción</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                    {t.descripcion}
                  </p>
                </div>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Línea de investigación</dt>
                    <dd className="font-medium">{t.linea.nombre}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Docente proponente</dt>
                    <dd className="font-medium">{nombreCompleto(t.docenteProponente)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Integrantes</dt>
                    <dd className="font-medium">
                      Mínimo {t.minIntegrantes} · Máximo {t.maxIntegrantes}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Postulaciones abiertas</dt>
                    <dd className="font-medium">{t.postulacionesAbiertas}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </>
        )}
      </ConsultaEstado>
    </>
  )
}
