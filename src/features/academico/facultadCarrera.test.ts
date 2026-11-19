import { describe, expect, it } from 'vitest'
import {
  carreraTrasCambiarFacultad,
  carrerasDeFacultadElegida,
  facultadPorCarrera,
} from './facultadCarrera'

const carreras = [
  { value: 'c1', label: 'Software', facultadId: 'f1' },
  { value: 'c2', label: 'Civil', facultadId: 'f2' },
  { value: 'c3', label: 'Redes', facultadId: 'f1' },
]

describe('carrerasDeFacultadElegida', () => {
  it('sin facultad devuelve todas', () => {
    expect(carrerasDeFacultadElegida(carreras, '')).toHaveLength(3)
  })
  it('con facultad devuelve solo sus carreras', () => {
    expect(carrerasDeFacultadElegida(carreras, 'f1').map((c) => c.value)).toEqual(['c1', 'c3'])
  })
})

describe('carreraTrasCambiarFacultad', () => {
  it('conserva la carrera si pertenece a la nueva facultad', () => {
    expect(carreraTrasCambiarFacultad(carreras, 'c1', 'f1')).toBe('c1')
  })
  it('limpia la carrera si queda fuera de la facultad elegida', () => {
    expect(carreraTrasCambiarFacultad(carreras, 'c2', 'f1')).toBe('')
  })
  it('conserva la carrera al quitar el filtro de facultad', () => {
    expect(carreraTrasCambiarFacultad(carreras, 'c2', '')).toBe('c2')
  })
  it('limpia una carrera desconocida', () => {
    expect(carreraTrasCambiarFacultad(carreras, 'zz', '')).toBe('')
  })
})

describe('facultadPorCarrera', () => {
  it('indexa la facultad de cada carrera', () => {
    const mapa = facultadPorCarrera(carreras)
    expect(mapa.get('c2')).toBe('f2')
    expect(mapa.get('zz')).toBeUndefined()
  })
})
