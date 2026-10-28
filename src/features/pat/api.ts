import { useQuery } from '@tanstack/react-query'
import { api, oNulo } from '@/api/client'
import {
  documentoPat,
  estudianteResumen,
  plantilla,
  type DocumentoPatB,
  type PersonaB,
  type PlantillaB,
  type UrlFirmadaB,
} from '@/api/adaptadores'
import { K } from '@/api/claves'
import { descargarUrl, useMutacion } from '@/api/mutacion'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import type {
  DocumentoPat,
  EstadoDocumentoPat,
  PlantillaPat,
  ResultadoRevision,
} from '@/types/dominio'

export const usePlantillas = (pid?: string) =>
  useQuery({
    queryKey: [...K.pat, 'plantillas', pid],
    queryFn: async () =>
      (await api.todas<PlantillaB>(`/periodos/${pid}/plantillas-pat`)).map(plantilla),
    enabled: !!pid,
  })

export const usePlantillaVigente = (pid?: string) =>
  useQuery({
    queryKey: [...K.pat, 'plantillas', pid, 'vigente'],
    queryFn: async () => {
      const p = await oNulo(api.get<PlantillaB>(`/periodos/${pid}/plantillas-pat/vigente`))
      return p ? plantilla(p) : null
    },
    enabled: !!pid,
  })

/**
 * Al publicar una versión, el backend la deja como la única vigente del período desde hoy y
 * cierra la vigencia de la anterior. Solo recibe versión y archivo (sin fechas de vigencia).
 */
export const useSubirPlantilla = (pid?: string) =>
  useMutacion({
    fn: async (b: { archivo: File; version: string }): Promise<PlantillaPat> => {
      const fd = new FormData()
      fd.append('version', b.version)
      fd.append('archivo', b.archivo)
      return plantilla(await api.post<PlantillaB>(`/periodos/${pid}/plantillas-pat`, fd))
    },
    invalida: [K.pat],
    exito: 'Plantilla publicada. Es la vigente del período.',
  })

/** RNF-12: el backend devuelve una URL prefirmada de vigencia limitada. Sin `id`, la vigente. */
export async function descargarPlantilla(periodoId: string, id?: string, nombre?: string) {
  const r = await api.get<UrlFirmadaB>(
    `/periodos/${periodoId}/plantillas-pat/${id ? `${id}/descarga` : 'vigente/descarga'}`,
  )
  descargarUrl(r.url, nombre)
}

export async function descargarDocumentoPat(
  periodoId: string,
  doc: Pick<DocumentoPat, 'id' | 'asignacionTemaId' | 'nombreArchivo'>,
) {
  const r = await api.get<UrlFirmadaB>(
    `/periodos/${periodoId}/asignaciones-tema/${doc.asignacionTemaId}/documentos-pat/${doc.id}/descarga`,
  )
  descargarUrl(r.url, doc.nombreArchivo)
}

const listarDocumentos = async (periodoId: string, asignacionId: string) =>
  (
    await api.todas<DocumentoPatB>(
      `/periodos/${periodoId}/asignaciones-tema/${asignacionId}/documentos-pat`,
    )
  )
    .map(documentoPat)
    .sort((a, b) => b.version - a.version)

export const useDocumentosPat = (asignacionId?: string) => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.pat, 'documentos', asignacionId],
    queryFn: () => listarDocumentos(periodoId!, asignacionId!),
    enabled: !!asignacionId && !!periodoId,
  })
}

/** El documento se vincula a la plantilla vigente del período. */
export const useSubirPat = (asignacionId?: string) => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async (archivo: File) => {
      const vigente = await api.get<PlantillaB>(`/periodos/${periodoId}/plantillas-pat/vigente`)
      const fd = new FormData()
      fd.append('plantilla_id', vigente.id)
      fd.append('archivo', archivo)
      return documentoPat(
        await api.post<DocumentoPatB>(
          `/periodos/${periodoId}/asignaciones-tema/${asignacionId}/documentos-pat`,
          fd,
        ),
      )
    },
    invalida: [K.pat, K.me, K.asignaciones],
    exito: (d) => `PAT versión ${d.version} cargado. Quedó pendiente de revisión.`,
  })
}

interface UltimaPatB {
  asignacionTemaId: string
  tema: { id: string; titulo: string }
  participantes: PersonaB[]
  estado: EstadoDocumentoPat | 'SIN_ENTREGA'
  documento: DocumentoPatB | null
}

/**
 * Bandeja de revisión: última versión del PAT de cada trabajo vigente del período, en una sola
 * consulta al backend (GET /periodos/:pid/documentos-pat/ultimas, ADMIN).
 */
export const useBandejaPat = (periodoId?: string, estado?: EstadoDocumentoPat | '') =>
  useQuery({
    queryKey: [...K.pat, 'bandeja', periodoId, estado],
    queryFn: async () =>
      (
        await api.todas<UltimaPatB>(`/periodos/${periodoId}/documentos-pat/ultimas`, {
          estado: estado || undefined,
        })
      )
        .flatMap((u) =>
          u.documento
            ? [
                {
                  ...documentoPat(u.documento),
                  tema: u.tema,
                  integrantes: u.participantes.map(estudianteResumen),
                },
              ]
            : [],
        )
        .sort((a, b) => a.fechaCarga.localeCompare(b.fechaCarga)),
    enabled: !!periodoId,
  })

export const useRevisarPat = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: ({
      id,
      asignacionTemaId,
      resultado,
      observaciones,
    }: {
      id: string
      asignacionTemaId: string
      resultado: ResultadoRevision
      observaciones?: string
    }) =>
      api.post<unknown>(
        `/periodos/${periodoId}/asignaciones-tema/${asignacionTemaId}/documentos-pat/${id}/revision`,
        { resultado, observaciones: observaciones?.trim() || undefined },
      ),
    invalida: [K.pat, K.asignaciones, K.periodos],
    exito: 'Revisión registrada.',
  })
}
