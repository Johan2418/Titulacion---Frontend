import { useState } from 'react'
import { SelectSimple } from '@/components/Campo'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { usePostulaciones } from '@/features/postulaciones/api'
import { opcionesTemas } from '@/features/postulaciones/reglas'
import { TablaPostulaciones } from '@/features/postulaciones/TablaPostulaciones'
import { ESTADO_POSTULACION, MODALIDAD, opciones } from '@/lib/estados'
import type { EstadoPostulacion, Modalidad } from '@/types/dominio'

/** RF-22 / RF-26 */
export default function Postulaciones() {
  const { periodoId } = usePeriodo()
  const [temaId, setTemaId] = useState('')
  const [estado, setEstado] = useState<EstadoPostulacion | ''>('')
  const [modalidad, setModalidad] = useState<Modalidad | ''>('')
  // Topics live in the career bank; the filter offers only the topics applied to in this period.
  // Same filter shape as the unfiltered list, so React Query shares the request when no filter is set.
  const todas = usePostulaciones({ periodoId, temaId: '', estado: '', modalidad: '' })
  const query = usePostulaciones({ periodoId, temaId, estado, modalidad })
  if (!periodoId) return <Vacio titulo="Seleccione un período" />
  return (
    <>
      <PageHeader
        titulo="Postulaciones"
        descripcion="Postulaciones individuales y grupales del período. Acepte, rechace o asigne el tema."
      />
      <ConsultaEstado query={query}>
        {(l) => (
          <TablaPostulaciones
            datos={l}
            filtros={
              <>
                <SelectSimple
                  aria-label="Filtrar por tema"
                  className="sm:w-64"
                  value={temaId}
                  onChange={setTemaId}
                  todos="Todos los temas"
                  opciones={opcionesTemas(todas.data)}
                />
                <SelectSimple
                  aria-label="Filtrar por estado"
                  className="sm:w-44"
                  value={estado}
                  onChange={(v) => setEstado(v as EstadoPostulacion | '')}
                  todos="Todos los estados"
                  opciones={opciones(ESTADO_POSTULACION)}
                />
                <SelectSimple
                  aria-label="Filtrar por modalidad"
                  className="sm:w-40"
                  value={modalidad}
                  onChange={(v) => setModalidad(v as Modalidad | '')}
                  todos="Toda modalidad"
                  opciones={opciones(MODALIDAD)}
                />
              </>
            }
          />
        )}
      </ConsultaEstado>
    </>
  )
}
