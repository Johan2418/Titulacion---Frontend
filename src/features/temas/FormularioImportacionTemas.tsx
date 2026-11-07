import { DownloadIcon, SearchCheckIcon } from 'lucide-react'
import { Campo, SelectSimple } from '@/components/Campo'
import { FileUpload } from '@/components/FileUpload'
import { Button } from '@/components/ui/button'
import { opciones, TIPO_TEMA } from '@/lib/estados'
import type { TipoTema } from '@/types/dominio'
import { puedeValidar, type ParametrosImportacionTemas } from './importacion'

const XLSX: Record<string, string[]> = {
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
}

type Opcion = { value: string; label: string }

/** Career, research line and type apply to every row of the workbook. */
export function FormularioImportacionTemas({
  valores,
  onChange,
  carreras,
  lineas,
  onValidar,
  validando,
  onDescargarPlantilla,
}: {
  valores: ParametrosImportacionTemas
  onChange: (valores: ParametrosImportacionTemas) => void
  carreras: Opcion[]
  lineas: Opcion[]
  onValidar: () => void
  validando: boolean
  onDescargarPlantilla: () => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Campo etiqueta="Carrera" requerido ayuda="Prevalece sobre la columna Carrera del Excel.">
        {(p) => (
          <SelectSimple
            {...p}
            value={valores.carreraId}
            onChange={(v) => onChange({ ...valores, carreraId: v })}
            opciones={carreras}
          />
        )}
      </Campo>
      <Campo etiqueta="Línea de investigación" requerido>
        {(p) => (
          <SelectSimple
            {...p}
            value={valores.lineaId}
            onChange={(v) => onChange({ ...valores, lineaId: v })}
            opciones={lineas}
          />
        )}
      </Campo>
      <Campo etiqueta="Tipo de tema" requerido>
        {(p) => (
          <SelectSimple
            {...p}
            value={valores.tipo}
            onChange={(v) => onChange({ ...valores, tipo: v as TipoTema })}
            opciones={opciones(TIPO_TEMA)}
          />
        )}
      </Campo>
      <div className="sm:col-span-3">
        <FileUpload
          reglas={{ tipos: XLSX, maxBytes: 5 * 1024 * 1024 }}
          archivo={valores.archivo}
          onChange={(archivo) => onChange({ ...valores, archivo })}
          etiqueta="Seleccione o arrastre el Excel de temas (.xlsx)"
        />
      </div>
      <div className="flex flex-wrap justify-between gap-2 sm:col-span-3">
        <Button type="button" variant="outline" onClick={onDescargarPlantilla}>
          <DownloadIcon /> Descargar plantilla
        </Button>
        <Button type="button" disabled={!puedeValidar(valores) || validando} onClick={onValidar}>
          <SearchCheckIcon /> Validar archivo
        </Button>
      </div>
    </div>
  )
}
