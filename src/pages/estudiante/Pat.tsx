import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { useMiAsignacion } from '@/features/asignaciones/api'
import { AsistenteEntregaPat } from '@/features/pat/AsistenteEntregaPat'
import { usePeriodo } from '@/features/periodos/PeriodoContext'

export default function Pat() {
  const { periodoId, periodo } = usePeriodo()
  const asignacion = useMiAsignacion(periodoId)
  return (
    <>
      <PageHeader
        titulo="Entregar PAT"
        descripcion="El sistema completa tus datos académicos; tú solo agregas lo que falta, generas el PDF y lo entregas."
      />
      <ConsultaEstado query={asignacion}>
        {(a) =>
          !a || !periodoId ? (
            <Vacio titulo="Sin tema asignado" />
          ) : (
            <AsistenteEntregaPat
              key={`${periodoId}-${a.id}`}
              pid={periodoId}
              aid={a.id}
              habilitado={
                ['POSTULACION_ABIERTA', 'POSTULACION_CERRADA', 'EN_CURSO'].includes(periodo?.estado ?? '') &&
                a.estado === 'VIGENTE'
              }
            />
          )
        }
      </ConsultaEstado>
    </>
  )
}
