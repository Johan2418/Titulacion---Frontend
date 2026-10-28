import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Pagina } from '@/api/client'
import {
  cargaDocente,
  configCarga,
  docente,
  estudiante,
  habilitado,
  loteImportacion,
  type CargaPeriodoB,
  type ConfigCargaB,
  type DocenteB,
  type EstudianteB,
  type EstadoPreparacionB,
  type HabilitadoB,
  type ImportacionHistorialB,
} from '@/api/adaptadores'
import { K } from '@/api/claves'
import { descargarUrl, useMutacion } from '@/api/mutacion'
import { useUsuario } from '@/auth/AuthProvider'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
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

/** Quita las claves `undefined` para no enviar propiedades que el backend no espera. */
const definidos = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>

// ── Líneas ──
export const useLineas = () =>
  useQuery({
    queryKey: K.lineas,
    queryFn: () => api.todas<LineaInvestigacion>('/lineas-investigacion'),
  })

export const useGuardarLinea = () =>
  useMutacion({
    fn: ({ id, codigo, nombre, descripcion, activa }: Partial<LineaInvestigacion>) =>
      id
        ? api.patch<LineaInvestigacion>(
            `/lineas-investigacion/${id}`,
            definidos({ codigo, nombre, descripcion, activa }),
          )
        : api.post<LineaInvestigacion>(
            '/lineas-investigacion',
            definidos({ codigo, nombre, descripcion: descripcion || undefined }),
          ),
    invalida: [K.lineas],
    exito: 'Línea de investigación guardada.',
  })

// ── Docentes ──
const listarDocentes = async () => (await api.todas<DocenteB>('/docentes')).map(docente)

/** Catálogo de docentes (solo ADMIN en el backend). */
export const useDocentes = (filtros: { habilitadoTutoria?: boolean } = {}) =>
  useQuery({
    queryKey: [...K.docentes],
    queryFn: listarDocentes,
    select: (ds: Docente[]) =>
      filtros.habilitadoTutoria === undefined
        ? ds
        : ds.filter((d) => d.habilitadoTutoria === filtros.habilitadoTutoria),
  })

export type DocenteInput = Pick<
  Docente,
  'cedula' | 'nombres' | 'apellidos' | 'email' | 'habilitadoTutoria'
> & {
  tituloAcademico?: string
  departamento?: string
}

/**
 * Alta atómica (cuenta DOCENTE + clave temporal por correo + perfil en una sola llamada) o
 * edición. El correo es el usuario de acceso y nunca se envía al editar.
 */
export const useGuardarDocente = () =>
  useMutacion({
    fn: async ({
      id,
      email,
      ...b
    }: Partial<DocenteInput> & { id?: string; estado?: Docente['estado'] }) =>
      docente(
        id
          ? await api.patch<DocenteB>(
              `/docentes/${id}`,
              definidos({
                nombres: b.nombres?.trim(),
                apellidos: b.apellidos?.trim(),
                cedula: b.cedula?.trim(),
                tituloAcademico: b.tituloAcademico?.trim() || undefined,
                departamento: b.departamento?.trim() || undefined,
                habilitadoTutoria: b.habilitadoTutoria,
                estado: b.estado,
              }),
            )
          : await api.post<DocenteB>('/docentes', {
              email: email?.trim(),
              nombres: b.nombres?.trim(),
              apellidos: b.apellidos?.trim(),
              cedula: b.cedula?.trim(),
              tituloAcademico: b.tituloAcademico?.trim() ?? '',
              departamento: b.departamento?.trim() ?? '',
              habilitadoTutoria: b.habilitadoTutoria ?? false,
            }),
      ),
    invalida: [K.docentes, K.carga],
    exito: (_d, v) =>
      v.id ? 'Docente actualizado.' : 'Docente registrado. Recibirá por correo su clave temporal.',
  })

const RUTA_IMPORTACION_DOCENTES = '/importaciones/docentes'

