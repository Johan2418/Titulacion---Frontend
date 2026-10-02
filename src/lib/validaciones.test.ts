import { describe, expect, it } from 'vitest'
import { revisionSchema } from '@/features/pat/schemas'
import { periodoSchema } from '@/features/periodos/schemas'
import { temaSchema } from '@/features/temas/schemas'
import { MAX_TAMANO_PAT, TIPOS_PAT, validarArchivo } from './archivos'
import { inputLocalToIso, isoToInputLocal } from './fechas'
import { mensajeError } from './errores'
import { ApiError } from '@/api/client'

describe('temaSchema (CHECK min/max integrantes)', () => {
  const tema = {
    titulo: 'Tema válido',
    descripcion: 'Una descripción suficiente',
    lineaId: 'l',
    docenteProponenteId: 'd',
    minIntegrantes: 1,
    maxIntegrantes: 2,
  }
  it('acepta un rango válido', () => expect(temaSchema.safeParse(tema).success).toBe(true))
  it('rechaza min < 1', () =>
    expect(temaSchema.safeParse({ ...tema, minIntegrantes: 0 }).success).toBe(false))
  it('rechaza max < min', () => {
    const r = temaSchema.safeParse({ ...tema, minIntegrantes: 3, maxIntegrantes: 2 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toEqual(['maxIntegrantes'])
  })
})

describe('periodoSchema (CHECK de fechas)', () => {
  const p = {
    codigo: '2027-1',
    nombre: 'P',
    fechaInicioPostulacion: '2027-01-01T08:00',
    fechaFinPostulacion: '2027-01-20T08:00',
    fechaInicioTitulacion: '2027-02-01T08:00',
    maxIntegrantesDefault: 3,
  }
  it('acepta fechas ordenadas', () => expect(periodoSchema.safeParse(p).success).toBe(true))
  it('rechaza fin de postulación anterior al inicio', () =>
    expect(periodoSchema.safeParse({ ...p, fechaFinPostulacion: '2026-12-01T08:00' }).success).toBe(
      false,
    ))
  it('rechaza inicio de titulación antes del fin de postulación', () =>
    expect(
      periodoSchema.safeParse({ ...p, fechaInicioTitulacion: '2027-01-10T08:00' }).success,
    ).toBe(false))
})

describe('revisionSchema (RN-12)', () => {
  it('aprobar no exige observaciones', () =>
    expect(revisionSchema.safeParse({ resultado: 'APROBADO' }).success).toBe(true))
  it('observar o rechazar exige observaciones', () => {
    expect(revisionSchema.safeParse({ resultado: 'OBSERVADO', observaciones: '  ' }).success).toBe(
      false,
    )
    expect(revisionSchema.safeParse({ resultado: 'RECHAZADO' }).success).toBe(false)
    expect(
      revisionSchema.safeParse({ resultado: 'OBSERVADO', observaciones: 'Ajustar objetivos' })
        .success,
    ).toBe(true)
  })
})

describe('validarArchivo (RNF-09 / RNF-14)', () => {
  const reglas = { tipos: TIPOS_PAT, maxBytes: MAX_TAMANO_PAT }
  const archivo = (nombre: string, tipo: string, bytes = 10) =>
    new File([new Uint8Array(bytes)], nombre, { type: tipo })
  it('acepta PDF y DOCX', () => {
    expect(validarArchivo(archivo('pat.pdf', 'application/pdf'), reglas)).toBeNull()
    expect(validarArchivo(archivo('pat.docx', TIPOS_PAT.docx[0]), reglas)).toBeNull()
  })
  it('rechaza extensiones no permitidas', () =>
    expect(validarArchivo(archivo('pat.exe', 'application/x-msdownload'), reglas)).toMatch(
      /Formato no permitido/,
    ))
  it('rechaza un tipo de contenido que no corresponde', () =>
    expect(validarArchivo(archivo('pat.pdf', 'image/png'), reglas)).toMatch(/no corresponde/))
  it('rechaza archivos vacíos o demasiado grandes', () => {
    expect(validarArchivo(archivo('pat.pdf', 'application/pdf', 0), reglas)).toMatch(/vacío/)
    expect(
      validarArchivo(archivo('pat.pdf', 'application/pdf', MAX_TAMANO_PAT + 1), reglas),
    ).toMatch(/tamaño máximo/)
  })
  it('exige un archivo', () => expect(validarArchivo(null, reglas)).toMatch(/Debe seleccionar/))
})

describe('fechas en zona institucional (RNF-30)', () => {
  it('convierte ida y vuelta entre ISO y datetime-local', () => {
    const iso = '2026-10-01T17:30:00.000Z'
    expect(inputLocalToIso(isoToInputLocal(iso))).toBe(iso)
  })
  it('usa la zona America/Guayaquil (UTC-5)', () => {
    expect(isoToInputLocal('2026-10-01T17:30:00.000Z')).toBe('2026-10-01T12:30')
  })
})

describe('mensajeError (RNF-16)', () => {
  it('incluye la regla incumplida', () => {
    const e = new ApiError({
      statusCode: 409,
      code: 'RANGO',
      message: 'Fuera de rango.',
      regla: 'RN-05',
    })
    expect(mensajeError(e)).toBe('Fuera de rango. (RN-05)')
  })
  it('traduce 403 a un mensaje claro', () => {
    expect(
      mensajeError(new ApiError({ statusCode: 403, code: 'X', message: 'Forbidden' })),
    ).toMatch(/permisos/)
  })
})
