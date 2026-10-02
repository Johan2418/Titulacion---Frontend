import { Link } from 'react-router'
import { StarIcon } from 'lucide-react'
import { useUsuario } from '@/auth/AuthProvider'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useCancelarPostulacion, useMisPostulaciones } from '@/features/postulaciones/api'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_POSTULACION, MODALIDAD } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'

export default function MisPostulaciones() {
  const { periodoId } = usePeriodo()
  const usuario = useUsuario()
  const query = useMisPostulaciones(periodoId)
  const cancelar = useCancelarPostulacion()

  return (
    <>
      <PageHeader
        titulo="Mis postulaciones"
        descripcion="Solo puedes tener una postulación activa a la vez (RN-08)."
        acciones={
          <Button asChild>
            <Link to="/estudiante/temas">Explorar temas</Link>
          </Button>
        }
      />
      <ConsultaEstado query={query}>
        {(lista) =>
          lista.length === 0 ? (
            <Vacio
              titulo="Aún no has postulado"
              descripcion="Explora el catálogo de temas para postular."
            />
          ) : (
            <div className="space-y-4">
              {lista.map((p) => {
                const puedeCancelar =
                  (p.estado === 'PENDIENTE' || p.estado === 'EN_CONFLICTO') &&
                  p.registradaPor.id === usuario.id
                return (
                  <Card key={p.id}>
                    <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          <Link to={`/estudiante/temas/${p.tema.id}`} className="hover:underline">
                            {p.tema.titulo}
                          </Link>
                        </CardTitle>
                        <CardDescription>
                          {p.modalidad === 'GRUPAL' ? `Grupo ${p.grupo?.nombre}` : 'Individual'} ·
                          registrada el {formatFechaHora(p.fechaPostulacion)} por{' '}
                          {nombreCompleto(p.registradaPor)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge mapa={MODALIDAD} valor={p.modalidad} />
                        <StatusBadge mapa={ESTADO_POSTULACION} valor={p.estado} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {p.estado === 'EN_CONFLICTO' && (
                        <p className="text-amber-700 dark:text-amber-300">
                          Otra postulación compite por este tema. El responsable de titulación
                          resolverá el conflicto.
                        </p>
                      )}
                      {p.observacion && (
                        <p className="text-muted-foreground">Observación: {p.observacion}</p>
                      )}
                      <div>
                        <p className="mb-1 font-medium">Integrantes</p>
                        <p className="text-muted-foreground">
                          {p.integrantes.map(nombreCompleto).join(', ')}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 font-medium">Tutores propuestos</p>
                        <ol className="list-inside list-decimal text-muted-foreground">
                          {p.tutoresPropuestos.map((t) => (
                            <li key={t.id}>
                              {nombreCompleto(t.docente)}
                              {t.esProponenteTema && (
                                <StarIcon
                                  className="ml-1 inline size-3 text-amber-600"
                                  aria-label="Docente proponente"
                                />
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                      {puedeCancelar && (
                        <ConfirmDialog
                          trigger={
                            <Button variant="outline" size="sm">
                              Cancelar postulación
                            </Button>
                          }
                          titulo="¿Cancelar la postulación?"
                          descripcion="La postulación quedará cancelada (se conserva en el historial) y podrás postular a otro tema."
                          destructivo
                          confirmar="Cancelar postulación"
                          onConfirm={() => cancelar.mutateAsync(p.id)}
                        />
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )
        }
      </ConsultaEstado>
    </>
  )
}
