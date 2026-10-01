import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import { aFormData, useMutacion } from '@/api/mutacion'
import type {
  CargaDocente,
  ConfigCargaTutorial,
  Docente,
  Estudiante,
  EstudianteHabilitado,
  LineaInvestigacion,
  LoteImportacion,
  SituacionIngreso,
} from '@/types/dominio'

// ── Líneas ──
export const useLineas = () =>
  useQuery({
    queryKey: K.lineas,
    queryFn: () => api.get<LineaInvestigacion[]>('/lineas-investigacion'),
  })

export const useGuardarLinea = () =>
  useMutacion({
    fn: ({ id, ...b }: Partial<LineaInvestigacion>) =>
      id
        ? api.patch<LineaInvestigacion>(`/lineas-investigacion/${id}`, b)
        : api.post<LineaInvestigacion>('/lineas-investigacion', b),
    invalida: [K.lineas],
    exito: 'Línea de investigación guardada.',
  })

// ── Docentes ──
export const useDocentes = (filtros: { habilitadoTutoria?: boolean } = {}) =>
  useQuery({
    queryKey: [...K.docentes, filtros],
    queryFn: () => api.get<Docente[]>('/docentes', filtros),
  })

export type DocenteInput = Pick<
  Docente,
  'cedula' | 'nombres' | 'apellidos' | 'email' | 'habilitadoTutoria'
> & {
  tituloAcademico?: string
  departamento?: string
}

export const useGuardarDocente = () =>
  useMutacion({
    fn: ({ id, ...b }: Partial<DocenteInput> & { id?: string; estado?: string }) =>
      id ? api.patch<Docente>(`/docentes/${id}`, b) : api.post<Docente>('/docentes', b),
    invalida: [K.docentes, K.carga],
    exito: 'Docente guardado.',
  })

export const useImportarDocentes = () =>
  useMutacion({
    fn: (archivo: File) => api.post<LoteImportacion>('/docentes/importar', aFormData({ archivo })),
    invalida: [K.lotes],
    exito: 'Importación encolada.',
  })

// ── Estudiantes / habilitados ──
export const useEstudiantes = (texto: string) =>
  useQuery({
    queryKey: [...K.estudiantes, texto],
    queryFn: () => api.get<Estudiante[]>('/estudiantes', { q: texto }),
  })

export const useHabilitados = (pid?: string, opciones: { sinGrupo?: boolean } = {}) =>
  useQuery({
    queryKey: [...K.habilitados, pid, opciones],
    queryFn: () =>
      api.get<EstudianteHabilitado[]>(`/periodos/${pid}/estudiantes-habilitados`, opciones),
    enabled: !!pid,
  })

export const useHabilitar = (pid?: string) =>
  useMutacion({
    fn: (b: {
      estudianteId: string
      condicionIngreso: 'REGULAR' | 'CONDICIONADO'
      requisitoPendiente?: string
    }) => api.post<EstudianteHabilitado>(`/periodos/${pid}/estudiantes-habilitados`, b),
    invalida: [K.habilitados, K.periodos],
    exito: 'Estudiante habilitado.',
  })

export const useActualizarHabilitado = () =>
  useMutacion({
    fn: ({
      id,
      ...b
    }: { id: string } & Partial<
      Pick<EstudianteHabilitado, 'estado' | 'condicionIngreso' | 'requisitoPendiente'>
    >) => api.patch<EstudianteHabilitado>(`/estudiantes-habilitados/${id}`, b),
    invalida: [K.habilitados, K.periodos],
    exito: 'Habilitación actualizada.',
  })

export const useResolverIngreso = () =>
  useMutacion({
    fn: ({
      id,
      ...b
    }: {
      id: string
      situacionIngreso: Exclude<SituacionIngreso, 'PENDIENTE'>
      observacion?: string
    }) =>
      api.post<EstudianteHabilitado & { efectos?: string[] }>(
        `/estudiantes-habilitados/${id}/resolver-ingreso`,
        b,
      ),
    invalida: [K.habilitados, K.periodos, K.grupos, K.asignaciones, K.postulaciones, K.temas],
    exito: (r) =>
      r.efectos?.length ? `Ingreso resuelto. ${r.efectos.join(' ')}` : 'Ingreso resuelto.',
  })

export const useImportarHabilitados = (pid?: string) =>
  useMutacion({
    fn: (archivo: File) =>
      api.post<LoteImportacion>(
        `/periodos/${pid}/estudiantes-habilitados/importar`,
        aFormData({ archivo }),
      ),
    invalida: [K.lotes],
    exito: 'Importación encolada; se procesará en segundo plano.',
  })

export const useLotes = (filtros: { tipo?: string; periodoId?: string }) =>
  useQuery({
    queryKey: [...K.lotes, filtros],
    queryFn: () => api.get<LoteImportacion[]>('/lotes-importacion', filtros),
    refetchInterval: (q) => (q.state.data?.some((l) => l.estado === 'EN_PROCESO') ? 1500 : false),
  })

// ── Carga tutorial ──
export const useConfigCarga = (pid?: string) =>
  useQuery({
    queryKey: [...K.carga, 'config', pid],
    queryFn: () => api.get<ConfigCargaTutorial[]>(`/periodos/${pid}/config-carga`),
    enabled: !!pid,
  })

export const useGuardarConfigCarga = (pid?: string) =>
  useMutacion({
    fn: (b: { docenteId?: string | null; maxTrabajos: number; bloquearAlSuperar: boolean }) =>
      api.put<ConfigCargaTutorial>(`/periodos/${pid}/config-carga`, b),
    invalida: [K.carga],
    exito: 'Configuración de carga guardada.',
  })

export const useEliminarConfigCarga = () =>
  useMutacion({
    fn: (id: string) => api.delete<void>(`/config-carga/${id}`),
    invalida: [K.carga],
    exito: 'Límite específico eliminado; se aplicará el límite global.',
  })

export const useCargaTutorial = (pid?: string) =>
  useQuery({
    queryKey: [...K.carga, 'docentes', pid],
    queryFn: () => api.get<CargaDocente[]>(`/periodos/${pid}/carga-tutorial`),
    enabled: !!pid,
  })
