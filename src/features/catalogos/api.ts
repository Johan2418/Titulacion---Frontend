import { useQuery } from '@tanstack/react-query'
import { api, noDisponible } from '@/api/client'
import {
  cargaDocente,
  configCarga,
  docente,
  estudiante,
  habilitado,
  type CargaActualB,
  type ConfigCargaB,
  type DocenteB,
  type EstudianteB,
  type HabilitadoB,
} from '@/api/adaptadores'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
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
  Usuario,
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

/** Alta en dos pasos: cuenta DOCENTE (envía la clave temporal) y luego su perfil. */
export const useGuardarDocente = () =>
  useMutacion({
    fn: async ({ id, ...b }: Partial<DocenteInput> & { id?: string; estado?: string }) => {
      if (id) noDisponible('La edición de docentes')
      const cuenta = await api.post<Usuario>('/usuarios', {
        email: b.email,
        nombres: b.nombres,
        apellidos: b.apellidos,
        rol: 'DOCENTE',
      })
      return docente(
        await api.post<DocenteB>('/docentes', {
          usuarioId: cuenta.id,
          cedula: b.cedula,
          tituloAcademico: b.tituloAcademico ?? '',
          departamento: b.departamento ?? '',
          habilitadoTutoria: b.habilitadoTutoria ?? false,
        }),
      )
    },
    invalida: [K.docentes, K.carga],
    exito: 'Docente registrado. Recibirá por correo su clave temporal.',
  })

export const useImportarDocentes = () =>
  useMutacion<LoteImportacion, File>({
    fn: async () => noDisponible('La importación de docentes'),
    invalida: [K.lotes],
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
        ).map((h) => habilitado(h))
      const [registros, perfiles] = await Promise.all([
        api.todas<HabilitadoB>(`/periodos/${pid}/habilitados`),
        listarEstudiantes(),
      ])
      const porId = new Map(perfiles.map((e) => [e.id, e]))
      return registros.map((h) => habilitado(h, porId))
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

export const useActualizarHabilitado = () =>
  useMutacion<
    EstudianteHabilitado,
    { id: string } & Partial<
      Pick<EstudianteHabilitado, 'estado' | 'condicionIngreso' | 'requisitoPendiente'>
    >
  >({
    fn: async () => noDisponible('La edición de una habilitación'),
    invalida: [K.habilitados, K.periodos],
  })

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
 * El backend valida el archivo en segundo plano (preparación) y luego se confirma.
 * Las preparaciones de la sesión se recuerdan aquí para listarlas como lotes.
 */
interface PreparacionB {
  id: string
  periodoId: string
  nombreArchivo: string
  estado: 'VALIDANDO' | 'LISTA' | 'INVALIDA' | 'EN_COLA' | 'PROCESANDO' | 'COMPLETADA' | 'FALLIDA'
  totalFilas: number
  errores: { fila: number; columna?: string; mensaje: string }[]
  creadaEn: string
}

const CLAVE_PREPARACIONES = 'titulacion.preparacionesImportacion'

function preparacionesGuardadas(): { id: string; periodoId: string }[] {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_PREPARACIONES) ?? '[]')
  } catch {
    return []
  }
}

function recordarPreparacion(id: string, periodoId: string) {
  try {
    const previas = preparacionesGuardadas().filter((p) => p.id !== id)
    sessionStorage.setItem(
      CLAVE_PREPARACIONES,
      JSON.stringify([{ id, periodoId }, ...previas].slice(0, 20)),
    )
  } catch {
    // sin almacenamiento: solo no se listará
  }
}

const ESTADO_LOTE: Record<PreparacionB['estado'], LoteImportacion['estado']> = {
  VALIDANDO: 'EN_PROCESO',
  LISTA: 'EN_PROCESO',
  EN_COLA: 'EN_PROCESO',
  PROCESANDO: 'EN_PROCESO',
  COMPLETADA: 'COMPLETADO',
  INVALIDA: 'FALLIDO',
  FALLIDA: 'FALLIDO',
}

const lote = (p: PreparacionB): LoteImportacion => ({
  id: p.id,
  periodoId: p.periodoId,
  tipo: 'ESTUDIANTES',
  nombreArchivo: p.nombreArchivo,
  estado: ESTADO_LOTE[p.estado],
  totalFilas: p.totalFilas,
  filasOk: p.estado === 'COMPLETADA' ? p.totalFilas : 0,
  filasError: p.errores.length,
  errores: p.errores.map((e) => ({
    fila: e.fila,
    mensaje: e.columna ? `${e.columna}: ${e.mensaje}` : e.mensaje,
  })),
  fechaInicio: p.creadaEn,
})

const rutaPreparacion = (pid: string, id: string) =>
  `/periodos/${pid}/importaciones/estudiantes/${id}`

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const useImportarHabilitados = (pid?: string) =>
  useMutacion({
    fn: async (archivo: File) => {
      const fd = new FormData()
      fd.append('archivo', archivo)
      const { id } = await api.post<{ id: string }>(
        `/periodos/${pid}/importaciones/estudiantes/validar`,
        fd,
      )
      recordarPreparacion(id, pid!)
      // se espera la validación y, si no hay errores, se confirma la carga
      let prep = await api.get<PreparacionB>(rutaPreparacion(pid!, id))
      for (let i = 0; prep.estado === 'VALIDANDO' && i < 40; i++) {
        await esperar(1500)
        prep = await api.get<PreparacionB>(rutaPreparacion(pid!, id))
      }
      if (prep.estado === 'LISTA') {
        await api.post(`${rutaPreparacion(pid!, id)}/confirmar`, {})
        prep = await api.get<PreparacionB>(rutaPreparacion(pid!, id))
      }
      return lote(prep)
    },
    invalida: [K.lotes, K.habilitados],
    exito: (l) =>
      l.estado === 'FALLIDO'
        ? 'El archivo tiene errores; revise el detalle de la importación.'
        : 'Importación confirmada; se procesará en segundo plano.',
  })

export const useLotes = (filtros: { tipo?: string; periodoId?: string }) =>
  useQuery({
    queryKey: [...K.lotes, filtros],
    queryFn: async () => {
      if (filtros.tipo !== 'ESTUDIANTES') return []
      const propias = preparacionesGuardadas().filter(
        (p) => !filtros.periodoId || p.periodoId === filtros.periodoId,
      )
      const preps = await Promise.all(
        propias.map((p) =>
          api.get<PreparacionB>(rutaPreparacion(p.periodoId, p.id)).catch(() => null),
        ),
      )
      return preps.filter((p): p is PreparacionB => !!p).map(lote)
    },
    refetchInterval: (q) => (q.state.data?.some((l) => l.estado === 'EN_PROCESO') ? 1500 : false),
  })

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

export const useEliminarConfigCarga = () =>
  useMutacion<void, string>({
    fn: async () => noDisponible('La eliminación de un límite específico'),
    invalida: [K.carga],
  })

export const useCargaTutorial = (pid?: string) =>
  useQuery({
    queryKey: [...K.carga, 'docentes', pid],
    queryFn: async (): Promise<CargaDocente[]> => {
      const docentes = await listarDocentes()
      return Promise.all(
        docentes.map(async (d) =>
          cargaDocente(await api.get<CargaActualB>(`/periodos/${pid}/carga-tutorial/${d.id}`), d),
        ),
      )
    },
    enabled: !!pid,
  })
