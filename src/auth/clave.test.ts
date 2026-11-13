import { describe, expect, it } from 'vitest'
import { CLAVE_MAX, CLAVE_MIN, validarClave } from './clave'

describe('validarClave', () => {
  it('exige al menos 12 caracteres', () => {
    expect(CLAVE_MIN).toBe(12)
    expect(validarClave('a'.repeat(11), 'a'.repeat(11))).toBe(
      'La contraseña debe tener entre 12 y 128 caracteres.',
    )
    expect(validarClave('a'.repeat(12), 'a'.repeat(12))).toBeNull()
  })
  it('rechaza más del máximo y confirmaciones distintas', () => {
    expect(validarClave('a'.repeat(CLAVE_MAX + 1), 'a'.repeat(CLAVE_MAX + 1))).not.toBeNull()
    expect(validarClave('a'.repeat(12), 'b'.repeat(12))).toBe('Las contraseñas no coinciden.')
  })
})
