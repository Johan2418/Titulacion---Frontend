import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import {
  postulacion,
  tema,
  temaHistorial,
  type PostulacionB,
  type TemaB,
  type TemaHistorialB,
} from '@/api/adaptadores'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import type { DocenteResumen, EstadoTema, Postulacion, Tema, TipoTema } from '@/types/dominio'

export interface FiltrosTema {
  /** Period context: required for students; sets the GRUPO upper bound. */
  periodoId?: string
  carreraId?: string
  lineaId?: string
  docenteId?: string
  estado?: EstadoTema | ''
  tipo?: TipoTema | ''
  disponible?: boolean
}

export type TemaInput = {
  carreraId: string
  lineaId: string
  docenteProponenteId: string
  tipo: TipoTema
  titulo: string
  descripcion: string
}

/** Query params of GET /temas (the HTTP client converts keys to snake_case and drops empty values). */
export const consultaTemas = (f: FiltrosTema = {}) => ({
  periodoId: f.periodoId,
  carreraId: f.carreraId,
  lineaId: f.lineaId,
  docenteProponenteId: f.docenteId,
  estado: f.estado,
  tipo: f.tipo,
  disponible: f.disponible === undefined ? undefined : String(f.disponible),
})

export const listarTemas = async (f: FiltrosTema = {}) =>
  (await api.todas<TemaB>('/temas', consultaTemas(f))).map(tema)

export const useTemas = (f: FiltrosTema, enabled = true) =>
  useQuery({
    queryKey: [...K.temas, f],
    queryFn: () => listarTemas(f),
    enabled,
  })

/** Docentes proponentes presentes en el catálogo del período (para filtrar sin consultar /docentes). */
export const useProponentes = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.temas, 'proponentes', periodoId],
    queryFn: () => listarTemas({ periodoId }),
    enabled: !!periodoId,
    select: (temas: Tema[]) => {
      const porId = new Map<string, DocenteResumen>()
      for (const t of temas) porId.set(t.docenteProponente.id, t.docenteProponente)
      return [...porId.values()].sort((a, b) => a.apellidos.localeCompare(b.apellidos))
    },
  })

/** Detalle del tema; el período seleccionado fija el máximo de GRUPO (y es obligatorio para estudiantes). */
export const useTema = (id?: string) => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.temas, 'detalle', id, periodoId],
    queryFn: async () => tema(await api.get<TemaB>(`/temas/${id}`, { periodoId })),
    enabled: !!id,
  })
}

export const useHistorialTema = (id?: string) =>
  useQuery({
    queryKey: [...K.temas, 'historial', id],
    queryFn: async () =>
      (await api.todas<TemaHistorialB>(`/temas/${id}/historial`)).map(temaHistorial),
    enabled: !!id,
  })

export const useGuardarTema = () =>
  useMutacion({
    fn: async ({ id, ...b }: Partial<TemaInput> & { id?: string }) =>
      tema(id ? await api.patch<TemaB>(`/temas/${id}`, b) : await api.post<TemaB>('/temas', b)),
    invalida: [K.temas, K.periodos],
    exito: (_t, v) => (v.id ? 'Tema actualizado.' : 'Tema registrado como borrador.'),
  })

export type AccionTema = 'publicar' | 'cerrar' | 'retirar'

/**
 * RF-21 / RF-25. `publicar` publica un BORRADOR o reabre un tema CERRADO; `cerrar` y
 * `retirar` exigen motivo y el backend rechaza las postulaciones abiertas del tema.
 */
export const useAccionTema = () =>
  useMutacion({
    fn: async ({
      id,
      accion,
      motivo,
    }: {
      id: string
      accion: AccionTema
      motivo?: string
      /** true cuando `publicar` se usa sobre un tema CERRADO. */
      reabrir?: boolean
    }) =>
      tema(
        await api.post<TemaB>(
          `/temas/${id}/${accion}`,
          accion === 'publicar' ? {} : { motivo: motivo?.trim() ?? '' },
        ),
      ),
    // cerrar/retirar rechazan postulaciones: refrescar todo el flujo
    invalida: FLUJO,
    exito: (_t, v) =>
      ({
        publicar: v.reabrir ? 'Tema reabierto.' : 'Tema publicado.',
        cerrar: 'Tema cerrado. Sus postulaciones abiertas fueron rechazadas.',
        retirar: 'Tema retirado. Sus postulaciones abiertas fueron rechazadas.',
      })[v.accion],
  })

/** RF-37: temas propuestos por el docente (banco) con sus postulaciones del período. */
export const useMisTemas = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.me, 'temas', periodoId],
    queryFn: async (): Promise<(Tema & { postulaciones: Postulacion[] })[]> => {
      // el backend ya limita ambos listados a los temas propios del docente
      const [temas, postulaciones] = await Promise.all([
        listarTemas({ periodoId }),
        api.todas<PostulacionB>(`/periodos/${periodoId}/postulaciones`),
      ])
      return temas.map((t) => ({
        ...t,
        postulaciones: postulaciones.filter((p) => p.tema.id === t.id).map((p) => postulacion(p)),
      }))
    },
    enabled: !!periodoId,
  })
