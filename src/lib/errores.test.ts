import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { mensajeError } from './errores'

const error = (statusCode: number, message: string) =>
  new ApiError({ statusCode, code: 'X', message })

describe('mensajeError en cargas de archivos', () => {
  it('traduce el 429 genérico', () => {
    expect(mensajeError(error(429, 'Too Many Requests'))).toMatch(/Demasiados intentos/)
  })

  it('traduce el 403 genérico', () => {
    expect(mensajeError(error(403, 'Forbidden resource'))).toMatch(/No tiene permisos/)
  })

  it('muestra el mensaje del servidor para contenido activo (400) y límite por hora (429)', () => {
    const activo = 'El documento contiene macros u objetos incrustados.'
    expect(mensajeError(error(400, activo))).toBe(activo)
    const limite = 'Superaste el límite de 10 cargas por hora.'
    expect(mensajeError(error(429, limite))).toBe(limite)
  })
})
