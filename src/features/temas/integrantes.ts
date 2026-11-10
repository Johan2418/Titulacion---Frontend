import type { Tema } from '@/types/dominio'

type Rango = Pick<Tema, 'minIntegrantes' | 'maxIntegrantes'>

/** Upper bound to compare against; for GRUPO without a period only the minimum is known. */
export const maxIntegrantes = (t: Rango): number => t.maxIntegrantes ?? t.minIntegrantes

/** "1", "2", "3–5" or "3 o más" (GRUPO listed without a period). */
export function textoIntegrantes(t: Rango): string {
  if (t.maxIntegrantes === null) return `${t.minIntegrantes} o más`
  return t.minIntegrantes === t.maxIntegrantes
    ? `${t.minIntegrantes}`
    : `${t.minIntegrantes}–${t.maxIntegrantes}`
}
