import { api } from '@/api/client'
import { K } from '@/api/claves'
import { descargarUrl, useMutacion } from '@/api/mutacion'
import type { TipoTema } from '@/types/dominio'

const RUTA = '/importaciones/temas'

export type EstadoFilaTema = 'LISTA' | 'PENDIENTE_DOCENTE' | 'DUPLICADA' | 'ERROR'

export interface DocenteCandidato {
  id: string
  nombres: string
  apellidos: string
}

export interface FilaImportacionTema {
  fila: number
  nro: string | null
  docenteExcel: string
  titulo: string
  descripcion: string | null
  docente: DocenteCandidato | null
  candidatos: DocenteCandidato[]
  estado: EstadoFilaTema
  errores: string[]
  advertencias: string[]
}

export interface ImportacionTemas {
  id: string
  nombreArchivo: string
  estado: string
  carreraId: string | null
  lineaId: string
  tipoTema: TipoTema
  totalFilas: number
  listas: number
  pendientes: number
  duplicadas: number
  conErrores: number
  puedeConfirmar: boolean
  filas: FilaImportacionTema[]
}

export interface ConfirmacionImportacionTemas {
  id: string
  loteId: string
  creados: number
  omitidos: number
}

export interface ParametrosImportacionTemas {
  carreraId: string
  lineaId: string
  tipo: TipoTema | ''
  archivo: File | null
}

export const PARAMETROS_IMPORTACION_INICIALES: ParametrosImportacionTemas = {
  carreraId: '',
  lineaId: '',
  tipo: '',
  archivo: null,
}

/** The HTTP client does not convert FormData keys, so they travel with the backend's names. */
export function formularioImportacionTemas(p: {
  archivo: File
  carreraId: string
  lineaId: string
  tipo: TipoTema
}): FormData {
  const fd = new FormData()
  fd.append('archivo', p.archivo)
  fd.append('carrera_id', p.carreraId)
  fd.append('linea_id', p.lineaId)
  fd.append('tipo', p.tipo)
  return fd
}

export const puedeValidar = (p: ParametrosImportacionTemas): boolean =>
  !!p.archivo && !!p.carreraId && !!p.lineaId && !!p.tipo

/** Distinct Excel teacher names still pending, in file order. */
export const nombresPendientes = (filas: FilaImportacionTema[]): string[] => [
  ...new Set(filas.filter((f) => f.estado === 'PENDIENTE_DOCENTE').map((f) => f.docenteExcel)),
]

/** True when there is something to resolve and every pending name has a chosen teacher. */
export function resolucionesCompletas(
  filas: FilaImportacionTema[],
  seleccion: Record<string, string>,
): boolean {
  const pendientes = nombresPendientes(filas)
  return pendientes.length > 0 && pendientes.every((nombre) => !!seleccion[nombre])
}

/** Descarga la plantilla XLSX de temas (requiere sesión ADMIN). */
export async function descargarPlantillaTemas() {
  const blob = await api.blob(`${RUTA}/plantilla`)
  const url = URL.createObjectURL(blob)
  try {
    descargarUrl(url, 'plantilla-temas-titulacion.xlsx')
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export const useValidarImportacionTemas = () =>
  useMutacion({
    fn: (p: { archivo: File; carreraId: string; lineaId: string; tipo: TipoTema }) =>
      api.post<ImportacionTemas>(`${RUTA}/validar`, formularioImportacionTemas(p)),
  })

/** The body is an array: object keys would be converted to snake_case by the HTTP client. */
export const useResolverDocentesImportacion = () =>
  useMutacion({
    fn: ({
      id,
      resoluciones,
    }: {
      id: string
      resoluciones: { nombreExcel: string; docenteId: string }[]
    }) => api.patch<ImportacionTemas>(`${RUTA}/${id}/docentes`, { resoluciones }),
  })

export const useConfirmarImportacionTemas = () =>
  useMutacion({
    fn: (id: string) =>
      api.post<ConfirmacionImportacionTemas>(`${RUTA}/${id}/confirmar`, {}),
    invalida: [K.temas],
    exito: (r) =>
      `Importación completada: ${r.creados} tema(s) creados${
        r.omitidos ? `, ${r.omitidos} omitido(s) por duplicado` : ''
      }.`,
  })
