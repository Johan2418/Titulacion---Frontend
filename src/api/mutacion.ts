import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { env } from '@/lib/env'
import { mensajeError } from '@/lib/errores'
import { ApiError } from './client'

interface Opciones<TData, TVars> {
  fn: (vars: TVars) => Promise<TData>
  /** Claves a invalidar tras el éxito (por prefijo). */
  invalida?: QueryKey[]
  exito?: string | ((data: TData, vars: TVars) => string)
  /** Si devuelve true, el error no se notifica con toast (lo maneja el componente). */
  silenciarError?: (e: ApiError) => boolean
  onSuccess?: (data: TData, vars: TVars) => void
}

/** useMutation con invalidación y notificaciones uniformes (RNF-16). */
export function useMutacion<TData = unknown, TVars = void>(o: Opciones<TData, TVars>) {
  const qc = useQueryClient()
  return useMutation<TData, Error, TVars>({
    mutationFn: o.fn,
    onSuccess: async (data, vars) => {
      await Promise.all((o.invalida ?? []).map((k) => qc.invalidateQueries({ queryKey: k })))
      if (o.exito) toast.success(typeof o.exito === 'function' ? o.exito(data, vars) : o.exito)
      o.onSuccess?.(data, vars)
    },
    onError: (e) => {
      if (e instanceof ApiError && o.silenciarError?.(e)) return
      toast.error(mensajeError(e))
    },
  })
}

export function aFormData(campos: Record<string, string | Blob | boolean | null | undefined>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(campos)) {
    if (v === null || v === undefined) continue
    fd.append(k, typeof v === 'boolean' ? String(v) : v)
  }
  return fd
}

const errorDescarga = () =>
  new ApiError({
    statusCode: 0,
    code: 'URL_DESCARGA_INVALIDA',
    message: 'No se pudo iniciar la descarga: la dirección del archivo no es válida.',
  })
const ANFITRIONES_LOCALES = new Set(['localhost', '127.0.0.1'])

/** Descarga solo desde https (http en localhost) y, si se configura, desde orígenes permitidos. */
function validarUrlDescarga(url: string) {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    throw errorDescarga()
  }
  // los blob: generados por la propia página (plantillas XLSX) son del mismo origen
  if (u.protocol === 'blob:' && u.origin === window.location.origin) return
  const permitido =
    u.protocol === 'https:' || (u.protocol === 'http:' && ANFITRIONES_LOCALES.has(u.hostname))
  if (!permitido) throw errorDescarga()
  if (env.storageOrigins.length > 0 && !env.storageOrigins.includes(u.origin)) throw errorDescarga()
}

export function descargarUrl(url: string, nombre?: string) {
  validarUrlDescarga(url)
  const a = document.createElement('a')
  a.href = url
  if (nombre) a.download = nombre
  a.rel = 'noopener noreferrer'
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
