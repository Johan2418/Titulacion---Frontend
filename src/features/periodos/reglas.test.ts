import { describe, expect, it } from 'vitest'
import { esAccionForzada, evaluarTransicion, facultadBloqueada } from './reglas'

describe('facultadBloqueada', () => {
  it('locks the faculty outside BORRADOR', () => {
    expect(facultadBloqueada(false, 0)).toBe(true)
  })

  it('locks the faculty in BORRADOR only when the period has enabled students', () => {
    expect(facultadBloqueada(true, 2)).toBe(true)
    expect(facultadBloqueada(true, 0)).toBe(false)
  })

  it('keeps the faculty editable in BORRADOR while the summary is not loaded', () => {
    expect(facultadBloqueada(true, undefined)).toBe(false)
  })
})

describe('evaluarTransicion', () => {
  const periodo = {
    fechaInicioPostulacion: '2026-11-10T00:00:00Z',
    fechaFinPostulacion: '2026-11-20T00:00:00Z',
    fechaInicioTitulacion: '2026-11-25T00:00:00Z',
  }
  const en = (iso: string) => new Date(iso)

  it('abrir: normal dentro del plazo, forzable antes del inicio, bloqueada con el fin vencido', () => {
    expect(evaluarTransicion('abrir', periodo, en('2026-11-15T00:00:00Z'))).toEqual({
      tipo: 'normal',
    })
    expect(evaluarTransicion('abrir', periodo, en('2026-11-01T00:00:00Z'))).toEqual({
      tipo: 'forzable',
      campo: 'fechaInicioPostulacion',
    })
    expect(evaluarTransicion('abrir', periodo, en('2026-11-21T00:00:00Z')).tipo).toBe('bloqueada')
  })

  it('cerrar: forzable antes del fin y normal desde el fin', () => {
    expect(evaluarTransicion('cerrar', periodo, en('2026-11-15T00:00:00Z'))).toEqual({
      tipo: 'forzable',
      campo: 'fechaFinPostulacion',
    })
    expect(evaluarTransicion('cerrar', periodo, en('2026-11-20T00:00:00Z'))).toEqual({
      tipo: 'normal',
    })
  })

  it('iniciar: forzable tras el fin de postulación y bloqueada antes', () => {
    expect(evaluarTransicion('iniciar', periodo, en('2026-11-22T00:00:00Z'))).toEqual({
      tipo: 'forzable',
      campo: 'fechaInicioTitulacion',
    })
    expect(evaluarTransicion('iniciar', periodo, en('2026-11-26T00:00:00Z'))).toEqual({
      tipo: 'normal',
    })
    const bloqueada = evaluarTransicion('iniciar', periodo, en('2026-11-15T00:00:00Z'))
    expect(bloqueada).toEqual({
      tipo: 'bloqueada',
      motivo: 'No se puede forzar el inicio: el plazo de postulación aún no vence.',
    })
  })
})

describe('esAccionForzada', () => {
  it('reconoce las acciones de auditoría *_FORZADA', () => {
    expect(esAccionForzada('CERRAR_POSTULACION_FORZADA')).toBe(true)
    expect(esAccionForzada('CERRAR_POSTULACION')).toBe(false)
  })
})
