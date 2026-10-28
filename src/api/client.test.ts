import { afterEach, describe, expect, it, vi } from 'vitest'
import { clavesACamel, clavesASnake } from './casos'
import { api, ApiError, configurarCliente, oNulo } from './client'

const respuesta = (status: number, cuerpo?: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => {
  vi.restoreAllMocks()
  configurarCliente({ obtenerToken: () => null, alNoAutorizado: () => {} })
})

describe('conversión de claves', () => {
  it('traduce snake_case del backend a camelCase en objetos anidados', () => {
    expect(
      clavesACamel({
        fecha_inicio_postulacion: 'x',
        tema: { min_integrantes: 1 },
        data: [{ es_proponente_tema: true }],
      }),
    ).toEqual({
      fechaInicioPostulacion: 'x',
      tema: { minIntegrantes: 1 },
      data: [{ esProponenteTema: true }],
    })
  })
  it('envía camelCase como snake_case', () => {
    expect(clavesASnake({ tutoresPropuestos: ['a'], docenteId: null })).toEqual({
      tutores_propuestos: ['a'],
      docente_id: null,
    })
  })
})

describe('cliente HTTP', () => {
  it('descarga binarios sin interpretarlos como JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(new Uint8Array([80, 75, 3, 4]), { status: 200 }),
    )
    const blob = await api.blob('/importaciones/docentes/plantilla')
    expect(blob.size).toBe(4)
  })
  it('recorre todas las páginas de un listado', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        respuesta(200, {
          data: Array.from({ length: 100 }, (_, i) => ({ id: i })),
          total: 101,
          page: 1,
          limit: 100,
        }),
      )
      .mockResolvedValueOnce(
        respuesta(200, { data: [{ id: 100 }], total: 101, page: 2, limit: 100 }),
      )
    const items = await api.todas<{ id: number }>('/periodos', { estadoTema: 'X' })
    expect(items).toHaveLength(101)
    const url = new URL(String(fetchMock.mock.calls[1][0]))
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('estado_tema')).toBe('X')
  })

  it('ante un 401 renueva la sesión y repite la petición una vez', async () => {
    let token = 'viejo'
    const renovarSesion = vi.fn(async () => {
      token = 'nuevo'
      return true
    })
    configurarCliente({ obtenerToken: () => token, alNoAutorizado: vi.fn(), renovarSesion })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respuesta(401, { statusCode: 401, message: 'Unauthorized' }))
      .mockResolvedValueOnce(respuesta(200, { id: 'u1' }))
    await expect(api.get('/usuarios/me')).resolves.toEqual({ id: 'u1' })
    expect(renovarSesion).toHaveBeenCalledOnce()
    const cabeceras = fetchMock.mock.calls[1][1]?.headers as Record<string, string>
    expect(cabeceras.Authorization).toBe('Bearer nuevo')
  })

  it('oNulo convierte un 404 en null y deja pasar otros errores', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        respuesta(404, { statusCode: 404, message: 'No perteneces a un grupo.' }),
      )
      .mockResolvedValueOnce(respuesta(409, { statusCode: 409, message: 'Conflicto.' }))
    await expect(oNulo(api.get('/periodos/p/grupos/me'))).resolves.toBeNull()
    await expect(oNulo(api.get('/periodos/p/grupos/me'))).rejects.toBeInstanceOf(ApiError)
  })
})
