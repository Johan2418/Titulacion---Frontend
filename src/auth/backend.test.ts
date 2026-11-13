import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/api/client', () => {
  class ApiError extends Error {
    status: number
    code: string
    constructor(b: { statusCode: number; code: string; message: string }) {
      super(b.message)
      this.status = b.statusCode
      this.code = b.code
    }
  }
  return { api: { get, post }, ApiError, oNulo: vi.fn() }
})

const respuesta = { accessToken: 't1', tokenType: 'Bearer', expiresIn: 900 }

beforeEach(() => {
  vi.resetModules()
  get.mockResolvedValue({ csrfToken: 'csrf' })
  post.mockResolvedValue(respuesta)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('renovar', () => {
  it('serializa la renovación entre pestañas con navigator.locks', async () => {
    const request = vi.fn(async (_n: string, cb: () => Promise<unknown>) => cb())
    vi.stubGlobal('navigator', { locks: { request } })
    const { renovar, hayToken } = await import('./backend')
    expect(await renovar()).toBe(true)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][0]).toBe('titulacion-refresh')
    expect(post).toHaveBeenCalledWith('/auth/refresh', undefined, { 'X-CSRF-Token': 'csrf' })
    expect(hayToken()).toBe(true)
  })

  it('comparte una sola renovación entre llamadas concurrentes de la misma pestaña', async () => {
    const request = vi.fn(async (_n: string, cb: () => Promise<unknown>) => cb())
    vi.stubGlobal('navigator', { locks: { request } })
    const { renovar } = await import('./backend')
    await Promise.all([renovar(), renovar(), renovar()])
    expect(request).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('sin navigator.locks renueva directamente', async () => {
    vi.stubGlobal('navigator', {})
    const { renovar } = await import('./backend')
    expect(await renovar()).toBe(true)
  })

  it('devuelve false y descarta el token si la renovación falla', async () => {
    const request = vi.fn(async (_n: string, cb: () => Promise<unknown>) => cb())
    vi.stubGlobal('navigator', { locks: { request } })
    post.mockRejectedValueOnce(new Error('401'))
    const { renovar, hayToken } = await import('./backend')
    expect(await renovar()).toBe(false)
    expect(hayToken()).toBe(false)
  })

  it('pide el CSRF dentro del mismo bloqueo que la renovación', async () => {
    const orden: string[] = []
    const request = vi.fn(async (_n: string, cb: () => Promise<unknown>) => {
      orden.push('entra')
      const r = await cb()
      orden.push('sale')
      return r
    })
    vi.stubGlobal('navigator', { locks: { request } })
    get.mockImplementation(async () => {
      orden.push('csrf')
      return { csrfToken: 'csrf' }
    })
    post.mockImplementation(async () => {
      orden.push('refresh')
      return respuesta
    })
    const { renovar } = await import('./backend')
    await renovar()
    expect(orden).toEqual(['entra', 'csrf', 'refresh', 'sale'])
  })

  it('reintenta una vez tras 300 ms ante 409 REFRESH_CONCURRENTE', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', {})
    const { ApiError } = await import('@/api/client')
    post.mockRejectedValueOnce(
      new ApiError({ statusCode: 409, code: 'REFRESH_CONCURRENTE', message: 'x' }),
    )
    const { renovar } = await import('./backend')
    const p = renovar()
    await vi.advanceTimersByTimeAsync(299)
    expect(post).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(await p).toBe(true)
    expect(post).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('no reintenta más de una vez', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', {})
    const { ApiError } = await import('@/api/client')
    post.mockRejectedValue(
      new ApiError({ statusCode: 409, code: 'REFRESH_CONCURRENTE', message: 'x' }),
    )
    const { renovar } = await import('./backend')
    const p = renovar()
    await vi.advanceTimersByTimeAsync(1000)
    expect(await p).toBe(false)
    expect(post).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
