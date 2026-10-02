import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import { aFormData, descargarUrl, useMutacion } from '@/api/mutacion'
import type {
  DocumentoPat,
  EstadoDocumentoPat,
  PlantillaPat,
  ResultadoRevision,
} from '@/types/dominio'

interface UrlFirmada {
  url: string
  nombreArchivo: string
  expiraEn: string
}

export const usePlantillas = (pid?: string) =>
  useQuery({
    queryKey: [...K.pat, 'plantillas', pid],
    queryFn: () => api.get<PlantillaPat[]>(`/periodos/${pid}/plantillas-pat`),
    enabled: !!pid,
  })

export const usePlantillaVigente = (pid?: string) =>
  useQuery({
    queryKey: [...K.pat, 'plantillas', pid, 'vigente'],
    queryFn: () => api.get<PlantillaPat | null>(`/periodos/${pid}/plantillas-pat/vigente`),
    enabled: !!pid,
  })

export const useSubirPlantilla = (pid?: string) =>
  useMutacion({
    fn: (b: {
      archivo: File
      version: string
      activar: boolean
      fechaVigenciaInicio?: string
      fechaVigenciaFin?: string
    }) => api.post<PlantillaPat>(`/periodos/${pid}/plantillas-pat`, aFormData(b)),
    invalida: [K.pat],
    exito: 'Plantilla publicada.',
  })

export const useActivarPlantilla = () =>
  useMutacion({
    fn: (id: string) => api.post<PlantillaPat>(`/plantillas-pat/${id}/activar`),
    invalida: [K.pat],
    exito: 'Plantilla activada. Es la única vigente del período.',
  })

/** RNF-12: el backend devuelve una URL prefirmada de vigencia limitada. */
export async function descargarPlantilla(id: string) {
  const r = await api.get<UrlFirmada>(`/plantillas-pat/${id}/descarga`)
  descargarUrl(r.url, r.nombreArchivo)
}

export async function descargarDocumentoPat(id: string) {
  const r = await api.get<UrlFirmada>(`/documentos-pat/${id}/descarga`)
  descargarUrl(r.url, r.nombreArchivo)
}

export const useDocumentosPat = (asignacionId?: string) =>
  useQuery({
    queryKey: [...K.pat, 'documentos', asignacionId],
    queryFn: () => api.get<DocumentoPat[]>(`/asignaciones-tema/${asignacionId}/documentos-pat`),
    enabled: !!asignacionId,
  })

export const useSubirPat = (asignacionId?: string) =>
  useMutacion({
    fn: (archivo: File) =>
      api.post<DocumentoPat>(
        `/asignaciones-tema/${asignacionId}/documentos-pat`,
        aFormData({ archivo }),
      ),
    invalida: [K.pat, K.me, K.asignaciones],
    exito: (d) => `PAT versión ${d.version} cargado. Quedó pendiente de revisión.`,
  })

export const useBandejaPat = (periodoId?: string, estado?: EstadoDocumentoPat | '') =>
  useQuery({
    queryKey: [...K.pat, 'bandeja', periodoId, estado],
    queryFn: () => api.get<DocumentoPat[]>('/documentos-pat', { periodoId, estado }),
    enabled: !!periodoId,
  })

export const useRevisarPat = () =>
  useMutacion({
    fn: ({ id, ...b }: { id: string; resultado: ResultadoRevision; observaciones?: string }) =>
      api.post<DocumentoPat>(`/documentos-pat/${id}/revision`, b),
    invalida: [K.pat, K.asignaciones, K.periodos],
    exito: 'Revisión registrada.',
  })
