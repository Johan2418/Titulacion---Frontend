import { describe, expect, it } from 'vitest'
import { formatFecha, formatFechaHora } from './fechas'

describe('formatFecha (RNF-30)', () => {
  it('muestra una fecha sin hora como el mismo día de calendario', () => {
    expect(formatFecha('2026-11-10')).toBe('10 nov 2026')
    expect(formatFecha('2026-01-01')).toBe('01 ene 2026')
    expect(formatFecha('2026-12-31')).toBe('31 dic 2026')
  })

  it('convierte las marcas de tiempo completas a la zona institucional', () => {
    // 03:00 UTC del 10 de noviembre son las 22:00 del 9 de noviembre en Guayaquil (UTC-5).
    expect(formatFecha('2026-11-10T03:00:00.000Z')).toBe('09 nov 2026')
    expect(formatFecha('2026-11-10T17:00:00.000Z')).toBe('10 nov 2026')
  })

  it('usa un guion para valores vacíos', () => {
    expect(formatFecha(null)).toBe('—')
    expect(formatFecha(undefined)).toBe('—')
    expect(formatFecha('')).toBe('—')
  })
})

describe('formatFechaHora (RNF-30)', () => {
  it('muestra una fecha sin hora solo como fecha, sin desplazar el día', () => {
    expect(formatFechaHora('2026-11-10')).toBe('10 nov 2026')
  })

  it('muestra la hora institucional de una marca de tiempo completa', () => {
    const texto = formatFechaHora('2026-10-01T17:30:00.000Z')
    expect(texto).toContain('01 oct 2026')
    expect(texto).toContain('12:30')
  })
})
