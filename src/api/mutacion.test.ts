import { afterEach, describe, expect, it, vi } from 'vitest'

async function cargar(origenes = '') {
  vi.resetModules()
  vi.stubEnv('VITE_STORAGE_ORIGINS', origenes)
  return import('./mutacion')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('descargarUrl', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'http://evil.example/archivo.pdf',
    'no es una url',
    'blob:https://otro.example/uuid',
    'file:///etc/passwd',
  ])('rechaza %j', async (url) => {
    const { descargarUrl } = await cargar()
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(() => descargarUrl(url)).toThrow(/descarga/i)
    expect(clic).not.toHaveBeenCalled()
  })

  it('acepta https y envía rel noopener noreferrer', async () => {
    const { descargarUrl } = await cargar()
    let rel = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      rel = this.rel
    })
    descargarUrl('https://almacen.example/a.pdf', 'a.pdf')
    expect(rel).toBe('noopener noreferrer')
  })

  it('acepta http en localhost y blob del mismo origen', async () => {
    const { descargarUrl } = await cargar()
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    descargarUrl('http://localhost:9000/a.pdf')
    descargarUrl('http://127.0.0.1:9000/a.pdf')
    descargarUrl(`blob:${window.location.origin}/3f2b8a1e-9c4d-4f6a-8b1e-2d3c4b5a6f70`)
    expect(clic).toHaveBeenCalledTimes(3)
  })

  it('con VITE_STORAGE_ORIGINS solo acepta esos orígenes', async () => {
    const { descargarUrl } = await cargar('https://s3.example, https://cdn.example')
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    descargarUrl('https://cdn.example/x?firma=1')
    expect(clic).toHaveBeenCalledTimes(1)
    expect(() => descargarUrl('https://otro.example/x')).toThrow()
    expect(clic).toHaveBeenCalledTimes(1)
  })
})