/** Descarga la plantilla XLSX de docentes (requiere sesión ADMIN). */
export async function descargarPlantillaDocentes() {
  const blob = await api.blob(`${RUTA_IMPORTACION_DOCENTES}/plantilla`)
  const url = URL.createObjectURL(blob)
  try {
    descargarUrl(url, 'plantilla-docentes-titulacion.xlsx')
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/** Descarga la plantilla XLSX de estudiantes (requiere sesión ADMIN). */
export async function descargarPlantillaEstudiantes() {
  const blob = await api.blob('/importaciones/estudiantes/plantilla')
  const url = URL.createObjectURL(blob)
  try {
    descargarUrl(url, 'plantilla-estudiantes-titulacion.xlsx')
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/** Reenvía el correo de acceso con una nueva clave temporal (ADMIN). */
export const useReenviarAcceso = () =>
  useMutacion({
    fn: (usuarioId: string) => api.post<unknown>(`/usuarios/${usuarioId}/reenviar-acceso`),
    invalida: [K.docentes],
    exito: 'Se reenvió el correo de acceso con una nueva clave temporal.',
  })

// ── Estudiantes / habilitados ──
const listarEstudiantes = async () => (await api.todas<EstudianteB>('/estudiantes')).map(estudiante)

const coincide = (e: Estudiante, texto: string) =>
  `${e.nombres} ${e.apellidos} ${e.cedula} ${e.matricula} ${e.email}`
    .toLowerCase()
    .includes(texto.trim().toLowerCase())

export const useEstudiantes = (texto: string) =>
  useQuery({
    queryKey: [...K.estudiantes],
    queryFn: listarEstudiantes,
    select: (es: Estudiante[]) => (texto.trim() ? es.filter((e) => coincide(e, texto)) : es),
  })

export const useHabilitados = (pid?: string, opciones: { sinGrupo?: boolean } = {}) => {
  const { rol } = useUsuario()
  return useQuery({
    queryKey: [...K.habilitados, pid, opciones, rol],
    queryFn: async (): Promise<EstudianteHabilitado[]> => {
      // RF-02: el estudiante solo ve a los compañeros que puede invitar
      if (opciones.sinGrupo && rol === 'ESTUDIANTE')
        return (
          await api.todas<HabilitadoB>(`/periodos/${pid}/habilitados/candidatos-invitacion`)
        ).map(habilitado)
      // el backend ya incluye correo, cédula, carrera y nivel en cada habilitación (ADMIN)
      return (await api.todas<HabilitadoB>(`/periodos/${pid}/habilitados`)).map(habilitado)
    },
    enabled: !!pid,
  })
}

export const useHabilitar = (pid?: string) =>
  useMutacion({
    fn: async (b: {
      estudianteId: string
      condicionIngreso: 'REGULAR' | 'CONDICIONADO'
      requisitoPendiente?: string
    }) =>
      habilitado(
        await api.post<HabilitadoB>(`/periodos/${pid}/habilitados`, {
          estudianteId: b.estudianteId,
          condicionIngreso: b.condicionIngreso,
          requisitoPendiente:
            b.condicionIngreso === 'CONDICIONADO' ? b.requisitoPendiente : undefined,
        }),
      ),
    invalida: [K.habilitados, K.periodos],
    exito: 'Estudiante habilitado.',
  })

/**
 * Edita la condición de ingreso. El backend siempre deja la habilitación en HABILITADO:
 * REGULAR queda ADMITIDO y CONDICIONADO queda PENDIENTE con su requisito.
 */
export const useActualizarHabilitado = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({
      id,
      condicionIngreso,
      requisitoPendiente,
    }: {
      id: string
      condicionIngreso: 'REGULAR' | 'CONDICIONADO'
      requisitoPendiente?: string | null
    }): Promise<EstudianteHabilitado> =>
      habilitado(
        await api.patch<HabilitadoB>(`/periodos/${periodoId}/habilitados/${id}`, {
          condicionIngreso,
          requisitoPendiente:
            condicionIngreso === 'CONDICIONADO' ? requisitoPendiente?.trim() : null,
        }),
      ),
    invalida: [K.habilitados, K.periodos],
    exito: 'Habilitación actualizada.',
  })
}

export const useResolverIngreso = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({
      id,
      situacionIngreso,
      observacion,
    }: {
      id: string
      situacionIngreso: Exclude<SituacionIngreso, 'PENDIENTE'>
      observacion?: string
    }): Promise<EstudianteHabilitado & { efectos?: string[] }> =>
      habilitado(
        await api.post<HabilitadoB>(`/periodos/${periodoId}/habilitados/${id}/resolver-ingreso`, {
          situacionIngreso,
          observacionIngreso: observacion || undefined,
        }),
      ),
    invalida: [K.habilitados, K.periodos, K.grupos, K.asignaciones, K.postulaciones, K.temas],
    exito: (r) =>
      r.efectos?.length ? `Ingreso resuelto. ${r.efectos.join(' ')}` : 'Ingreso resuelto.',
  })
}

