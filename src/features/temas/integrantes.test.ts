import { describe, expect, it } from 'vitest'
import { maxIntegrantes, textoIntegrantes } from './integrantes'

describe('integrantes del tema', () => {
  it('muestra la cantidad exacta o el rango', () => {
    expect(textoIntegrantes({ minIntegrantes: 1, maxIntegrantes: 1 })).toBe('1')
    expect(textoIntegrantes({ minIntegrantes: 2, maxIntegrantes: 2 })).toBe('2')
    expect(textoIntegrantes({ minIntegrantes: 3, maxIntegrantes: 5 })).toBe('3–5')
  })

  it('un grupo sin período muestra solo el mínimo', () => {
    expect(textoIntegrantes({ minIntegrantes: 3, maxIntegrantes: null })).toBe('3 o más')
    expect(maxIntegrantes({ minIntegrantes: 3, maxIntegrantes: null })).toBe(3)
    expect(maxIntegrantes({ minIntegrantes: 3, maxIntegrantes: 6 })).toBe(6)
  })
})
