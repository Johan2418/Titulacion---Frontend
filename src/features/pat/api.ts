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
import { useUsuario } from '@/auth/AuthProvider'
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

/**
 * Un exintegrante del grupo recibe 404 en las rutas de la asignación (ya no le pertenece):
 * se trata como "sin documentos" para que la página muestre su estado vacío y no un error.
 */
export const listarDocumentos = async (periodoId: string, asignacionId: string) =>
  (
    (await oNulo(
      api.todas<DocumentoPatB>(
        `/periodos/${periodoId}/asignaciones-tema/${asignacionId}/documentos-pat`,
      ),
    )) ?? []
  )
    .map(documentoPat)
    .sort((a, b) => b.version - a.version)

export const useDocumentosPat = (asignacionId?: string) => {
  const { periodoId } = usePeriodo()
  const usuario = useUsuario()
  return useQuery({
    queryKey: [...K.pat, 'documentos', usuario.id, periodoId, asignacionId],
    queryFn: () => listarDocumentos(periodoId!, asignacionId!),
    enabled: !!asignacionId && !!periodoId,
  })
}

/** La entrega firmada se vincula a una generación individual. */
export const useSubirPat = (asignacionId?: string) => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({ archivo, generacionId }: { archivo: File; generacionId: string }) => {
      const fd = new FormData()
      fd.append('generacion_id', generacionId)
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

export interface DatosPatB {
  estudianteId: string
  identidad: Record<string, unknown> | null
  datos: Record<string, unknown>
  pendientes: string[]
}
export interface ContenidoPatB {
  asignacionTemaId: string
  contenido: Record<string, unknown>
  problematicaSugerida: string | null
  pendientes: string[]
}
export interface GeneracionPatB {
  id: string
  estado: 'EN_COLA' | 'PROCESANDO' | 'LISTO' | 'FALLIDO'
  error?: string | null
}
const rutaPat = (pid: string, aid: string) => `/periodos/${pid}/asignaciones-tema/${aid}/pat/me`

export const useDatosPat = () => {
  const usuario = useUsuario()
  return useQuery({
    queryKey: [...K.pat, 'datos-personales', usuario.id],
    queryFn: () => api.get<DatosPatB>('/estudiantes/me/datos-pat'),
  })
}

export const useGuardarDatosPat = () =>
  useMutacion({
    fn: (datos: Record<string, unknown>) =>
      api.patch<DatosPatB>('/estudiantes/me/datos-pat', datos),
    invalida: [K.pat],
    exito: 'Datos personales guardados.',
  })

export const useContenidoPat = (pid?: string, aid?: string) => {
  const usuario = useUsuario()
  return useQuery({
    queryKey: [...K.pat, 'contenido', usuario.id, pid, aid],
    queryFn: () => api.get<ContenidoPatB>(`${rutaPat(pid!, aid!)}`),
    enabled: !!pid && !!aid,
  })
}

export const useGuardarContenidoPat = (pid?: string, aid?: string) =>
  useMutacion({
    fn: (contenido: Record<string, unknown>) =>
      api.patch<ContenidoPatB>(rutaPat(pid!, aid!), contenido),
    invalida: [K.pat],
    exito: 'Contenido del PAT guardado.',
  })

export const useSolicitarGeneracionPat = (pid?: string, aid?: string) =>
  useMutacion({
    fn: (tutorPropuestoId?: string) =>
      api.post<GeneracionPatB>(`${rutaPat(pid!, aid!)}/generaciones`, {
        tutor_propuesto_id: tutorPropuestoId,
      }),
    invalida: [K.pat],
    exito: 'Generación del PAT solicitada.',
  })

export const useGeneracionPat = (pid?: string, aid?: string, id?: string) => {
  const usuario = useUsuario()
  return useQuery({
    queryKey: [...K.pat, 'generacion', usuario.id, pid, aid, id],
    queryFn: () => api.get<GeneracionPatB>(`${rutaPat(pid!, aid!)}/generaciones/${id}`),
    enabled: !!pid && !!aid && !!id,
    refetchInterval: (q) =>
      ['EN_COLA', 'PROCESANDO'].includes(q.state.data?.estado ?? '') ? 3000 : false,
  })
}

export async function descargarGeneracionPat(pid: string, aid: string, id: string) {
  const r = await api.get<UrlFirmadaB>(`${rutaPat(pid, aid)}/generaciones/${id}/descarga`)
  descargarUrl(r.url, 'PAT-sin-firma.pdf')
}

export interface UltimaPatB {
  asignacionTemaId: string
  tema: { id: string; titulo: string }
  participantes: PersonaB[]
  estudiante: PersonaB
  estado: EstadoDocumentoPat | 'SIN_ENTREGA'
  documento: DocumentoPatB | null
}

export type FilaBandejaPat = {
  asignacionTemaId: string
  estudiante: ReturnType<typeof estudianteResumen>
  tema: { id: string; titulo: string }
  estado: EstadoDocumentoPat | 'SIN_ENTREGA'
  documento: DocumentoPat | null
}

export const adaptarFilaBandejaPat = (u: UltimaPatB): FilaBandejaPat => ({
  asignacionTemaId: u.asignacionTemaId,
  estudiante: estudianteResumen(u.estudiante),
  tema: u.tema,
  estado: u.estado,
  documento: u.documento
    ? { ...documentoPat(u.documento), tema: u.tema, integrantes: [estudianteResumen(u.estudiante)] }
    : null,
})

/**
 * Bandeja de revisión: última versión del PAT de cada trabajo vigente del período, en una sola
 * consulta al backend (GET /periodos/:pid/documentos-pat/ultimas, ADMIN).
 */
export const useBandejaPat = (
  periodoId?: string,
  estado?: EstadoDocumentoPat | 'SIN_ENTREGA' | '',
) =>
  useQuery({
    queryKey: [...K.pat, 'bandeja', periodoId, estado],
    queryFn: async () =>
      (
        await api.todas<UltimaPatB>(`/periodos/${periodoId}/documentos-pat/ultimas`, {
          estado: estado || undefined,
        })
      ).map(adaptarFilaBandejaPat),
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
