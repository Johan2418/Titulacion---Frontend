import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { UrlFirmadaB } from '@/api/adaptadores'
import { K } from '@/api/claves'
import { descargarUrl, useMutacion } from '@/api/mutacion'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import type { FormatoExportacion, SolicitudExportacion, TipoReporte } from '@/types/dominio'

interface ExportacionB extends Omit<SolicitudExportacion, 'tamanoBytes' | 'solicitadaPor'> {
  /** El backend lo envía como texto (BIGINT) */
  tamanoBytes: string | null
  expirada: boolean
}

const exportacion = (e: ExportacionB): SolicitudExportacion => ({
  id: e.id,
  periodoId: e.periodoId,
  // el backend solo lista las solicitudes propias
  solicitadaPor: { id: '', nombres: '', apellidos: '', email: '' },
  tipoReporte: e.tipoReporte,
  formato: e.formato,
  filtros: e.filtros,
  estado: e.estado,
  tamanoBytes: e.tamanoBytes === null ? null : Number(e.tamanoBytes),
  expiraEn: e.expiraEn,
  fechaSolicitud: e.fechaSolicitud,
  fechaGeneracion: e.fechaGeneracion,
})

/** RF-36: las exportaciones se procesan en segundo plano; se consulta hasta que estén listas. */
export const useExportaciones = () => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.exportaciones, periodoId],
    queryFn: async () =>
      (await api.todas<ExportacionB>(`/periodos/${periodoId}/exportaciones`)).map(exportacion),
    enabled: !!periodoId,
    refetchInterval: (q) =>
      q.state.data?.some((e) => e.estado === 'EN_COLA' || e.estado === 'PROCESANDO') ? 1500 : false,
  })
}

export const useSolicitarExportacion = () =>
  useMutacion({
    fn: ({
      periodoId,
      ...b
    }: {
      tipoReporte: TipoReporte
      formato: FormatoExportacion
      periodoId?: string
      filtros?: Record<string, unknown>
    }) => api.post<{ id: string }>(`/periodos/${periodoId}/exportaciones`, b),
    invalida: [K.exportaciones],
    exito: 'Solicitud registrada. El archivo se generará en segundo plano.',
  })

/** Vuelve a encolar una solicitud FALLIDA (solo el solicitante; el backend responde 409 si no lo está). */
export const useReintentarExportacion = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: (id: string) =>
      api.post<{ id: string }>(`/periodos/${periodoId}/exportaciones/${id}/reintentar`, {}),
    invalida: [K.exportaciones],
    exito: 'Solicitud reenviada. El archivo se generará en segundo plano.',
  })
}

export async function descargarExportacion(periodoId: string, id: string) {
  const r = await api.get<UrlFirmadaB>(`/periodos/${periodoId}/exportaciones/${id}/descarga`)
  descargarUrl(r.url)
}
