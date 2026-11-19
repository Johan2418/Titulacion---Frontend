import { describe, expect, it } from 'vitest'
import { camposProgramaTema, temaSchemaPara } from './schemas'

const tema = {
  titulo: 'Detección de plagas',
  descripcion: 'Descripción suficientemente larga',
  carreraId: 'c1',
  lineaId: 'l1',
  docenteProponenteId: 'd1',
  tipo: 'GRUPO',
  programaId: '',
  categoria: '',
}

describe('temaSchemaPara', () => {
  it('el programa es opcional para ADMIN y obligatorio para COORDINADOR', () => {
    expect(temaSchemaPara(false).safeParse(tema).success).toBe(true)
    const r = temaSchemaPara(true).safeParse(tema)
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Seleccione el programa del tema.')
  })

  it('limita la categoría a 120 caracteres', () => {
    expect(temaSchemaPara(false).safeParse({ ...tema, categoria: 'x'.repeat(121) }).success).toBe(
      false,
    )
  })
})

describe('camposProgramaTema', () => {
  it('al crear omite los vacíos', () => {
    expect(camposProgramaTema({ programaId: '', categoria: '  ' })).toEqual({})
    expect(camposProgramaTema({ programaId: 'p1', categoria: ' IA ' })).toEqual({
      programaId: 'p1',
      categoria: 'IA',
    })
  })

  it('al editar envía solo lo que cambió y null para quitar', () => {
    const original = { programaId: 'p1', categoria: 'IA' }
    expect(camposProgramaTema({ programaId: 'p1', categoria: 'IA' }, original)).toEqual({})
    expect(camposProgramaTema({ programaId: '', categoria: '' }, original)).toEqual({
      programaId: null,
      categoria: null,
    })
  })
})
