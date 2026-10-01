import { useState } from 'react'
import { DownloadIcon, FileTextIcon, UploadIcon } from 'lucide-react'
import { CargandoBloque, ConsultaEstado, Vacio } from '@/components/Estados'
import { FileUpload } from '@/components/FileUpload'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMiAsignacion } from '@/features/asignaciones/api'
import {
  descargarPlantilla,
  useDocumentosPat,
  usePlantillaVigente,
  useSubirPat,
} from '@/features/pat/api'
import { HistorialVersionesPat } from '@/features/pat/HistorialVersiones'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { MAX_TAMANO_PAT, TIPOS_PAT } from '@/lib/archivos'
import { mensajeError } from '@/lib/errores'
import { nombreCompleto } from '@/lib/utils'
import { toast } from 'sonner'

/** RF-12, RF-13, RF-14 */
export default function Pat() {
  const { periodoId } = usePeriodo()
  const plantilla = usePlantillaVigente(periodoId)
  const asignacion = useMiAsignacion(periodoId)
  const documentos = useDocumentosPat(asignacion.data?.id)
  const subir = useSubirPat(asignacion.data?.id)
  const [archivo, setArchivo] = useState<File | null>(null)

  const ultimo = documentos.data?.[0]
  const puedeCargar =
    !!asignacion.data && (!ultimo || ultimo.estado === 'OBSERVADO' || ultimo.estado === 'RECHAZADO')

  return (
    <>
      <PageHeader
        titulo="Plan de Trabajo (PAT)"
        descripcion="Descarga la plantilla vigente, carga tu PAT y revisa sus observaciones."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Plantilla vigente</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsultaEstado query={plantilla}>
              {(p) =>
                p ? (
                  <div className="space-y-3 text-sm">
                    <p className="flex items-center gap-2">
                      <FileTextIcon className="size-4" aria-hidden /> {p.nombreArchivo}
                    </p>
                    <p className="text-muted-foreground">Versión {p.version}</p>
                    <Button
                      variant="outline"
                      onClick={() =>
                        descargarPlantilla(p.id).catch((e) => toast.error(mensajeError(e)))
                      }
                    >
                      <DownloadIcon /> Descargar plantilla
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay una plantilla publicada para el período.
                  </p>
                )
              }
            </ConsultaEstado>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cargar PAT</CardTitle>
            <CardDescription>
              Requiere una asignación vigente. Cada carga genera una nueva versión; las anteriores y
              sus revisiones se conservan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {asignacion.isPending ? (
              <CargandoBloque />
            ) : !asignacion.data ? (
              <Vacio
                titulo="Sin tema asignado"
                descripcion="Podrás cargar tu PAT cuando tengas una asignación de tema vigente."
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{asignacion.data.tema.titulo}</p>
                  <p className="text-muted-foreground">
                    Tutor(a):{' '}
                    {asignacion.data.tutorVigente
                      ? nombreCompleto(asignacion.data.tutorVigente.docente)
                      : 'pendiente'}
                  </p>
                </div>
                {ultimo?.estado === 'APROBADO' && (
                  <Alert variant="success">
                    <AlertTitle>¡Tu PAT fue aprobado!</AlertTitle>
                    <AlertDescription>Versión {ultimo.version} aprobada.</AlertDescription>
                  </Alert>
                )}
                {ultimo?.estado === 'PENDIENTE' && (
                  <Alert variant="info">
                    <AlertTitle>Versión {ultimo.version} en revisión</AlertTitle>
                    <AlertDescription>
                      Podrás cargar una nueva versión si es observada o rechazada.
                    </AlertDescription>
                  </Alert>
                )}
                {(ultimo?.estado === 'OBSERVADO' || ultimo?.estado === 'RECHAZADO') && (
                  <Alert variant="warning">
                    <AlertTitle>
                      La versión {ultimo.version} fue{' '}
                      {ultimo.estado === 'OBSERVADO' ? 'observada' : 'rechazada'}
                    </AlertTitle>
                    <AlertDescription>{ultimo.revision?.observaciones}</AlertDescription>
                  </Alert>
                )}
                {puedeCargar && (
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (archivo) subir.mutate(archivo, { onSuccess: () => setArchivo(null) })
                    }}
                  >
                    <FileUpload
                      reglas={{ tipos: TIPOS_PAT, maxBytes: MAX_TAMANO_PAT }}
                      archivo={archivo}
                      onChange={setArchivo}
                      etiqueta={
                        ultimo ? `Cargar versión ${ultimo.version + 1}` : 'Cargar PAT (PDF o DOCX)'
                      }
                    />
                    <Button type="submit" disabled={!archivo || subir.isPending}>
                      <UploadIcon /> {subir.isPending ? 'Cargando…' : 'Cargar PAT'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {asignacion.data && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Versiones y revisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsultaEstado query={documentos}>
              {(docs) => <HistorialVersionesPat documentos={docs} />}
            </ConsultaEstado>
          </CardContent>
        </Card>
      )}
    </>
  )
}
