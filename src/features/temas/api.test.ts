import { describe, expect, it } from 'vitest'
import { consultaTemas } from './api'

describe('consultaTemas', () => {
  it('traduce los filtros del banco a parámetros de GET /temas', () => {
    expect(
      consultaTemas({
        periodoId: 'p',
        carreraId: 'c',
        lineaId: 'l',
        docenteId: 'd',
        estado: 'PUBLICADO',
        tipo: 'GRUPO',
        disponible: true,
      }),
    ).toEqual({
      periodoId: 'p',
      carreraId: 'c',
      lineaId: 'l',
      docenteProponenteId: 'd',
      estado: 'PUBLICADO',
      tipo: 'GRUPO',
      disponible: 'true',
    })
  })

  it('envía disponible=false solo cuando se pide y omite filtros vacíos', () => {
    expect(consultaTemas({ disponible: false }).disponible).toBe('false')
    expect(consultaTemas({})).toEqual({
      periodoId: undefined,
      carreraId: undefined,
      lineaId: undefined,
      docenteProponenteId: undefined,
      estado: undefined,
      tipo: undefined,
      disponible: undefined,
    })
  })
})
