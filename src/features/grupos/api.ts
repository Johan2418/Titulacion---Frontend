import { useQuery } from '@tanstack/react-query'
import { api, oNulo } from '@/api/client'
import { grupo, invitacion, type GrupoB, type InvitacionB } from '@/api/adaptadores'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import { useUsuario } from '@/auth/AuthProvider'
import { usePeriodo } from '@/features/periodos/PeriodoContext'

export const useMiGrupo = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.grupos, 'mio', periodoId],
    queryFn: async () => {
      const g = await oNulo(api.get<GrupoB>(`/periodos/${periodoId}/grupos/me`))
      return g ? grupo(g) : null
    },
    enabled: !!periodoId,
  })

export const useGrupos = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.grupos, periodoId],
    queryFn: async () => (await api.todas<GrupoB>(`/periodos/${periodoId}/grupos`)).map(grupo),
    enabled: !!periodoId,
  })

export const useCrearGrupo = () =>
  useMutacion({
    fn: async ({ periodoId, nombre }: { periodoId: string; nombre: string }) =>
      grupo(await api.post<GrupoB>(`/periodos/${periodoId}/grupos`, { nombre })),
    invalida: FLUJO,
    exito: 'Grupo creado. Ahora eres su representante.',
  })

/** El representante con otros integrantes activos disuelve el grupo; los demás salen. */
export const useSalirGrupo = () => {
  const { periodoId } = usePeriodo()
  const { estudianteId } = useUsuario()
  return useMutacion({
    fn: async (grupoId: string) => {
      const base = `/periodos/${periodoId}/grupos/${grupoId}`
      const g = await api.get<GrupoB>(base)
      const activos = g.integrantes.filter((i) => i.estado === 'ACTIVO')
      const representante = activos.some(
        (i) => i.estudiante.id === estudianteId && i.rolEnGrupo === 'REPRESENTANTE',
      )
      if (representante && activos.length > 1)
        await api.post(`${base}/disolver`, { motivo: 'Disuelto por el representante del grupo.' })
      else await api.post(`${base}/salir`, { motivo: 'Salida voluntaria del grupo.' })
    },
    invalida: FLUJO,
    exito: 'Saliste del grupo.',
  })
}

export const useInvitacionesGrupo = (grupoId?: string) => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.invitaciones, 'grupo', grupoId],
    queryFn: async () =>
      (await api.todas<InvitacionB>(`/periodos/${periodoId}/grupos/${grupoId}/invitaciones`)).map(
        invitacion,
      ),
    enabled: !!grupoId && !!periodoId,
  })
}

export const useMisInvitaciones = () => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.invitaciones, 'mias', periodoId],
    queryFn: async () =>
      (await api.todas<InvitacionB>(`/periodos/${periodoId}/invitaciones/me`)).map(invitacion),
    enabled: !!periodoId,
  })
}

export const useInvitar = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({ grupoId, estudianteId }: { grupoId: string; estudianteId: string }) =>
      invitacion(
        await api.post<InvitacionB>(`/periodos/${periodoId}/grupos/${grupoId}/invitaciones`, {
          estudianteDestinoId: estudianteId,
        }),
      ),
    invalida: [K.invitaciones, K.habilitados],
    exito: 'Invitación enviada.',
  })
}

export const useResponderInvitacion = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({ id, accion }: { id: string; accion: 'aceptar' | 'rechazar' | 'cancelar' }) =>
      invitacion(
        await api.post<InvitacionB>(`/periodos/${periodoId}/invitaciones/${id}/${accion}`, {}),
      ),
    invalida: FLUJO,
    exito: (_r, v) =>
      ({
        aceptar: 'Te uniste al grupo.',
        rechazar: 'Invitación rechazada.',
        cancelar: 'Invitación cancelada.',
      })[v.accion],
  })
}

// ── Administración de grupos (ADMIN) ──
// El backend solo permite reorganizar antes del inicio de titulación, con postulación abierta o
// cerrada y sin postulaciones del grupo; los errores llegan con la regla incumplida.

export const useCambiarRepresentanteAdmin = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({
      grupoId,
      estudianteId,
      motivo,
    }: {
      grupoId: string
      estudianteId: string
      motivo: string
    }) =>
      grupo(
        await api.post<GrupoB>(`/periodos/${periodoId}/grupos/${grupoId}/cambiar-representante`, {
          estudianteId,
          motivo: motivo.trim(),
        }),
      ),
    invalida: FLUJO,
    exito: 'Representante actualizado.',
  })
}

export const useRetirarIntegranteAdmin = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({
      grupoId,
      estudianteId,
      motivo,
      nuevoRepresentanteId,
    }: {
      grupoId: string
      estudianteId: string
      motivo: string
      nuevoRepresentanteId?: string
    }) =>
      grupo(
        await api.post<GrupoB>(
          `/periodos/${periodoId}/grupos/${grupoId}/integrantes/${estudianteId}/retirar`,
          { motivo: motivo.trim(), nuevoRepresentanteId: nuevoRepresentanteId || undefined },
        ),
      ),
    invalida: FLUJO,
    exito: 'Integrante retirado del grupo.',
  })
}

export const useDisolverGrupoAdmin = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({ grupoId, motivo }: { grupoId: string; motivo: string }) =>
      grupo(
        await api.post<GrupoB>(`/periodos/${periodoId}/grupos/${grupoId}/disolver`, {
          motivo: motivo.trim(),
        }),
      ),
    invalida: FLUJO,
    exito: 'Grupo disuelto.',
  })
}
