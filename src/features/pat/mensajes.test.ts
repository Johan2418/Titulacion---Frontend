import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { campoDePendiente, describirPendientes, mensajeErrorPat } from './mensajes'

describe('mensajes PAT', () => {
  it('usa los nombres de pendientes simples del backend', () => {
    expect(describirPendientes(['correo_personal', 'extension_pat'])).toBe(
      'Correo personal (o marcar «No aplica»), Sede o extensión del período (debe configurarla un administrador)',
    )
    expect(campoDePendiente('estado_civil')).toBe('estadoCivil')
  })

  it('traduce el 400 con pendientes de la generación', () => {
    const e = new ApiError({
      statusCode: 400,
      code: 'HTTP_400',
      message: 'Completa los datos obligatorios antes de generar el PAT.',
      pendientes: ['fecha_nacimiento', 'confirma_problematica'],
    })
    expect(mensajeErrorPat(e)).toBe(
      'Completa los datos obligatorios antes de generar el PAT. Falta: Fecha de nacimiento, Confirmación de la problemática.',
    )
  })

  it('traduce validaciones en inglés y conserva los mensajes del backend', () => {
    const validacion = new ApiError({
      statusCode: 400,
      code: 'HTTP_400',
      message:
        'correo_personal must be an email. paralelo must be shorter than or equal to 20 characters',
    })
    expect(mensajeErrorPat(validacion)).toBe(
      'Correo personal (o marcar «No aplica»): ingresa un correo válido. Paralelo: máximo 20 caracteres.',
    )
    const conflicto = new ApiError({
      statusCode: 409,
      code: 'HTTP_409',
      message: 'La última versión del PAT todavía está pendiente de revisión.',
    })
    expect(mensajeErrorPat(conflicto)).toBe(
      'La última versión del PAT todavía está pendiente de revisión.',
    )
  })
})
