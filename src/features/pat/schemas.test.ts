import { describe, expect, it } from 'vitest'
import { MAX_OBSERVACIONES_PAT, revisionSchema } from './schemas'

describe('revisionSchema', () => {
  it('limita las observaciones a 5000 caracteres', () => {
    expect(MAX_OBSERVACIONES_PAT).toBe(5000)
    const ok = revisionSchema.safeParse({
      resultado: 'OBSERVADO',
      observaciones: 'a'.repeat(5000),
    })
    expect(ok.success).toBe(true)
    const mal = revisionSchema.safeParse({
      resultado: 'OBSERVADO',
      observaciones: 'a'.repeat(5001),
    })
    expect(mal.success).toBe(false)
    expect(mal.error?.issues[0]?.message).toMatch(/5000/)
  })

  it('exige observaciones al observar o rechazar', () => {
    expect(revisionSchema.safeParse({ resultado: 'RECHAZADO' }).success).toBe(false)
    expect(revisionSchema.safeParse({ resultado: 'APROBADO' }).success).toBe(true)
  })
})
