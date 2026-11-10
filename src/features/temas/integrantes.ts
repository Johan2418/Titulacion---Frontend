import { TIPO_TEMA } from '@/lib/estados'
import type { Tema, TipoTema } from '@/types/dominio'

type Rango = Pick<Tema, 'minIntegrantes' | 'maxIntegrantes'>

/**
 * Upper bound to compare against. GRUPO topics listed without a period have no max:
 * the selected period's `maxIntegrantesDefault` is used when known, otherwise the minimum.
 */
export const maxIntegrantes = (t: Rango, maxPeriodo?: number | null): number =>
  t.maxIntegrantes ?? maxPeriodo ?? t.minIntegrantes

/** "1", "2", "3–5", or "3 o más" when neither the topic nor the period gives a max. */
export function textoIntegrantes(t: Rango, maxPeriodo?: number | null): string {
  const max = t.maxIntegrantes ?? maxPeriodo ?? null
  if (max === null) return `${t.minIntegrantes} o más`
  return t.minIntegrantes === max ? `${t.minIntegrantes}` : `${t.minIntegrantes}–${max}`
}

/** Topic type label; GRUPO shows the real range (3 to the period max) when a period is known. */
export function etiquetaTipoTema(tipo: TipoTema, maxPeriodo?: number | null): string {
  if (tipo !== 'GRUPO' || !maxPeriodo || maxPeriodo < 3) return TIPO_TEMA[tipo].label
  return maxPeriodo === 3 ? 'Grupo (3 integrantes)' : `Grupo (3 a ${maxPeriodo} integrantes)`
}

/** Topic type select options, labelled with the selected period's max for GRUPO. */
export const opcionesTipoTema = (maxPeriodo?: number | null) =>
  (Object.keys(TIPO_TEMA) as TipoTema[]).map((value) => ({
    value,
    label: etiquetaTipoTema(value, maxPeriodo),
  }))
