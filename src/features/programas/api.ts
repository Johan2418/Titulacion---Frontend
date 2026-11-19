import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type { Programa, Usuario } from '@/types/dominio'

export interface FiltrosPrograma {
  carreraId?: string
  facultadId?: string
  responsableDocenteId?: string
  responsableUsuarioId?: string
  /** true: solo los programas de los que el usuario es responsable. */
  mios?: boolean
  activo?: boolean
}

/** Parámetros de GET /programas (el cliente pasa las claves a snake_case y omite vacíos). */
export const consultaProgramas = (f: FiltrosPrograma = {}) => ({
  carreraId: f.carreraId || undefined,
  facultadId: f.facultadId || undefined,
  responsableDocenteId: f.responsableDocenteId || undefined,
  responsableUsuarioId: f.responsableUsuarioId || undefined,
  mios: f.mios ? 'true' : undefined,
  activo: f.activo === undefined ? undefined : String(f.activo),
})

export const useProgramas = (f: FiltrosPrograma = {}, enabled = true) =>
  useQuery({
    queryKey: [...K.programas, f],
    queryFn: () => api.todas<Programa>('/programas', consultaProgramas(f)),
    enabled,
  })

/** Cuerpo de POST /programas y PATCH /programas/:id (claves en camelCase). */
export interface ProgramaInput {
  nombre?: string
  descripcion?: string | null
  carreraId?: string
  responsableDocenteId?: string
  responsableUsuarioId?: string
  maxTemas?: number
  activo?: boolean
}

export const useGuardarPrograma = () =>
  useMutacion({
    fn: ({ id, ...b }: ProgramaInput & { id?: string }) =>
      id ? api.patch<Programa>(`/programas/${id}`, b) : api.post<Programa>('/programas', b),
    invalida: [K.programas, K.temas],
    exito: (_p, v) => (v.id ? 'Programa actualizado.' : 'Programa creado.'),
  })

/** Cuentas COORDINADOR activas que pueden ser responsables (GET /usuarios es solo ADMIN). */
export const useCoordinadores = (enabled = true) =>
  useQuery({
    queryKey: [...K.usuarios, 'coordinadores'],
    queryFn: async () =>
      (await api.todas<Usuario>('/usuarios')).filter(
        (u) => u.rol === 'COORDINADOR' && u.estado === 'ACTIVO',
      ),
    enabled,
  })
