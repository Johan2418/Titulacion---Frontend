import { describe, expect, it } from 'vitest'
import { formularioImportacion } from './importacion'

describe('formularioImportacion', () => {
  it('envía el archivo y la carrera con el nombre literal carrera_id', () => {
    const archivo = new File(['x'], 'datos.xlsx')
    const fd = formularioImportacion(archivo, 'c-sof')
    expect(fd.get('archivo')).toBeInstanceOf(File)
    expect((fd.get('archivo') as File).name).toBe('datos.xlsx')
    expect(fd.get('carrera_id')).toBe('c-sof')
    expect(fd.has('carreraId')).toBe(false)
  })
})
