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

/** Fuente de un valor autocompletado (contrato `GET .../pat/me/resumen`). */
export interface ValorAutomaticoPat<T> {
  valor: T
  fuente: string
}
export interface TutorPropuestoPatB {
  id: string
  ordenPrioridad: number
  docenteId: string
  nombres: string
  apellidos: string
  elegibleActualmente: boolean
  esProponenteTema: boolean
}
export interface TutorResueltoPat {
  docenteId: string
  nombres: string
  apellidos: string
  tutorPropuestoId: string | null
}
export interface IntegrantePat {
  id: string
  nombres: string
  apellidos: string
  matricula?: string | null
}
/**
 * Respuesta de `GET .../pat/me/resumen`. Las claves llegan en camelCase (cliente); los valores de
 * `pendientes` conservan el nombre del backend (p. ej. `correo_personal`).
 */
export interface ResumenPatB {
  asignacionTemaId: string
  estudianteId: string
  automaticos: {
    nombres: ValorAutomaticoPat<string | null>
    apellidos: ValorAutomaticoPat<string | null>
    cedula: ValorAutomaticoPat<string | null>
    matricula: ValorAutomaticoPat<string | null>
    correoInstitucional: ValorAutomaticoPat<string | null>
    carrera: ValorAutomaticoPat<string | null>
    facultad: ValorAutomaticoPat<string | null>
    periodo: ValorAutomaticoPat<{ codigo: string | null; nombre: string | null } | null>
    extensionPat: ValorAutomaticoPat<string | null>
    nivel: ValorAutomaticoPat<number | null>
    curso: ValorAutomaticoPat<string | null>
    temaTitulo: ValorAutomaticoPat<string | null>
    problematicaSugerida: ValorAutomaticoPat<string | null>
    lineaInvestigacion: ValorAutomaticoPat<{ id: string; codigo: string; nombre: string } | null>
    articulacionesSugeridas: ValorAutomaticoPat<string[]>
    modalidad: ValorAutomaticoPat<'INDIVIDUAL' | 'GRUPAL' | null>
    tipoTema: ValorAutomaticoPat<string | null>
    integrantes: ValorAutomaticoPat<IntegrantePat[]>
    modalidadAcademica: ValorAutomaticoPat<string | null>
    tutor: ValorAutomaticoPat<TutorResueltoPat | null>
  }
  editables: {
    personal: Record<string, unknown>
    contenido: {
      problematica: string
      problematicaPersonalizada: boolean
      confirmaProblematica: boolean
      articulaciones: string[]
      tutorPropuestoId: string | null
    }
  }
  pendientes: string[]
  listoParaGenerar: boolean
  tutoresPropuestos: {
    tutorVigente: { docenteId: string; nombres: string; apellidos: string } | null
    data: TutorPropuestoPatB[]
  }
}
export type EstadoGeneracionPat = 'EN_COLA' | 'PROCESANDO' | 'LISTO' | 'FALLIDO'
export interface GeneracionPatB {
  id: string
  estado: EstadoGeneracionPat
  ciclo?: number
  error?: string | null
  solicitadaEn?: string
  procesandoDesde?: string | null
  generadaEn?: string | null
  tamanoBytes?: number | null
  /** Documento GENERADO entregado desde esta generación, si existe. */
  documentoPatId?: string | null
}
export const generacionActiva = (g?: Pick<GeneracionPatB, 'estado'> | null) =>
  g?.estado === 'EN_COLA' || g?.estado === 'PROCESANDO'

const rutaPat = (pid: string, aid: string) => `/periodos/${pid}/asignaciones-tema/${aid}/pat/me`
const clavePat = (usuarioId: string, pid?: string, aid?: string) =>
  [...K.pat, 'me', usuarioId, pid, aid] as const

export const useResumenPat = (pid?: string, aid?: string) => {
  const usuario = useUsuario()
  return useQuery({
    queryKey: [...clavePat(usuario.id, pid, aid), 'resumen'],
    queryFn: () => api.get<ResumenPatB>(`${rutaPat(pid!, aid!)}/resumen`),
    enabled: !!pid && !!aid,
  })
}

