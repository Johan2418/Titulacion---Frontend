import { describe, expect, it } from 'vitest'
import type { FacultadCatalogo } from '@/types/dominio'
import {
  carrerasDeFacultad,
  opcionesCarreras,
  opcionesCarrerasConFacultad,
  opcionesFacultades,
} from './api'

const facultades: FacultadCatalogo[] = [
  {
    id: 'f-salud',
    codigo: 'SALUD',
    nombre: 'Facultad Ciencias de la Salud',
    carreras: [{ id: 'c-med', codigo: 'MEDICINA', nombre: 'Medicina' }],
  },
  {
    id: 'f-vida',
    codigo: 'VIDA',
    nombre: 'Facultad Ciencias de la Vida y Tecnologías',
    carreras: [
      { id: 'c-sis', codigo: 'SISTEMAS', nombre: 'Ingeniería en Sistemas' },
      { id: 'c-sof', codigo: 'SOFTWARE', nombre: 'Ingeniería en Software' },
    ],
  },
]

describe('catálogo académico', () => {
  it('devuelve las carreras de la facultad indicada o ninguna', () => {
    expect(carrerasDeFacultad(facultades, 'f-vida').map((c) => c.id)).toEqual(['c-sis', 'c-sof'])
    expect(carrerasDeFacultad(facultades, undefined)).toEqual([])
    expect(carrerasDeFacultad(undefined, 'f-vida')).toEqual([])
  })

  it('arma las opciones de los selects', () => {
    expect(opcionesFacultades(facultades)).toEqual([
      { value: 'f-salud', label: 'Facultad Ciencias de la Salud' },
      { value: 'f-vida', label: 'Facultad Ciencias de la Vida y Tecnologías' },
    ])
    expect(opcionesCarreras(carrerasDeFacultad(facultades, 'f-salud'))).toEqual([
      { value: 'c-med', label: 'Medicina' },
    ])
    expect(opcionesCarrerasConFacultad(facultades)[1]).toEqual({
      value: 'c-sis',
      label: 'Ingeniería en Sistemas — Facultad Ciencias de la Vida y Tecnologías',
    })
    expect(opcionesCarrerasConFacultad(undefined)).toEqual([])
  })
})
