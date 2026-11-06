import { describe, expect, it } from 'vitest'
import {
  asignacionTema,
  auditoria,
  docente,
  docenteDisponible,
  habilitado,
  loteImportacion,
  postulacion,
  type AsignacionTemaB,
  type DocenteB,
  type HabilitadoB,
  type ImportacionHistorialB,
  type PostulacionB,
  type TemaB,
  type TutorDisponibleB,
  tema,
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

  it('deja el usuario nulo en acciones automáticas del sistema', () => {
    const b = clavesACamel<Parameters<typeof auditoria>[0]>({
      id: '10',
      actor: null,
      accion: 'CERRAR_POSTULACION',
      entidad_tipo: 'periodo_titulacion',
      entidad_id: 'p1',
      valores_anteriores: { estado: 'POSTULACION_ABIERTA' },
      valores_nuevos: { estado: 'POSTULACION_CERRADA', automatico: true },
      ip_origen: null,
      fecha_hora: '2026-10-02T10:00:00Z',
    })
    expect(auditoria(b).usuario).toBeNull()
  })
})

describe('postulacion', () => {
  it('usa los tutores propuestos embebidos por el backend, ordenados por prioridad', () => {
    const b = clavesACamel<PostulacionB>({
      id: 'p1',
      periodo_id: 'per1',
      tema: { id: 't1', titulo: 'Tema', min_integrantes: 1, max_integrantes: 2 },
      grupo_id: null,
      grupo: null,
      estudiante_id: 'e1',
      participantes: [{ id: 'e1', nombres: 'Ana', apellidos: 'Pérez', matricula: 'M1' }],
      num_integrantes: 1,
      registrada_por: { id: 'u1', nombres: 'Ana', apellidos: 'Pérez' },
      estado: 'PENDIENTE',
      fecha_postulacion: '2026-10-01T00:00:00Z',
      observacion: null,
      tutores_propuestos: [
        {
          id: 'tp2',
          postulacion_id: 'p1',
          docente_id: 'd2',
          orden_prioridad: 2,
          docente: { id: 'd2', nombres: 'B', apellidos: 'Doc' },
          es_proponente_tema: false,
        },
        {
          id: 'tp1',
          postulacion_id: 'p1',
          docente_id: 'd1',
          orden_prioridad: 1,
          docente: { id: 'd1', nombres: 'A', apellidos: 'Doc' },
          es_proponente_tema: true,
        },
      ],
    })
    const p = postulacion(b)
    expect(p.tutoresPropuestos.map((t) => [t.docente.id, t.ordenPrioridad])).toEqual([
      ['d1', 1],
      ['d2', 2],
    ])
    expect(p.tutoresPropuestos[0].esProponenteTema).toBe(true)
    expect(postulacion({ ...b, tutoresPropuestos: undefined }).tutoresPropuestos).toEqual([])
  })
})

describe('habilitado', () => {
  it('toma correo, cédula, carrera, nivel y responsable de la respuesta del backend', () => {
    const b = clavesACamel<HabilitadoB>({
      id: 'h1',
      periodo_id: 'per1',
      estudiante_id: 'e1',
      estudiante: {
        id: 'e1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        matricula: 'M1',
        email: 'e1@live.uleam.edu.ec',
        cedula: '1300000001',
        carrera: { id: 'c1', nombre: 'Software' },
        nivel: 9,
      },
      origen: 'MANUAL',
      lote_importacion_id: null,
      estado: 'HABILITADO',
      condicion_ingreso: 'CONDICIONADO',
      requisito_pendiente: null,
      situacion_ingreso: 'ADMITIDO',
      fecha_habilitacion: '2026-10-01T00:00:00Z',
      fecha_resolucion_ingreso: '2026-10-02T00:00:00Z',
      resuelto_por_id: 'u9',
      resuelto_por: { id: 'u9', nombres: 'Ada', apellidos: 'Admin' },
      observacion_ingreso: null,
    })
    const h = habilitado(b)
    expect(h.estudiante).toMatchObject({
      email: 'e1@live.uleam.edu.ec',
      cedula: '1300000001',
      carrera: { id: 'c1', nombre: 'Software' },
      nivel: 9,
    })
    expect(h.resueltoPor).toMatchObject({ id: 'u9', nombres: 'Ada', apellidos: 'Admin' })
    expect(habilitado({ ...b, resueltoPor: undefined }).resueltoPor).toBeNull()
  })
})

describe('carrera', () => {
  it('el docente toma la carrera de la respuesta del backend', () => {
    const b = clavesACamel<DocenteB>({
      id: 'd1',
      usuario: {
        id: 'u1',
        email: 'd1@uleam.edu.ec',
        nombres: 'Dora',
        apellidos: 'Docente',
        rol: 'DOCENTE',
        estado: 'ACTIVO',
        creado_en: '2026-10-01T00:00:00Z',
      },
      cedula: null,
      titulo_academico: null,
      carrera_id: 'c1',
      carrera: { id: 'c1', nombre: 'Software' },
      habilitado_tutoria: true,
    })
    const d = docente(b)
    expect(d.carrera).toEqual({ id: 'c1', nombre: 'Software' })
    expect(d).not.toHaveProperty('departamento')
  })

  it('el tutor disponible conserva solo el id de su carrera', () => {
    const b = clavesACamel<TutorDisponibleB>({
      id: 'd1',
      nombres: 'Dora',
      apellidos: 'Docente',
      titulo_academico: null,
      carrera_id: 'c1',
      es_proponente_tema: false,
    })
    expect(docenteDisponible(b).carrera).toEqual({ id: 'c1', nombre: '' })
  })

  it('el tema incluye su carrera', () => {
    const b = clavesACamel<TemaB>({
      id: 't1',
      periodo_id: 'per1',
      carrera_id: 'c1',
      carrera: { id: 'c1', nombre: 'Software' },
      linea: { id: 'l1', codigo: 'L1', nombre: 'IA' },
      docente_proponente: { id: 'd1', nombres: 'Dora', apellidos: 'Docente' },
      titulo: 'Tema',
      descripcion: 'Desc',
      min_integrantes: 1,
      max_integrantes: 3,
      estado: 'PUBLICADO',
      creado_en: '2026-10-01T00:00:00Z',
      disponible: true,
      postulaciones_abiertas: 0,
    })
    expect(tema(b).carrera).toEqual({ id: 'c1', nombre: 'Software' })
  })
})

describe('asignacionTema', () => {
  it('incluye el nombre de quien anuló la asignación', () => {
    const b = clavesACamel<AsignacionTemaB>({
      id: 'a1',
      periodo_id: 'per1',
      tema: { id: 't1', titulo: 'Tema' },
      postulacion_id: 'p1',
      postulacion: { id: 'p1', modalidad: 'INDIVIDUAL' },
      grupo: null,
      estudiante_id: 'e1',
      participantes: [{ id: 'e1', nombres: 'Ana', apellidos: 'Pérez', matricula: 'M1' }],
      aprobada_por: { id: 'u1', nombres: 'Ada', apellidos: 'Admin' },
      estado: 'ANULADA',
      fecha_asignacion: '2026-10-01T00:00:00Z',
      motivo: null,
      causa_anulacion: 'OTRA',
      motivo_anulacion: 'Cambio de tema',
      anulada_por: { id: 'u2', nombres: 'Bea', apellidos: 'Admin' },
      fecha_anulacion: '2026-10-03T00:00:00Z',
    })
    expect(asignacionTema(b).anuladaPor).toMatchObject({
      id: 'u2',
      nombres: 'Bea',
      apellidos: 'Admin',
    })
  })
})
