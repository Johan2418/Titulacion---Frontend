import { describe, expect, it } from 'vitest'
import {
  loteImportacion,
  type ImportacionHistorialB,
} from './adaptadores'

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
