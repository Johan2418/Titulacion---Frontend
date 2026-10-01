/** RNF-09 / RNF-14: validación de formato, tipo de contenido y tamaño. */
export const MAX_TAMANO_PAT = 10 * 1024 * 1024 // 10 MB

export const TIPOS_PAT: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
}

export const TIPOS_IMPORTACION: Record<string, string[]> = {
  csv: ['text/csv', 'application/vnd.ms-excel', ''],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
}

export interface ReglasArchivo {
  tipos: Record<string, string[]>
  maxBytes: number
}

export function validarArchivo(archivo: File | null | undefined, reglas: ReglasArchivo) {
  if (!archivo) return 'Debe seleccionar un archivo.'
  const ext = archivo.name.split('.').pop()?.toLowerCase() ?? ''
  const permitidos = Object.keys(reglas.tipos)
  if (!permitidos.includes(ext))
    return `Formato no permitido. Solo se aceptan: ${permitidos.map((e) => e.toUpperCase()).join(', ')}.`
  const mimes = reglas.tipos[ext]
  if (archivo.type && !mimes.includes(archivo.type))
    return `El tipo de contenido (${archivo.type}) no corresponde a un archivo ${ext.toUpperCase()}.`
  if (archivo.size === 0) return 'El archivo está vacío.'
  if (archivo.size > reglas.maxBytes)
    return `El archivo supera el tamaño máximo permitido (${Math.round(reglas.maxBytes / 1024 / 1024)} MB).`
  return null
}
