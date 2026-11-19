import { SelectSimple } from '@/components/Campo'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ESTADO_TEMA, opciones, TIPO_TEMA } from '@/lib/estados'
import type { EstadoTema, TipoTema } from '@/types/dominio'
import {
  carreraTrasCambiarFacultad,
  carrerasDeFacultadElegida,
  type OpcionCarreraFacultad,
} from '@/features/academico/facultadCarrera'
import type { FiltrosTema } from './api'

export interface FiltrosBanco {
  facultadId: string
  carreraId: string
  lineaId: string
  programaId: string
  tipo: TipoTema | ''
  estado: EstadoTema | ''
  disponible: boolean
}

export const FILTROS_BANCO_INICIALES: FiltrosBanco = {
  facultadId: '',
  carreraId: '',
  lineaId: '',
  programaId: '',
  tipo: '',
  estado: '',
  disponible: false,
}

type Opcion = { value: string; label: string }

/** Filtros del banco → filtros de GET /temas (sin período: el banco abarca todos los períodos). */
export const filtrosTemaDesdeBanco = (f: FiltrosBanco): FiltrosTema => ({
  facultadId: f.facultadId,
  carreraId: f.carreraId,
  lineaId: f.lineaId,
  tipo: f.tipo,
  estado: f.estado,
  disponible: f.disponible || undefined,
  programaId: f.programaId || undefined,
})

/** Filtros presentacionales del banco de temas (facultad, carrera, línea, tipo, estado y disponibilidad). */
export function FiltrosBancoTemas({
  valores,
  onChange,
  facultades,
  carreras,
  lineas,
  programas,
}: {
  valores: FiltrosBanco
  onChange: (valores: FiltrosBanco) => void
  facultades: Opcion[]
  /** Cada carrera indica su facultad para poder acotar la lista al elegir una facultad. */
  carreras: OpcionCarreraFacultad[]
  lineas: Opcion[]
  /** Bloque 4: si se indica, agrega el filtro por programa. */
  programas?: Opcion[]
}) {
  return (
    <>
      <SelectSimple
        aria-label="Filtrar por facultad"
        className="sm:w-64"
        value={valores.facultadId}
        onChange={(v) =>
          onChange({
            ...valores,
            facultadId: v,
            carreraId: carreraTrasCambiarFacultad(carreras, valores.carreraId, v),
          })
        }
        todos="Todas las facultades"
        opciones={facultades}
      />
      <SelectSimple
        aria-label="Filtrar por carrera"
        className="sm:w-64"
        value={valores.carreraId}
        onChange={(v) => onChange({ ...valores, carreraId: v })}
        todos="Todas las carreras"
        opciones={carrerasDeFacultadElegida(carreras, valores.facultadId)}
      />
      <SelectSimple
        aria-label="Filtrar por línea"
        className="sm:w-56"
        value={valores.lineaId}
        onChange={(v) => onChange({ ...valores, lineaId: v })}
        todos="Todas las líneas"
        opciones={lineas}
      />
      {programas && (
        <SelectSimple
          aria-label="Filtrar por programa"
          className="sm:w-56"
          value={valores.programaId}
          onChange={(v) => onChange({ ...valores, programaId: v })}
          todos="Todos los programas"
          opciones={programas}
        />
      )}
      <SelectSimple
        aria-label="Filtrar por tipo"
        className="sm:w-48"
        value={valores.tipo}
        onChange={(v) => onChange({ ...valores, tipo: v as TipoTema | '' })}
        todos="Todos los tipos"
        opciones={opciones(TIPO_TEMA)}
      />
      <SelectSimple
        aria-label="Filtrar por estado"
        className="sm:w-44"
        value={valores.estado}
        disabled={valores.disponible}
        onChange={(v) => onChange({ ...valores, estado: v as EstadoTema | '' })}
        todos="Todos los estados"
        opciones={opciones(ESTADO_TEMA)}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id="banco-solo-disponibles"
          checked={valores.disponible}
          onCheckedChange={(v) =>
            onChange({
              ...valores,
              disponible: v === true,
              estado: v === true ? '' : valores.estado,
            })
          }
        />
        <Label htmlFor="banco-solo-disponibles">Solo disponibles</Label>
      </div>
    </>
  )
}
