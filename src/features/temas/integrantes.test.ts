import { describe, expect, it } from 'vitest'
import { etiquetaTipoTema, maxIntegrantes, opcionesTipoTema, textoIntegrantes } from './integrantes'

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

  it('un grupo sin máximo propio usa el máximo del período', () => {
    expect(textoIntegrantes({ minIntegrantes: 3, maxIntegrantes: null }, 5)).toBe('3–5')
    expect(textoIntegrantes({ minIntegrantes: 3, maxIntegrantes: null }, 3)).toBe('3')
    expect(maxIntegrantes({ minIntegrantes: 3, maxIntegrantes: null }, 5)).toBe(5)
    // el máximo propio del tema tiene prioridad
    expect(textoIntegrantes({ minIntegrantes: 3, maxIntegrantes: 4 }, 6)).toBe('3–4')
    expect(maxIntegrantes({ minIntegrantes: 3, maxIntegrantes: 4 }, 6)).toBe(4)
  })

  it('la etiqueta del tipo grupo refleja el máximo del período', () => {
    expect(etiquetaTipoTema('GRUPO', 5)).toBe('Grupo (3 a 5 integrantes)')
    expect(etiquetaTipoTema('GRUPO', 3)).toBe('Grupo (3 integrantes)')
    expect(etiquetaTipoTema('GRUPO')).toBe('Grupo (3 o más integrantes)')
    expect(etiquetaTipoTema('GRUPO', 2)).toBe('Grupo (3 o más integrantes)')
    expect(etiquetaTipoTema('PAREJA', 5)).toBe('Pareja (2 integrantes)')
    expect(opcionesTipoTema(4).map((o) => o.label)).toEqual([
      'Individual (1 integrante)',
      'Pareja (2 integrantes)',
      'Grupo (3 a 4 integrantes)',
    ])
  })
})
