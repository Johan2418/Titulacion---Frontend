import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { avisarSesionCerrada, INACTIVIDAD_MS, useCierreInactividad } from './useCierreInactividad'

/** Canal simulado: entrega a las demás instancias con el mismo nombre (como el navegador). */
class CanalFalso {
  static todos = new Set<CanalFalso>()
  onmessage: ((e: MessageEvent) => void) | null = null
  constructor(readonly name: string) {
    CanalFalso.todos.add(this)
  }
  postMessage(data: unknown) {
    for (const c of CanalFalso.todos) {
      if (c !== this && c.name === this.name) queueMicrotask(() => c.onmessage?.({ data } as never))
    }
  }
  close() {
    CanalFalso.todos.delete(this)
  }
}

const original = Storage.prototype.setItem

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  CanalFalso.todos.clear()
  vi.stubGlobal('BroadcastChannel', CanalFalso)
  // jsdom no emite `storage` en la misma ventana: se simula la entrega a las otras pestañas
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    k: string,
    v: string,
  ) {
    original.call(this, k, v)
    window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: v }))
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** Una pestaña: su propio destino de eventos de entrada y sus propios callbacks. */
function pestana(origen: string, salidas: { n: number }) {
  const destino = new EventTarget()
  const alCerrarEnOtra = vi.fn()
  const alInactivo = vi.fn(() => {
    salidas.n += 1 // POST /auth/logout
    avisarSesionCerrada(origen)
  })
  const hook = renderHook(() => useCierreInactividad(alInactivo, alCerrarEnOtra, { destino }))
  return {
    ...hook,
    alInactivo,
    alCerrarEnOtra,
    actividad: () => act(() => void destino.dispatchEvent(new Event('pointermove'))),
  }
}

describe('useCierreInactividad (una pestaña)', () => {
  it('cierra la sesión tras 30 minutos sin actividad', () => {
    const cerrar = vi.fn()
    renderHook(() => useCierreInactividad(cerrar, vi.fn()))
    vi.advanceTimersByTime(INACTIVIDAD_MS - 1)
    expect(cerrar).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('la actividad de puntero o teclado reinicia el temporizador', () => {
    const cerrar = vi.fn()
    renderHook(() => useCierreInactividad(cerrar, vi.fn()))
    vi.advanceTimersByTime(INACTIVIDAD_MS - 1000)
    act(() => void window.dispatchEvent(new Event('pointermove')))
    vi.advanceTimersByTime(INACTIVIDAD_MS - 1000)
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })))
    vi.advanceTimersByTime(INACTIVIDAD_MS - 1)
    expect(cerrar).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('se limpia al desmontar', () => {
    const cerrar = vi.fn()
    const { unmount } = renderHook(() => useCierreInactividad(cerrar, vi.fn()))
    unmount()
    vi.advanceTimersByTime(INACTIVIDAD_MS * 2)
    window.dispatchEvent(new Event('pointermove'))
    vi.advanceTimersByTime(INACTIVIDAD_MS * 2)
    expect(cerrar).not.toHaveBeenCalled()
    expect(CanalFalso.todos.size).toBe(0)
  })

  it('no guarda más que una marca de tiempo y limita las escrituras', () => {
    renderHook(() => useCierreInactividad(vi.fn(), vi.fn()))
    const escrituras = () => vi.mocked(Storage.prototype.setItem).mock.calls.length
    const base = escrituras()
    for (let i = 0; i < 50; i++) {
      act(() => void window.dispatchEvent(new Event('keydown')))
      vi.advanceTimersByTime(100)
    }
    expect(escrituras() - base).toBeLessThanOrEqual(1)
    for (let i = 0; i < localStorage.length; i++) {
      expect(localStorage.getItem(localStorage.key(i)!)).toMatch(/^\d+$/)
    }
  })

  it('tolera un almacenamiento no disponible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const cerrar = vi.fn()
    renderHook(() => useCierreInactividad(cerrar, vi.fn()))
    vi.advanceTimersByTime(INACTIVIDAD_MS)
    expect(cerrar).toHaveBeenCalledTimes(1)
  })
})

describe('useCierreInactividad (varias pestañas)', () => {
  it('la actividad en una pestaña mantiene viva a la otra inactiva', () => {
    const salidas = { n: 0 }
    const a = pestana('a', salidas)
    const b = pestana('b', salidas)
    for (let t = 0; t < 31 * 60; t += 10) {
      a.actividad()
      vi.advanceTimersByTime(10_000)
    }
    expect(salidas.n).toBe(0)
    expect(a.alInactivo).not.toHaveBeenCalled()
    expect(b.alInactivo).not.toHaveBeenCalled()
  })

  it('sin actividad en ninguna pestaña hay una sola salida y ambas quedan cerradas', async () => {
    const salidas = { n: 0 }
    const a = pestana('a', salidas)
    const b = pestana('b', salidas)
    await act(async () => {
      vi.advanceTimersByTime(INACTIVIDAD_MS)
    })
    await act(async () => {})
    expect(salidas.n).toBe(1)
    const cerro = [a, b].filter((p) => p.alInactivo.mock.calls.length === 1)
    const otra = [a, b].find((p) => p.alInactivo.mock.calls.length === 0)!
    expect(cerro).toHaveLength(1)
    expect(otra.alCerrarEnOtra).toHaveBeenCalledTimes(1)
  })

  it('el cierre explícito en una pestaña desmonta la otra sin llamar al servidor', async () => {
    const salidas = { n: 0 }
    const b = pestana('b', salidas)
    await act(async () => {
      avisarSesionCerrada('a') // cerrarSesion() en la pestaña A
    })
    expect(b.alCerrarEnOtra).toHaveBeenCalledTimes(1)
    expect(b.alInactivo).not.toHaveBeenCalled()
    expect(salidas.n).toBe(0)
    vi.advanceTimersByTime(INACTIVIDAD_MS * 2)
    expect(b.alInactivo).not.toHaveBeenCalled()
  })

  it('la pestaña que cierra no reacciona a su propio aviso', async () => {
    const alCerrarEnOtra = vi.fn()
    renderHook(() => useCierreInactividad(vi.fn(), alCerrarEnOtra))
    await act(async () => {
      avisarSesionCerrada()
    })
    expect(alCerrarEnOtra).not.toHaveBeenCalled()
  })

  it('una pestaña con temporizadores atrasados decide por la marca compartida', () => {
    const salidas = { n: 0 }
    const a = pestana('a', salidas)
    const b = pestana('b', salidas)
    // A trabaja 40 minutos; B no ejecuta nada hasta volver a ser visible
    for (let t = 0; t < 40 * 60; t += 10) {
      a.actividad()
      vi.advanceTimersByTime(10_000)
    }
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(b.alInactivo).not.toHaveBeenCalled()
    expect(salidas.n).toBe(0)
  })

  it('sin BroadcastChannel usa el evento storage', async () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('BroadcastChannel', undefined)
    const salidas = { n: 0 }
    const a = pestana('a', salidas)
    const b = pestana('b', salidas)
    for (let t = 0; t < 31 * 60; t += 10) {
      a.actividad()
      vi.advanceTimersByTime(10_000)
    }
    expect(salidas.n).toBe(0)
    await act(async () => {
      avisarSesionCerrada('a')
    })
    expect(b.alCerrarEnOtra).toHaveBeenCalledTimes(1)
    expect(salidas.n).toBe(0)
  })
})
