import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMiCarga } from '@/features/asignaciones/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { MedidorCarga } from '@/features/asignaciones/MedidorCarga'

/** RF-39: carga tutorial actual frente al límite configurado. */
export default function MiCarga() {
  const { periodoId } = usePeriodo()
  const query = useMiCarga(periodoId)
  return (
    <>
      <PageHeader
        titulo="Mi carga tutorial"
        descripcion="Trabajos que tutorizas en el período frente al límite configurado."
      />
      <ConsultaEstado query={query}>
        {(c) => (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>
                {c.actual} {c.limite !== null ? `de ${c.limite}` : ''} trabajo(s)
              </CardTitle>
              <CardDescription>
                {c.origenLimite === 'ESPECIFICO'
                  ? 'Límite específico asignado a ti.'
                  : c.origenLimite === 'GLOBAL'
                    ? 'Límite global del período.'
                    : 'Sin límite configurado.'}
                {c.limite !== null &&
                  (c.bloquear
                    ? ' Al alcanzarlo se bloquean nuevas asignaciones.'
                    : ' Superarlo genera una advertencia.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MedidorCarga carga={c} />
              {!c.habilitadoTutoria && (
                <Alert variant="warning">
                  <AlertDescription>
                    Actualmente no estás habilitado(a) para tutoría.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </ConsultaEstado>
    </>
  )
}
