/**
 * El backend expone JSON en snake_case (columnas del DER) y el frontend trabaja en camelCase.
 * La traducción se hace aquí, en un solo lugar, para que pantallas y tipos no cambien.
 */

const aCamel = (clave: string) => clave.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
const aSnake = (clave: string) => clave.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

function esObjetoPlano(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

function transformar(valor: unknown, clave: (k: string) => string): unknown {
  if (Array.isArray(valor)) return valor.map((v) => transformar(v, clave))
  if (!esObjetoPlano(valor)) return valor
  return Object.fromEntries(
    Object.entries(valor).map(([k, v]) => [clave(k), transformar(v, clave)]),
  )
}

export const clavesACamel = <T>(valor: unknown) => transformar(valor, aCamel) as T
export const clavesASnake = (valor: unknown) => transformar(valor, aSnake)
export const claveASnake = aSnake
