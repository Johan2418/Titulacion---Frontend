/** Opción de carrera que conoce su facultad (ver `opcionesCarrerasConFacultad`). */
export interface OpcionCarreraFacultad {
  value: string
  label: string
  facultadId?: string
}

/** Carreras visibles con la facultad elegida (todas si no hay facultad). */
export function carrerasDeFacultadElegida<T extends OpcionCarreraFacultad>(
  carreras: T[],
  facultadId: string,
): T[] {
  return carreras.filter((c) => !facultadId || c.facultadId === facultadId)
}

/**
 * Carrera que queda seleccionada al cambiar la facultad: una carrera fuera de la facultad
 * elegida deja de ser válida y se limpia.
 */
export function carreraTrasCambiarFacultad(
  carreras: OpcionCarreraFacultad[],
  carreraId: string,
  facultadId: string,
): string {
  if (!carreraId) return ''
  const vigente = carreras.some(
    (c) => c.value === carreraId && (!facultadId || c.facultadId === facultadId),
  )
  return vigente ? carreraId : ''
}

/** Índice carrera → facultad para filtrar filas sin recorrer la lista de carreras. */
export function facultadPorCarrera(carreras: OpcionCarreraFacultad[]): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const c of carreras) if (c.facultadId) mapa.set(c.value, c.facultadId)
  return mapa
}
