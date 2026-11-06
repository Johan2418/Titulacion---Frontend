/**
 * Cuerpo multipart de la validación de importaciones. El cliente HTTP no convierte las claves
 * de un FormData, por eso la carrera viaja con el nombre literal que espera el backend.
 */
export function formularioImportacion(archivo: File, carreraId: string): FormData {
  const fd = new FormData()
  fd.append('archivo', archivo)
  fd.append('carrera_id', carreraId)
  return fd
}
