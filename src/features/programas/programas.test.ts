import { describe, expect, it } from 'vitest'
import type { Programa, Tema } from '@/types/dominio'
import { consultaProgramas } from './api'
import { agruparPorPrograma, opcionesResponsables, puedeEditarPrograma } from './reglas'
import { cuerpoPrograma, programaSchema, type ProgramaForm } from './schemas'

const base: ProgramaForm = {
  nombre: ' Robótica ',
  descripcion: '',
  carreraId: 'c1',
  tipoResponsable: 'DOCENTE',
  responsableDocenteId: 'd1',
  responsableUsuarioId: '',
  maxTemas: 15,
  activo: true,
}

describe('programaSchema: exactamente un responsable', () => {
  it('acepta un docente o un coordinador', () => {
    expect(programaSchema.safeParse(base).success).toBe(true)
    expect(
      programaSchema.safeParse({
        ...base,
        tipoResponsable: 'COORDINADOR',
        responsableDocenteId: '',
        responsableUsuarioId: 'u1',
      }).success,
    ).toBe(true)
  })

  it('rechaza la ausencia de responsable', () => {
    const r = programaSchema.safeParse({ ...base, responsableDocenteId: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]).toMatchObject({
      path: ['responsableDocenteId'],
      message: 'Seleccione el docente responsable.',
    })
  })

  it('rechaza dos responsables a la vez', () => {
    const r = programaSchema.safeParse({ ...base, responsableUsuarioId: 'u1' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe(
      'Indique un único responsable: un docente o un coordinador.',
    )
  })

  it('limita max_temas a 1..50', () => {
    expect(programaSchema.safeParse({ ...base, maxTemas: 0 }).success).toBe(false)
    expect(programaSchema.safeParse({ ...base, maxTemas: 51 }).success).toBe(false)
  })
})

describe('cuerpoPrograma', () => {
  it('ADMIN envía solo el responsable elegido', () => {
    expect(cuerpoPrograma(base, { editando: false })).toEqual({
      nombre: 'Robótica',
      carreraId: 'c1',
      maxTemas: 15,
      responsableDocenteId: 'd1',
    })
  })

  it('el COORDINADOR crea como responsable y al editar no envía responsable', () => {
    const form = {
      ...base,
      tipoResponsable: 'COORDINADOR' as const,
      responsableDocenteId: '',
      responsableUsuarioId: 'yo',
    }
    expect(cuerpoPrograma(form, { editando: false, coordinadorId: 'yo' })).toMatchObject({
      responsableUsuarioId: 'yo',
    })
    const edicion = cuerpoPrograma(form, { editando: true, coordinadorId: 'yo' })
    expect(edicion).not.toHaveProperty('responsableUsuarioId')
    expect(edicion).not.toHaveProperty('responsableDocenteId')
    expect(edicion).toMatchObject({ activo: true, descripcion: null })
  })
})

describe('consultaProgramas', () => {
  it('omite filtros vacíos y envía mios/activo como texto', () => {
    expect(consultaProgramas({ carreraId: '', mios: true, activo: false })).toEqual({
      carreraId: undefined,
      facultadId: undefined,
      responsableDocenteId: undefined,
      responsableUsuarioId: undefined,
      mios: 'true',
      activo: 'false',
    })
  })
})

const programa = (id: string, nombre: string, resp: Programa['responsable']) =>
  ({
    id,
    nombre,
    responsable: resp,
    responsableUsuarioId: resp.tipo === 'COORDINADOR' ? resp.id : null,
  }) as Programa

describe('reglas de programas', () => {
  it('COORDINADOR edita solo sus programas; ADMIN todos', () => {
    const p = programa('p1', 'A', { tipo: 'COORDINADOR', id: 'u1', nombres: 'A', apellidos: 'B' })
    expect(puedeEditarPrograma({ id: 'u1', rol: 'COORDINADOR' }, p)).toBe(true)
    expect(puedeEditarPrograma({ id: 'u2', rol: 'COORDINADOR' }, p)).toBe(false)
    expect(puedeEditarPrograma({ id: 'x', rol: 'ADMIN' }, p)).toBe(true)
    expect(puedeEditarPrograma({ id: 'u1', rol: 'DOCENTE' }, p)).toBe(false)
  })

  it('opciones de responsable únicas con su tipo', () => {
    const r = { tipo: 'DOCENTE' as const, id: 'd1', nombres: 'Ana', apellidos: 'Mora' }
    expect(opcionesResponsables([programa('p1', 'A', r), programa('p2', 'B', r)])).toEqual([
      { value: 'DOCENTE:d1', label: 'Ana Mora (docente)' },
    ])
  })

  it('agrupa temas por programa y deja al final los que no tienen', () => {
    const tema = (id: string, prog: Tema['programa']) => ({ id, programa: prog }) as Tema
    const grupos = agruparPorPrograma([
      tema('t1', { id: 'b', nombre: 'Visión' }),
      tema('t2', null),
      tema('t3', { id: 'a', nombre: 'Agro' }),
      tema('t4', { id: 'b', nombre: 'Visión' }),
    ])
    expect(grupos.map((g) => [g.programa?.nombre ?? null, g.temas.map((t) => t.id)])).toEqual([
      ['Agro', ['t3']],
      ['Visión', ['t1', 't4']],
      [null, ['t2']],
    ])
  })
})
