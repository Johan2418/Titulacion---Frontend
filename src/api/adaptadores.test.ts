import { describe, expect, it } from 'vitest'
import {
  auditoria,
  loteImportacion,
  type ImportacionHistorialB,
} from './adaptadores'
import { clavesACamel } from './casos'

const base: ImportacionHistorialB = {
  id: 'p1',
  tipo: 'ESTUDIANTES',
  periodoId: 'per1',
  nombreArchivo: 'a.xlsx',
  estado: 'LISTA',
  expirada: false,
  totalFilas: 5,
  filasOk: 3,
  filasError: 2,
  errores: [{ fila: 2, columna: 'nivel', mensaje: 'inválido' }],
  lote: null,
  solicitadaPor: { id: 'u1', nombres: 'Ada', apellidos: 'Admin' },
  creadaEn: '2026-10-01T00:00:00Z',
  expiraEn: '2026-10-01T12:00:00Z',
}

describe('loteImportacion', () => {
  it('trata una preparación en curso como EN_PROCESO y una vencida como FALLIDO', () => {
    expect(loteImportacion(base)).toMatchObject({ estado: 'EN_PROCESO', filasOk: 3, filasError: 2 })
    expect(loteImportacion({ ...base, expirada: true })).toMatchObject({
      estado: 'FALLIDO',
      expirada: true,
    })
    expect(loteImportacion(base).errores).toEqual([{ fila: 2, mensaje: 'nivel: inválido' }])
  })

  it('usa el estado y la fecha fin del lote cuando la importación se completó', () => {
    const l = loteImportacion({
      ...base,
      estado: 'COMPLETADA',
      lote: {
        id: 'l1',
        estado: 'COMPLETADO',
        totalFilas: 5,
        filasOk: 5,
        filasError: 0,
        fechaInicio: '2026-10-01T00:00:00Z',
        fechaFin: '2026-10-01T00:01:00Z',
      },
    })
    expect(l).toMatchObject({ estado: 'COMPLETADO', fechaFin: '2026-10-01T00:01:00Z' })
  })
})

describe('auditoria', () => {
  it('conserva el id como texto y las claves originales de los valores auditados', () => {
    const b = clavesACamel<Parameters<typeof auditoria>[0]>({
      id: '9007199254740993',
      actor: {
        id: 'u1',
        email: 'a@uleam.edu.ec',
        nombres: 'Ada',
        apellidos: 'Admin',
        rol: 'ADMIN',
      },
      accion: 'EDITAR_TEMA',
      entidad_tipo: 'tema',
      entidad_id: 'e1',
      valores_anteriores: { max_integrantes: 2 },
      valores_nuevos: { max_integrantes: 3 },
      ip_origen: '10.0.0.5',
      fecha_hora: '2026-10-02T10:00:00Z',
    })
    const a = auditoria(b)
    expect(a.id).toBe('9007199254740993')
    expect(a.usuario).toMatchObject({ email: 'a@uleam.edu.ec', rol: 'ADMIN' })
    expect(a.valoresNuevos).toEqual({ max_integrantes: 3 })
    expect(a.ipOrigen).toBe('10.0.0.5')
  })
})