// ── Importación de estudiantes (Excel) ──
/**
 * El backend valida el archivo en segundo plano (preparación) y luego se confirma. El historial
 * (incluidas las preparaciones vencidas) se consulta en el backend, no en el navegador.
 */
interface PreparacionB {
  id: string
  estado: EstadoPreparacionB
}

const rutaPreparaciones = (tipo: LoteImportacion['tipo'], periodoId?: string) =>
  tipo === 'DOCENTES'
    ? RUTA_IMPORTACION_DOCENTES
    : `/periodos/${periodoId}/importaciones/estudiantes`

/** Cantidad de importaciones recientes que se muestran (primera página del historial). */
const LIMITE_HISTORIAL = 20

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Envía el archivo, espera la validación y, si no hay errores, confirma la carga. */
async function validarYConfirmar(
  tipo: LoteImportacion['tipo'],
  archivo: File,
  periodoId?: string,
): Promise<LoteImportacion> {
  const base = rutaPreparaciones(tipo, periodoId)
  const fd = new FormData()
  fd.append('archivo', archivo)
  const { id } = await api.post<{ id: string }>(`${base}/validar`, fd)
  let prep = await api.get<PreparacionB>(`${base}/${id}`)
  for (let i = 0; prep.estado === 'VALIDANDO' && i < 40; i++) {
    await esperar(1500)
    prep = await api.get<PreparacionB>(`${base}/${id}`)
  }
  if (prep.estado === 'LISTA') await api.post(`${base}/${id}/confirmar`, {})
  return buscarEnHistorial(tipo, id, periodoId)
}

/** Devuelve la preparación desde el historial (incluye contadores y errores por fila). */
async function buscarEnHistorial(
  tipo: LoteImportacion['tipo'],
  id: string,
  periodoId?: string,
): Promise<LoteImportacion> {
  const r = await api.get<Pagina<ImportacionHistorialB>>(rutaPreparaciones(tipo, periodoId), {
    page: 1,
    limit: LIMITE_HISTORIAL,
  })
  const item = r.data.find((p) => p.id === id)
  if (!item) throw new Error('No se encontró la importación en el historial.')
  return loteImportacion(item)
}

/** Importación de docentes con la plantilla XLSX propia; no depende del período. */
export const useImportarDocentes = () =>
  useMutacion({
    fn: (archivo: File) => validarYConfirmar('DOCENTES', archivo),
    invalida: [K.lotes, K.docentes],
    exito: (l) =>
      l.estado === 'FALLIDO'
        ? 'El archivo tiene errores; revise el detalle en el diálogo de importación.'
        : 'Importación confirmada; se procesará en segundo plano.',
  })

export const useImportarHabilitados = (pid?: string) =>
  useMutacion({
    fn: (archivo: File) => validarYConfirmar('ESTUDIANTES', archivo, pid),
    invalida: [K.lotes, K.habilitados],
    exito: (l) =>
      l.estado === 'FALLIDO'
        ? 'El archivo tiene errores; revise el detalle en el diálogo de importación.'
        : 'Importación confirmada; se procesará en segundo plano.',
  })

/**
 * Historial reciente de importaciones desde el backend (más recientes primero). Mientras alguna
 * está en proceso se consulta cada 1,5 s; al completarse se refresca la tabla correspondiente.
 */
