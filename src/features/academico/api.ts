import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import type { CarreraCatalogo, FacultadCatalogo } from '@/types/dominio'

/** Catálogo de facultades y carreras: solo cambia por migración, se consulta una vez por sesión. */
export const useFacultades = () =>
  useQuery({
    queryKey: K.facultades,
    queryFn: () => api.get<FacultadCatalogo[]>('/facultades'),
    staleTime: Infinity,
    gcTime: Infinity,
  })

export const carrerasDeFacultad = (
  facultades: FacultadCatalogo[] | undefined,
  facultadId: string | undefined,
): CarreraCatalogo[] => facultades?.find((f) => f.id === facultadId)?.carreras ?? []

export const opcionesFacultades = (facultades: FacultadCatalogo[] | undefined) =>
  (facultades ?? []).map((f) => ({ value: f.id, label: f.nombre }))

export const opcionesCarreras = (carreras: CarreraCatalogo[]) =>
  carreras.map((c) => ({ value: c.id, label: c.nombre }))

/** Todas las carreras, rotuladas «Carrera — Facultad» (los docentes no dependen del período). */
export const opcionesCarrerasConFacultad = (facultades: FacultadCatalogo[] | undefined) =>
  (facultades ?? []).flatMap((f) =>
    f.carreras.map((c) => ({ value: c.id, label: `${c.nombre} — ${f.nombre}` })),
  )
