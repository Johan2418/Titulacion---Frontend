import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { clasificarFalloPerfil, esPerfilCompleto } from './sesion'

const error = (statusCode: number, code = `HTTP_${statusCode}`) =>
  new ApiError({ statusCode, code, message: 'x' })

describe('clasificarFalloPerfil', () => {
  it('401 exige un nuevo ingreso', () =>
    expect(clasificarFalloPerfil(error(401))).toBe('sin-sesion'))
  it('403 indica cuenta no registrada', () =>
    expect(clasificarFalloPerfil(error(403, 'USUARIO_NO_REGISTRADO'))).toBe('no-registrado'))
  it('503, errores del servidor y de red no descartan la sesión', () => {
    expect(clasificarFalloPerfil(error(503))).toBe('no-disponible')
    expect(clasificarFalloPerfil(error(500))).toBe('no-disponible')
    expect(clasificarFalloPerfil(error(0, 'RED_NO_DISPONIBLE'))).toBe('no-disponible')
    expect(clasificarFalloPerfil(new TypeError('fetch failed'))).toBe('no-disponible')
  })
})

describe('esPerfilCompleto', () => {
  it('acepta un usuario con rol del sistema', () =>
    expect(esPerfilCompleto({ id: 'u1', rol: 'DOCENTE', nombres: 'A' })).toBe(true))
  it('rechaza la identidad sin perfil que devuelve la etapa 3 del backend', () =>
    expect(
      esPerfilCompleto({ subject: 'abc', issuer: 'https://login.microsoftonline.com/t/v2.0' }),
    ).toBe(false))
  it('rechaza roles desconocidos o respuestas vacías', () => {
    expect(esPerfilCompleto({ id: 'u1', rol: 'SUPERUSUARIO' })).toBe(false)
    expect(esPerfilCompleto(null)).toBe(false)
  })
})