export const useLotes = (filtros: { tipo?: string; periodoId?: string }) => {
  const qc = useQueryClient()
  const tipo: LoteImportacion['tipo'] = filtros.tipo === 'DOCENTES' ? 'DOCENTES' : 'ESTUDIANTES'
  const queryKey = [...K.lotes, filtros]
  return useQuery({
    queryKey,
    enabled: tipo === 'DOCENTES' || !!filtros.periodoId,
    queryFn: async () => {
      if (filtros.tipo && filtros.tipo !== tipo) return []
      const r = await api.get<Pagina<ImportacionHistorialB>>(
        rutaPreparaciones(tipo, filtros.periodoId),
        { page: 1, limit: LIMITE_HISTORIAL },
      )
      const lotes = r.data.map(loteImportacion)
      // la carga confirmada termina en segundo plano: al completarse se refresca la tabla
      const enProceso = new Set(
        (qc.getQueryData<LoteImportacion[]>(queryKey) ?? [])
          .filter((l) => l.estado === 'EN_PROCESO')
          .map((l) => l.id),
      )
      if (lotes.some((l) => l.estado !== 'EN_PROCESO' && enProceso.has(l.id)))
        void qc.invalidateQueries({ queryKey: tipo === 'DOCENTES' ? K.docentes : K.habilitados })
      return lotes
    },
    refetchInterval: (q) => (q.state.data?.some((l) => l.estado === 'EN_PROCESO') ? 1500 : false),
  })
}

// ── Carga tutorial ──
export const useConfigCarga = (pid?: string) =>
  useQuery({
    queryKey: [...K.carga, 'config', pid],
    queryFn: async (): Promise<ConfigCargaTutorial[]> => {
      const [configs, docentes] = await Promise.all([
        api.todas<ConfigCargaB>(`/periodos/${pid}/config-carga-tutorial`),
        listarDocentes(),
      ])
      const porId = new Map(docentes.map((d) => [d.id, d]))
      return configs.map((c) => configCarga(c, porId))
    },
    enabled: !!pid,
  })

/** Crea el límite (global o del docente) o actualiza el existente. */
export const useGuardarConfigCarga = (pid?: string) =>
  useMutacion({
    fn: async (b: {
      docenteId?: string | null
      maxTrabajos: number
      bloquearAlSuperar: boolean
    }) => {
      const configs = await api.todas<ConfigCargaB>(`/periodos/${pid}/config-carga-tutorial`)
      const existente = configs.find((c) => (c.docenteId ?? null) === (b.docenteId ?? null))
      const cuerpo = { maxTrabajos: b.maxTrabajos, bloquearAlSuperar: b.bloquearAlSuperar }
      return existente
        ? api.patch<ConfigCargaB>(`/periodos/${pid}/config-carga-tutorial/${existente.id}`, cuerpo)
        : api.post<ConfigCargaB>(`/periodos/${pid}/config-carga-tutorial`, {
            ...cuerpo,
            docenteId: b.docenteId ?? null,
          })
    },
    invalida: [K.carga],
    exito: 'Configuración de carga guardada.',
  })

/**
 * El backend no borra límites: el específico se desactiva (queda como historial) y el docente
 * vuelve a regirse por el límite global del período.
 */
export const useDesactivarConfigCarga = (pid?: string) =>
  useMutacion({
    fn: (id: string) =>
      api.post<ConfigCargaB>(`/periodos/${pid}/config-carga-tutorial/${id}/desactivar`),
    invalida: [K.carga],
    exito: 'Límite específico desactivado; el docente vuelve al límite global.',
  })

/** Una sola consulta: carga actual y límite efectivo de cada docente del período. */
export const useCargaTutorial = (pid?: string) =>
  useQuery({
    queryKey: [...K.carga, 'docentes', pid],
    queryFn: async (): Promise<CargaDocente[]> =>
      (await api.todas<CargaPeriodoB>(`/periodos/${pid}/carga-tutorial`)).map((c) =>
        cargaDocente(c, {
          id: c.docente.id,
          nombres: c.docente.nombres,
          apellidos: c.docente.apellidos,
          email: c.docente.email ?? '',
          cedula: c.docente.cedula,
          habilitadoTutoria: c.docente.habilitadoTutoria,
        }),
      ),
    enabled: !!pid,
  })
