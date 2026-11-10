import { useState } from 'react'
import { RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { opcionesCarrerasConFacultad, useFacultades } from '@/features/academico/api'
import { ErrorCatalogo } from '@/features/academico/ErrorCatalogo'
import { useDocentes, useLineas } from '@/features/catalogos/api'
import { nombreCompleto } from '@/lib/utils'
import { FormularioImportacionTemas } from './FormularioImportacionTemas'
import {
  descargarPlantillaTemas,
  nombresPendientes,
  PARAMETROS_IMPORTACION_INICIALES,
  useConfirmarImportacionTemas,
  useResolverDocentesImportacion,
  useValidarImportacionTemas,
  type ImportacionTemas,
  type ParametrosImportacionTemas,
} from './importacion'
import { VistaPreviaImportacion } from './VistaPreviaImportacion'

/** Import topics from the institutional Excel: validate, resolve teachers, confirm. */
export function ImportarTemas({ abierto, onClose }: { abierto: boolean; onClose: () => void }) {
  const facultades = useFacultades()
  const lineas = useLineas()
  const docentes = useDocentes()
  const [valores, setValores] = useState<ParametrosImportacionTemas>(
    PARAMETROS_IMPORTACION_INICIALES,
  )
  const [preview, setPreview] = useState<ImportacionTemas | null>(null)
  const [seleccion, setSeleccion] = useState<Record<string, string>>({})
  const validar = useValidarImportacionTemas()
  const resolver = useResolverDocentesImportacion()
  const confirmar = useConfirmarImportacionTemas()

  const reiniciar = () => {
    setPreview(null)
    setSeleccion({})
  }
  const cerrar = () => {
    reiniciar()
    setValores(PARAMETROS_IMPORTACION_INICIALES)
    onClose()
  }
  const carreraId = preview?.carreraId ?? valores.carreraId
  const docentesCarrera = (docentes.data ?? [])
    .filter((d) => d.carrera.id === carreraId && d.estado === 'ACTIVO')
    .map((d) => ({ value: d.id, label: nombreCompleto(d) }))

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar temas</DialogTitle>
          <DialogDescription>
            Excel con las columnas Nro., Docente, Temas, Carrera y Observación. Los temas se crean
            publicados en el banco de la carrera elegida; los duplicados se omiten.
          </DialogDescription>
        </DialogHeader>
        <ErrorCatalogo consulta={facultades} />
        {!preview ? (
          <FormularioImportacionTemas
            valores={valores}
            onChange={setValores}
            carreras={opcionesCarrerasConFacultad(facultades.data)}
            lineas={(lineas.data ?? [])
              .filter((l) => l.activa)
              .map((l) => ({ value: l.id, label: l.nombre }))}
            validando={validar.isPending}
            onDescargarPlantilla={() => void descargarPlantillaTemas()}
            onValidar={() => {
              const { archivo, carreraId: carrera, lineaId, tipo } = valores
              if (!archivo || !carrera || !lineaId || !tipo) return
              validar.mutate(
                { archivo, carreraId: carrera, lineaId, tipo },
                {
                  onSuccess: (r) => {
                    setSeleccion({})
                    setPreview(r)
                  },
                },
              )
            }}
          />
        ) : (
          <>
            <VistaPreviaImportacion
              preview={preview}
              docentes={docentesCarrera}
              seleccion={seleccion}
              onSeleccionar={(nombre, docenteId) =>
                setSeleccion((s) => ({ ...s, [nombre]: docenteId }))
              }
              procesando={resolver.isPending || confirmar.isPending}
              onAplicar={() =>
                resolver.mutate(
                  {
                    id: preview.id,
                    resoluciones: nombresPendientes(preview.filas).map((nombre) => ({
                      nombreExcel: nombre,
                      docenteId: seleccion[nombre]!,
                    })),
                  },
                  { onSuccess: setPreview },
                )
              }
              onConfirmar={() => confirmar.mutate(preview.id, { onSuccess: cerrar })}
            />
            <Button type="button" variant="ghost" onClick={reiniciar}>
              <RotateCcwIcon /> Cargar otro archivo
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
