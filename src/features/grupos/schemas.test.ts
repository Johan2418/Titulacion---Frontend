import { describe, expect, it } from 'vitest'
import { nombreGrupoSchema } from './schemas'

const mensaje = (v: string) => {
  const r = nombreGrupoSchema.safeParse(v)
  return r.success ? null : r.error.issues[0]?.message
}

describe('nombreGrupoSchema', () => {
  it.each([
    'Equipo Innovación',
    'Ñandú 2',
    'Grupo (A) & B #1',
    "O'Brien-Pérez_2",
    '数据 组',
    'Ωmega',
  ])('acepta %s', (v) => expect(mensaje(v)).toBeNull())

  it('recorta espacios y exige al menos un carácter', () => {
    expect(nombreGrupoSchema.parse('  Equipo  ')).toBe('Equipo')
    expect(mensaje('   ')).toMatch(/obligatorio/i)
  })

  it('limita a 120 caracteres', () => {
    expect(mensaje('a'.repeat(121))).toMatch(/120/)
    expect(mensaje('a'.repeat(120))).toBeNull()
  })

  it.each([
    'visita http://x.com',
    'WWW.sitio',
    'mira www.sitio',
    'a\u200Bb',
    'a\u202Eb',
    'a\u0007b',
    'a\nb',
  ])('rechaza enlaces y caracteres invisibles o de control: %j', (v) =>
    expect(mensaje(v)).toMatch(/enlaces/i),
  )

  it.each(['-inicio', '_inicio', ' (x', 'a.b', 'a/b', 'a@b', 'a<b', 'a😀'])(
    'rechaza caracteres fuera de la lista o inicio inválido: %j',
    (v) => expect(mensaje(v)).toMatch(/letras, números/i),
  )
})
