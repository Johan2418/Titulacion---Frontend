import { useParams } from 'react-router'
import { z } from 'zod'

const esquemaUuid = z.string().uuid()

/**
 * Lee un parámetro de ruta y lo devuelve solo si es un UUID; si no, `null`.
 * Las páginas lo usan antes de interpolar el identificador en una llamada a la API.
 */
export function useUuidParam(nombre = 'id'): string | null {
  const valor = useParams()[nombre]
  const r = esquemaUuid.safeParse(valor)
  return r.success ? r.data : null
}
