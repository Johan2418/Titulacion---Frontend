import { describe, expect, it } from 'vitest'
import type { Grupo } from '@/types/dominio'
import {
  esRepresentante,
  moverElemento,
  ordenarSugeridos,
  verificarPostulacion,
  type ContextoPostulacion,
} from './reglas'

const AHORA = new Date('2026-10-01T12:00:00Z')
const periodo = {
  estado: 'POSTULACION_ABIERTA' as const,
  fechaInicioPostulacion: '2026-09-20T00:00:00Z',
  fechaFinPostulacion: '2026-10-20T00:00:00Z',
}
const integrante = (
  id: string,
  rol: 'REPRESENTANTE' | 'INTEGRANTE',
  estado: 'ACTIVO' | 'RETIRADO' = 'ACTIVO',
) =>
  ({
    id: `i-${id}`,
    estudiante: { id, nombres: id, apellidos: '', email: '', cedula: '', matricula: '' },
    rolEnGrupo: rol,
    estado,
    fechaIngreso: '',
  }) satisfies Grupo['integrantes'][number]

const base: ContextoPostulacion = {
  tema: { disponible: true, minIntegrantes: 1, maxIntegrantes: 2 },
  modalidad: 'INDIVIDUAL',
  periodo,
  habilitacion: { estado: 'HABILITADO', situacionIngreso: 'ADMITIDO' },
  grupo: null,
  estudianteId: 'e1',
  postulacionActiva: null,
  ahora: AHORA,
}
const fallidas = (c: ContextoPostulacion) =>
  verificarPostulacion(c)
    .filter((v) => !v.ok)
    .map((v) => v.id)

describe('verificarPostulacion', () => {
  it('acepta una postulación individual válida', () => {
    expect(fallidas(base)).toEqual([])
  })

  it('RF-08: rechaza fuera de las fechas del período', () => {
    expect(fallidas({ ...base, ahora: new Date('2026-11-01T00:00:00Z') })).toContain('fechas')
    expect(fallidas({ ...base, periodo: { ...periodo, estado: 'POSTULACION_CERRADA' } })).toContain(
      'fechas',
    )
  })

  it('RN-03: rechaza a un estudiante no admitido o suspendido', () => {
    expect(
      fallidas({
        ...base,
        habilitacion: { estado: 'HABILITADO', situacionIngreso: 'NO_ADMITIDO' },
      }),
    ).toContain('habilitado')
    expect(
      fallidas({ ...base, habilitacion: { estado: 'SUSPENDIDO', situacionIngreso: 'ADMITIDO' } }),
    ).toContain('habilitado')
    expect(fallidas({ ...base, habilitacion: null })).toContain('habilitado')
  })

  it('RN-02: un condicionado pendiente sí puede postular', () => {
    expect(
      fallidas({ ...base, habilitacion: { estado: 'HABILITADO', situacionIngreso: 'PENDIENTE' } }),
    ).toEqual([])
  })

  it('RN-05: individual solo si el tema admite 1 integrante', () => {
    expect(
      fallidas({ ...base, tema: { ...base.tema, minIntegrantes: 2, maxIntegrantes: 3 } }),
    ).toContain('rango')
  })

  it('RN-08: rechaza si ya existe una postulación activa', () => {
    expect(fallidas({ ...base, postulacionActiva: { id: 'p1' } })).toContain('unica')
  })

  it('RF-07: rechaza temas no disponibles', () => {
    expect(fallidas({ ...base, tema: { ...base.tema, disponible: false } })).toContain('disponible')
  })

  describe('grupal', () => {
    const grupo = {
      integrantes: [
        integrante('e1', 'REPRESENTANTE'),
        integrante('e2', 'INTEGRANTE'),
        integrante('e3', 'INTEGRANTE', 'RETIRADO'),
      ],
    }
    const grupal: ContextoPostulacion = {
      ...base,
      modalidad: 'GRUPAL',
      grupo,
      tema: { disponible: true, minIntegrantes: 2, maxIntegrantes: 3 },
    }

    it('acepta un grupo dentro del rango (cuenta solo integrantes activos)', () => {
      expect(fallidas(grupal)).toEqual([])
    })

    it('RN-04: solo el representante puede postular al grupo', () => {
      expect(fallidas({ ...grupal, estudianteId: 'e2' })).toContain('grupo')
    })

    it('RN-05: un grupo necesita al menos 2 integrantes', () => {
      expect(
        fallidas({
          ...grupal,
          grupo: { integrantes: [integrante('e1', 'REPRESENTANTE')] },
          tema: { disponible: true, minIntegrantes: 1, maxIntegrantes: 3 },
        }),
      ).toContain('minimo-grupo')
    })

    it('RN-05: rechaza grupos por encima del máximo del tema', () => {
      expect(
        fallidas({ ...grupal, tema: { disponible: true, minIntegrantes: 1, maxIntegrantes: 1 } }),
      ).toContain('rango')
    })
  })
})

describe('utilidades', () => {
  it('esRepresentante ignora integrantes retirados', () => {
    expect(
      esRepresentante({ integrantes: [integrante('e1', 'REPRESENTANTE', 'RETIRADO')] }, 'e1'),
    ).toBe(false)
  })

  it('RF-11: el docente proponente se sugiere primero', () => {
    const docentes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(ordenarSugeridos(docentes, 'c').map((d) => d.id)).toEqual(['c', 'a', 'b'])
  })

  it('moverElemento reordena y respeta los límites', () => {
    expect(moverElemento(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moverElemento(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })
})
