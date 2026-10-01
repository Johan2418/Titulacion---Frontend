import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type { EstadoTema, Postulacion, Tema, TemaHistorial } from '@/types/dominio'

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

export const useTemas = (f: FiltrosTema, enabled = true) =>
  useQuery({
    queryKey: [...K.temas, f],
    queryFn: () => api.get<Tema[]>('/temas', { ...f }),
    enabled: enabled && !!f.periodoId,
  })

export const useTema = (id?: string) =>
  useQuery({
    queryKey: [...K.temas, 'detalle', id],
    queryFn: () => api.get<Tema>(`/temas/${id}`),
    enabled: !!id,
  })

export const useHistorialTema = (id?: string) =>
  useQuery({
    queryKey: [...K.temas, 'historial', id],
    queryFn: () => api.get<TemaHistorial[]>(`/temas/${id}/historial`),
    enabled: !!id,
  })

export const useGuardarTema = () =>
  useMutacion({
    fn: ({ id, ...b }: Partial<TemaInput> & { id?: string }) =>
      id ? api.patch<Tema>(`/temas/${id}`, b) : api.post<Tema>('/temas', b),
    invalida: [K.temas, K.periodos],
    exito: (_t, v) => (v.id ? 'Tema actualizado.' : 'Tema registrado como borrador.'),
  })

export type AccionTema = 'publicar' | 'cerrar' | 'retirar'

export const useAccionTema = () =>
  useMutacion({
    fn: ({ id, accion, motivo }: { id: string; accion: AccionTema; motivo?: string }) =>
      api.post<Tema>(`/temas/${id}/${accion}`, { motivo }),
    invalida: FLUJO,
    exito: (_t, v) =>
      ({ publicar: 'Tema publicado.', cerrar: 'Tema cerrado.', retirar: 'Tema retirado.' })[
        v.accion
      ],
  })

/** RF-37: temas propuestos por el docente con sus postulaciones. */
export const useMisTemas = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.me, 'temas', periodoId],
    queryFn: () => api.get<(Tema & { postulaciones: Postulacion[] })[]>('/me/temas', { periodoId }),
  })
