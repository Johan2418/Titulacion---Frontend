import { Link } from 'react-router'
import NoEncontrado from '@/pages/comun/NoEncontrado'
import { useUuidParam } from '@/lib/useUuidParam'
import { ArrowLeftIcon, SendIcon } from 'lucide-react'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUsuario } from '@/auth/AuthProvider'
import { useMiGrupo } from '@/features/grupos/api'
import { esRepresentante, perteneceAGrupo } from '@/features/postulaciones/reglas'
import { useTema } from '@/features/temas/api'
import { maxIntegrantes } from '@/features/temas/integrantes'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { dentroDeRango, formatFecha } from '@/lib/fechas'
import { nombreCompleto } from '@/lib/utils'
import { DisponibilidadTema } from './componentes'

/** RF-06 / RF-07 */
export default function DetalleTema() {
  const id = useUuidParam()
  return id ? <DetalleTemaContenido id={id} /> : <NoEncontrado />
}

function DetalleTemaContenido({ id }: { id: string }) {
  const query = useTema(id)
  const { periodo, periodoId } = usePeriodo()
  const usuario = useUsuario()
  const grupo = useMiGrupo(periodoId)
  const estudianteId = usuario.estudianteId ?? ''
  // RN-04: only the representative applies on behalf of the group
  const soloRepresentante =
    perteneceAGrupo(grupo.data ?? null, estudianteId) &&
    !esRepresentante(grupo.data ?? null, estudianteId)
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
                  soloRepresentante ? (
                    <div className="flex flex-col items-end gap-1">
                      <Button disabled aria-describedby="postular-solo-representante">
                        <SendIcon /> Postular
                      </Button>
                      <p
                        id="postular-solo-representante"
                        className="max-w-xs text-right text-xs text-muted-foreground"
                      >
                        Perteneces a un grupo: la postulación la realiza el representante.
                      </p>
                    </div>
                  ) : (
                    <Button asChild>
                      <Link to={`/estudiante/temas/${t.id}/postular`}>
                        <SendIcon /> Postular
                      </Link>
                    </Button>
                  )
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
                      Mínimo {t.minIntegrantes} · Máximo{' '}
                      {maxIntegrantes(t, periodo?.maxIntegrantesDefault)}
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
