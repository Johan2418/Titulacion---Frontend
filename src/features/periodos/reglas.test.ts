import { describe, expect, it } from 'vitest'
import { facultadBloqueada } from './reglas'

describe('facultadBloqueada', () => {
  it('locks the faculty outside BORRADOR', () => {
    expect(facultadBloqueada(false, 0)).toBe(true)
  })

  it('locks the faculty in BORRADOR only when the period has enabled students', () => {
    expect(facultadBloqueada(true, 2)).toBe(true)
    expect(facultadBloqueada(true, 0)).toBe(false)
  })

  it('keeps the faculty editable in BORRADOR while the summary is not loaded', () => {
    expect(facultadBloqueada(true, undefined)).toBe(false)
  })
})
