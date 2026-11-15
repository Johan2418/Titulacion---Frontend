import { useParams } from 'react-router'
import { z } from 'zod'

const esquemaUuid = z
  .string()
  .uuid()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

/**
 * Lee un parámetro de ruta y lo devuelve solo si es un UUID; si no, `null`.
 * Las páginas lo usan antes de interpolar el identificador en una llamada a la API.
 */
export function useUuidParam(nombre = 'id'): string | null {
  const valor = useParams()[nombre]
  const r = esquemaUuid.safeParse(valor)
  return r.success ? r.data : null
}