/** Datos personales: se guardan una vez por estudiante y se reutilizan en cada PAT. */
export const useGuardarDatosPat = () =>
  useMutacion({
    fn: (datos: Record<string, unknown>) =>
      api.patch<{ pendientes: string[] }>('/estudiantes/me/datos-pat', datos),
    invalida: [K.pat],
    silenciarError: () => true,
  })

export const useGuardarContenidoPat = (pid?: string, aid?: string) =>
  useMutacion({
    fn: (contenido: Record<string, unknown>) =>
      api.patch<{ pendientes: string[] }>(rutaPat(pid!, aid!), contenido),
    invalida: [K.pat],
    silenciarError: () => true,
  })

/** Elegir otra propuesta de tutor (solo sin tutor vigente); `null` vuelve a la predeterminada. */
export const useElegirTutorPat = (pid?: string, aid?: string) =>
  useMutacion({
    fn: (tutorPropuestoId: string | null) =>
      api.patch<unknown>(rutaPat(pid!, aid!), { tutorPropuestoId }),
    invalida: [K.pat],
    exito: 'Tutor propuesto actualizado.',
  })

/** Historial de generaciones propias (más reciente primero); reemplaza el uso de sessionStorage. */
export const useGeneracionesPat = (pid?: string, aid?: string) => {
  const usuario = useUsuario()
  return useQuery({
    queryKey: [...clavePat(usuario.id, pid, aid), 'generaciones'],
    queryFn: async () =>
      (
        await api.get<{ data: GeneracionPatB[]; total: number }>(
          `${rutaPat(pid!, aid!)}/generaciones`,
        )
      ).data,
    enabled: !!pid && !!aid,
  })
}

/** Consulta una generación y la vuelve a consultar cada 3 s mientras está en cola o procesando. */
export const useGeneracionPat = (pid?: string, aid?: string, id?: string) => {
  const usuario = useUsuario()
  return useQuery({
    queryKey: [...clavePat(usuario.id, pid, aid), 'generacion', id],
    queryFn: () => api.get<GeneracionPatB>(`${rutaPat(pid!, aid!)}/generaciones/${id}`),
    enabled: !!pid && !!aid && !!id,
    refetchInterval: (q) => (generacionActiva(q.state.data) ? 3000 : false),
  })
}

export const useSolicitarGeneracionPat = (pid?: string, aid?: string) =>
  useMutacion({
    fn: () => api.post<GeneracionPatB>(`${rutaPat(pid!, aid!)}/generaciones`, {}),
    invalida: [K.pat],
    exito: 'Generación del PAT solicitada.',
    // el paso «Entregar» muestra el error en línea (pendientes incluidos)
    silenciarError: () => true,
  })

export const useReintentarGeneracionPat = (pid?: string, aid?: string) =>
  useMutacion({
    fn: (id: string) =>
      api.post<GeneracionPatB>(`${rutaPat(pid!, aid!)}/generaciones/${id}/reintentar`, {}),
    invalida: [K.pat],
    exito: 'Generación reintentada.',
  })

/** Entrega directa del PDF generado, sin firma (`origen=GENERADO`). */
export const useEntregarGeneracionPat = (pid?: string, aid?: string) =>
  useMutacion({
    fn: async (id: string) =>
      documentoPat(
        await api.post<DocumentoPatB>(`${rutaPat(pid!, aid!)}/generaciones/${id}/entregar`, {}),
      ),
    invalida: [K.pat, K.me, K.asignaciones],
    exito: (d) => `PAT versión ${d.version} entregado. Quedó pendiente de revisión.`,
  })

export async function descargarGeneracionPat(pid: string, aid: string, id: string) {
  const r = await api.get<UrlFirmadaB>(`${rutaPat(pid, aid)}/generaciones/${id}/descarga`)
  descargarUrl(r.url, 'PAT-sin-firma.pdf')
}

/** Word institucional PAT-04-F-002; el nombre (con la cédula) lo fija el backend en la descarga. */
export async function descargarGeneracionPatWord(pid: string, aid: string, id: string) {
  const r = await api.get<UrlFirmadaB>(
    `${rutaPat(pid, aid)}/generaciones/${id}/descarga`,
    { formato: 'docx' },
  )
  descargarUrl(r.url)
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
