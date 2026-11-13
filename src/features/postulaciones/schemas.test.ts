import { describe, expect, it } from 'vitest'
import { MAX_TUTORES_PROPUESTOS, tutoresPropuestosSchema } from './schemas'

describe('tutoresPropuestosSchema', () => {
  it('el límite coincide con el del servidor', () => expect(MAX_TUTORES_PROPUESTOS).toBe(5))

  it('exige al menos un tutor', () => {
    const r = tutoresPropuestosSchema.safeParse([])
    expect(r.success).toBe(false)
  })

  it('acepta de 1 a 5 y rechaza 6 con un mensaje claro', () => {
    expect(tutoresPropuestosSchema.safeParse(['a']).success).toBe(true)
    expect(tutoresPropuestosSchema.safeParse(['a', 'b', 'c', 'd', 'e']).success).toBe(true)
    const r = tutoresPropuestosSchema.safeParse(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/máximo 5/i)
  })
})
