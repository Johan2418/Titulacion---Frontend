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
import type { DocenteResumen, EstadoTema, Postulacion, Tema } from '@/types/dominio'

export interface FiltrosTema {
  periodoId?: string
  lineaId?: string
  docenteId?: string
  estado?: EstadoTema | ''
  numIntegrantes?: number | ''
  disponible?: boolean
}

export type TemaInput = {
  periodoId: string
  lineaId: string
  docenteProponenteId: string
  titulo: string
  descripcion: string
  minIntegrantes: number
  maxIntegrantes: number
}

export const listarTemas = async (periodoId: string, f: Omit<FiltrosTema, 'periodoId'> = {}) =>
  (
    await api.todas<TemaB>(`/periodos/${periodoId}/temas`, {
      lineaId: f.lineaId,
      docenteProponenteId: f.docenteId,
      estado: f.estado,
      numIntegrantes: f.numIntegrantes,
    })
  ).map(tema)

export const useTemas = (f: FiltrosTema, enabled = true) =>
  useQuery({
    queryKey: [...K.temas, f],
    queryFn: async () => {
      const temas = await listarTemas(f.periodoId!, f)
      return f.disponible ? temas.filter((t) => t.disponible) : temas
    },
    enabled: enabled && !!f.periodoId,
  })

/** Docentes proponentes presentes en el catálogo (para filtrar sin consultar /docentes). */
export const useProponentes = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.temas, 'proponentes', periodoId],
    queryFn: () => listarTemas(periodoId!),
    enabled: !!periodoId,
    select: (temas: Tema[]) => {
      const porId = new Map<string, DocenteResumen>()
      for (const t of temas) porId.set(t.docenteProponente.id, t.docenteProponente)
      return [...porId.values()].sort((a, b) => a.apellidos.localeCompare(b.apellidos))
    },
  })

export const useTema = (id?: string) => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.temas, 'detalle', id],
    queryFn: async () => tema(await api.get<TemaB>(`/periodos/${periodoId}/temas/${id}`)),
    enabled: !!id && !!periodoId,
  })
}

export const useHistorialTema = (id?: string) => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.temas, 'historial', id],
    queryFn: async () =>
      (await api.todas<TemaHistorialB>(`/periodos/${periodoId}/temas/${id}/historial`)).map(
        temaHistorial,
      ),
    enabled: !!id && !!periodoId,
  })
}

export const useGuardarTema = () => {
  const { periodoId: actual } = usePeriodo()
  return useMutacion({
    fn: async ({ id, periodoId, ...b }: Partial<TemaInput> & { id?: string }) => {
      const pid = periodoId ?? actual
      return tema(
        id
          ? await api.patch<TemaB>(`/periodos/${pid}/temas/${id}`, b)
          : await api.post<TemaB>(`/periodos/${pid}/temas`, b),
      )
    },
    invalida: [K.temas, K.periodos],
    exito: (_t, v) => (v.id ? 'Tema actualizado.' : 'Tema registrado como borrador.'),
  })
}

export type AccionTema = 'publicar' | 'cerrar' | 'retirar'

/**
 * RF-21 / RF-25. `publicar` publica un BORRADOR o reabre un tema CERRADO; `cerrar` y
 * `retirar` exigen motivo y el backend rechaza las postulaciones abiertas del tema.
 */
export const useAccionTema = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
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
          `/periodos/${periodoId}/temas/${id}/${accion}`,
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
}

/** RF-37: temas propuestos por el docente con sus postulaciones. */
export const useMisTemas = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.me, 'temas', periodoId],
    queryFn: async (): Promise<(Tema & { postulaciones: Postulacion[] })[]> => {
      // el backend ya limita ambos listados a los temas propios del docente
      const [temas, postulaciones] = await Promise.all([
        listarTemas(periodoId!),
        api.todas<PostulacionB>(`/periodos/${periodoId}/postulaciones`),
      ])
      return temas.map((t) => ({
        ...t,
        postulaciones: postulaciones.filter((p) => p.tema.id === t.id).map((p) => postulacion(p)),
      }))
    },
    enabled: !!periodoId,
  })
