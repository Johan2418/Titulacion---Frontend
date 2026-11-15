import { beforeEach, describe, expect, it, vi } from 'vitest'

const todas = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', async (importar) => ({
  ...(await importar<typeof import('@/api/client')>()),
  api: { todas },
}))

import { ApiError } from '@/api/client'
import { adaptarFilaBandejaPat, listarDocumentos } from './api'

const falla = (statusCode: number, message: string) =>
  todas.mockImplementation(() => Promise.reject(new ApiError({ statusCode, code: 'X', message })))

describe('listarDocumentos', () => {
  beforeEach(() => {
    todas.mockReset()
  })

  it('devuelve lista vacía si el exintegrante recibe 404', async () => {
    falla(404, 'Not Found')
    expect(await listarDocumentos('p1', 'a1')).toEqual([])
  })

  it('propaga otros errores (p. ej. 500)', async () => {
    falla(500, 'Internal server error')
    await expect(listarDocumentos('p1', 'a1')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('bandeja individual', () => {
  it('conserva una fila por estudiante sin entrega en un mismo trabajo', () => {
    const base = {
      asignacionTemaId: 'trabajo',
      tema: { id: 'tema', titulo: 'Tema' },
      participantes: [],
      estado: 'SIN_ENTREGA' as const,
      documento: null,
    }
    const filas = ['uno', 'dos'].map((id) =>
      adaptarFilaBandejaPat({ ...base, estudiante: { id, nombres: id, apellidos: 'Apellido' } }),
    )
    expect(filas.map((f) => f.estudiante.id)).toEqual(['uno', 'dos'])
    expect(filas.every((f) => f.documento === null)).toBe(true)
  })
})
