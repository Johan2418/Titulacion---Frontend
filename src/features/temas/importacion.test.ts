import { describe, expect, it } from 'vitest'
import {
  formularioImportacionTemas,
  nombresPendientes,
  PARAMETROS_IMPORTACION_INICIALES,
  puedeValidar,
  resolucionesCompletas,
  type FilaImportacionTema,
} from './importacion'

const fila = (over: Partial<FilaImportacionTema>): FilaImportacionTema => ({
  fila: 10,
  nro: '1',
  docenteExcel: 'ALMEIDA',
  titulo: 'Tema',
  descripcion: null,
  docente: null,
  candidatos: [],
  estado: 'LISTA',
  errores: [],
  advertencias: [],
  ...over,
})

describe('importación de temas', () => {
  it('solo valida con carrera, línea, tipo y archivo', () => {
    const archivo = new File(['x'], 'temas.xlsx')
    expect(puedeValidar(PARAMETROS_IMPORTACION_INICIALES)).toBe(false)
    expect(puedeValidar({ carreraId: 'c', lineaId: 'l', tipo: 'GRUPO', archivo: null })).toBe(false)
    expect(puedeValidar({ carreraId: 'c', lineaId: '', tipo: 'GRUPO', archivo })).toBe(false)
    expect(puedeValidar({ carreraId: 'c', lineaId: 'l', tipo: '', archivo })).toBe(false)
    expect(puedeValidar({ carreraId: 'c', lineaId: 'l', tipo: 'GRUPO', archivo })).toBe(true)
  })

  it('arma el multipart con los nombres que espera el backend', () => {
    const archivo = new File(['x'], 'temas.xlsx')
    const fd = formularioImportacionTemas({ archivo, carreraId: 'c', lineaId: 'l', tipo: 'PAREJA' })
    expect(fd.get('archivo')).toBe(archivo)
    expect([fd.get('carrera_id'), fd.get('linea_id'), fd.get('tipo')]).toEqual(['c', 'l', 'PAREJA'])
  })

  it('lista los nombres pendientes sin repetir y exige elegir docente para cada uno', () => {
    const filas = [
      fila({ estado: 'PENDIENTE_DOCENTE', docenteExcel: 'PÉREZ' }),
      fila({ estado: 'PENDIENTE_DOCENTE', docenteExcel: 'PÉREZ', fila: 11 }),
      fila({ estado: 'PENDIENTE_DOCENTE', docenteExcel: 'RUIZ', fila: 12 }),
      fila({ estado: 'LISTA', docenteExcel: 'ALMEIDA', fila: 13 }),
    ]
    expect(nombresPendientes(filas)).toEqual(['PÉREZ', 'RUIZ'])
    expect(resolucionesCompletas(filas, { PÉREZ: 'd1' })).toBe(false)
    expect(resolucionesCompletas(filas, { PÉREZ: 'd1', RUIZ: 'd2' })).toBe(true)
    expect(resolucionesCompletas([fila({})], {})).toBe(false)
  })
})
