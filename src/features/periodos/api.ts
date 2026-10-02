import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type { EstadoPeriodo, PeriodoTitulacion, ResumenPeriodo } from '@/types/dominio'

export type PeriodoInput = Pick<
  PeriodoTitulacion,
  | 'codigo'
  | 'nombre'
  | 'fechaInicioPostulacion'
  | 'fechaFinPostulacion'
  | 'fechaInicioTitulacion'
  | 'maxIntegrantesDefault'
>

export const usePeriodos = () =>
  useQuery({ queryKey: K.periodos, queryFn: () => api.get<PeriodoTitulacion[]>('/periodos') })

export const usePeriodoActual = () =>
  useQuery({
    queryKey: K.periodoActual,
    queryFn: () => api.get<PeriodoTitulacion | null>('/periodos/actual'),
  })

export const useResumenPeriodo = (pid?: string) =>
  useQuery({
    queryKey: K.resumen(pid ?? ''),
    queryFn: () => api.get<ResumenPeriodo>(`/periodos/${pid}/resumen`),
    enabled: !!pid,
  })

export const useCrearPeriodo = () =>
  useMutacion({
    fn: (b: PeriodoInput) => api.post<PeriodoTitulacion>('/periodos', b),
    invalida: [K.periodos],
    exito: 'Período creado.',
  })

export const useActualizarPeriodo = () =>
  useMutacion({
    fn: ({ id, ...b }: Partial<PeriodoInput> & { id: string }) =>
      api.patch<PeriodoTitulacion>(`/periodos/${id}`, b),
    invalida: [K.periodos],
    exito: 'Período actualizado.',
  })

export const useCambiarEstadoPeriodo = () =>
  useMutacion({
    fn: ({ id, estado }: { id: string; estado: EstadoPeriodo }) =>
      api.post<PeriodoTitulacion>(`/periodos/${id}/estado`, { estado }),
    invalida: [K.periodos],
    exito: 'Estado del período actualizado.',
  })
