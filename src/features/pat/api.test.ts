import { beforeEach, describe, expect, it, vi } from 'vitest'

const todas = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', async (importar) => ({
  ...(await importar<typeof import('@/api/client')>()),
  api: { todas },
}))

import { ApiError } from '@/api/client'
import { listarDocumentos } from './api'

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
