// @vitest-environment node
/**
 * Pruebas de integración del flujo principal contra los mocks de la API.
 * Verifican que el cliente HTTP, los DTO y las reglas de negocio (RN-xx) simuladas
 * se comportan como el contrato esperado del backend.
 */
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { api, ApiError, configurarCliente } from '@/api/client'
import type {
  AsignacionTema,
  AsignacionTutor,
  DocumentoPat,
  EstudianteHabilitado,
  Grupo,
  Postulacion,
  Tema,
} from '@/types/dominio'
import { reiniciarDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)
let usuario = 'usr-admin'
const como = (u: string) => (usuario = u)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  configurarCliente({ obtenerToken: () => `mock:${usuario}`, alNoAutorizado: () => {} })
})
afterAll(() => server.close())
beforeEach(() => {
  reiniciarDb()
  como('usr-admin')
})

async function falla(p: Promise<unknown>) {
  try {
    await p
  } catch (e) {
    return e as ApiError
  }
  throw new Error('Se esperaba un error')
}

describe('autorización (RNF-03 / RNF-04)', () => {
  it('rechaza peticiones sin sesión válida', async () => {
    como('desconocido')
    expect((await falla(api.get('/auth/me'))).status).toBe(401)
  })
  it('distingue cuenta no registrada (403) y autenticación caída (503)', async () => {
    como('no-registrado')
    expect(await falla(api.get('/auth/me'))).toMatchObject({
      status: 403,
      code: 'USUARIO_NO_REGISTRADO',
    })
    como('auth-caida')
    expect(await falla(api.get('/auth/me'))).toMatchObject({
      status: 503,
      code: 'AUTH_NO_DISPONIBLE',
    })
  })
  it('simula la etapa actual del backend: identidad sin perfil', async () => {
    como('solo-identidad')
    expect(await api.get('/auth/me')).toEqual({
      subject: expect.any(String),
      issuer: expect.any(String),
    })
  })
  it('un estudiante no puede usar endpoints de administración', async () => {
    como('usr-est-4')
    expect((await falla(api.get('/asignaciones-tema'))).status).toBe(403)
  })
})

describe('grupos e invitaciones (RF-01 a RF-03)', () => {
  it('crea grupo, invita y el invitado acepta', async () => {
    como('usr-est-4')
    const g = await api.post<Grupo>('/grupos', { periodoId: 'per-2026-2', nombre: 'Equipo Torres' })
    expect(g.integrantes[0].rolEnGrupo).toBe('REPRESENTANTE')
    const inv = await api.post<{ id: string }>(`/grupos/${g.id}/invitaciones`, {
      estudianteId: 'est-15',
    })
    // RF-02: una sola invitación pendiente por grupo y destinatario
    expect(
      (await falla(api.post(`/grupos/${g.id}/invitaciones`, { estudianteId: 'est-15' }))).code,
    ).toBe('INVITACION_DUPLICADA')
    como('usr-est-15')
    await api.post(`/invitaciones/${inv.id}/aceptar`)
    const mio = await api.get<Grupo>('/me/grupo', { periodoId: 'per-2026-2' })
    expect(mio.estado).toBe('ACTIVO')
    expect(mio.integrantes).toHaveLength(2)
  })

  it('RN-06: un estudiante no puede estar en dos grupos activos', async () => {
    como('usr-est-1')
    expect(
      (await falla(api.post('/grupos', { periodoId: 'per-2026-2', nombre: 'Otro' }))).regla,
    ).toBe('RN-06')
  })

  it('RF-03: tras postular, la composición queda cerrada', async () => {
    como('usr-est-1')
    expect(
      (await falla(api.post('/grupos/grp-1/invitaciones', { estudianteId: 'est-15' }))).code,
    ).toBe('COMPOSICION_CERRADA')
  })
})

describe('postulación (RF-04, RF-08 a RF-11)', () => {
  it('postula individualmente y queda PENDIENTE', async () => {
    como('usr-est-4')
    const p = await api.post<Postulacion>('/postulaciones', {
      temaId: 'tem-1',
      modalidad: 'INDIVIDUAL',
      tutores: ['doc-1', 'doc-3'],
    })
    expect(p.estado).toBe('PENDIENTE')
    expect(p.tutoresPropuestos[0]).toMatchObject({ ordenPrioridad: 1, esProponenteTema: true })
  })

  it('RN-05: rechaza individual en tema que exige al menos 2 integrantes', async () => {
    como('usr-est-4')
    expect(
      (
        await falla(
          api.post('/postulaciones', {
            temaId: 'tem-7',
            modalidad: 'INDIVIDUAL',
            tutores: ['doc-6'],
          }),
        )
      ).regla,
    ).toBe('RN-05')
  })

  it('RN-08: no permite una segunda postulación activa', async () => {
    como('usr-est-5')
    expect(
      (
        await falla(
          api.post('/postulaciones', {
            temaId: 'tem-1',
            modalidad: 'INDIVIDUAL',
            tutores: ['doc-1'],
          }),
        )
      ).regla,
    ).toBe('RN-08')
  })

  it('RN-04: un integrante de un grupo que postuló no puede postular individualmente', async () => {
    como('usr-est-2')
    expect(
      (
        await falla(
          api.post('/postulaciones', {
            temaId: 'tem-1',
            modalidad: 'INDIVIDUAL',
            tutores: ['doc-1'],
          }),
        )
      ).regla,
    ).toBe('RN-04')
  })

  it('genera conflicto cuando dos postulaciones compiten por el tema', async () => {
    como('usr-est-4')
    await api.post('/postulaciones', {
      temaId: 'tem-6',
      modalidad: 'INDIVIDUAL',
      tutores: ['doc-3'],
    })
    como('usr-admin')
    const ps = await api.get<Postulacion[]>('/postulaciones', {
      periodoId: 'per-2026-2',
      temaId: 'tem-6',
    })
    expect(ps.map((p) => p.estado)).toEqual(['EN_CONFLICTO', 'EN_CONFLICTO'])
  })
})

describe('conflicto y asignación (RF-23 a RF-25, RN-07)', () => {
  it('resuelve el conflicto, asigna el tema y rechaza las demás postulaciones', async () => {
    await api.post('/resoluciones-conflicto', {
      temaId: 'tem-3',
      criterioAplicado: 'ORDEN_LLEGADA',
      postulacionGanadoraId: 'pos-2',
      justificacion: 'Primera en postular.',
      participantes: [
        { postulacionId: 'pos-2', puntajeCriterio: 1 },
        { postulacionId: 'pos-3', puntajeCriterio: 2 },
      ],
    })
    const a = await api.post<AsignacionTema>('/asignaciones-tema', { postulacionId: 'pos-2' })
    expect(a.estado).toBe('VIGENTE')
    const t = await api.get<Tema>('/temas/tem-3')
    expect(t.estado).toBe('ASIGNADO')
    expect(t.disponible).toBe(false)
    const perdedora = await api.get<Postulacion>('/postulaciones/pos-3')
    expect(perdedora.estado).toBe('RECHAZADA')
  })

  it('exige justificación para resolver un conflicto', async () => {
    const e = await falla(
      api.post('/resoluciones-conflicto', {
        temaId: 'tem-3',
        criterioAplicado: 'SORTEO',
        postulacionGanadoraId: 'pos-2',
        justificacion: ' ',
      }),
    )
    expect(e.code).toBe('JUSTIFICACION_REQUERIDA')
  })

  it('no asigna un tema que ya tiene asignación vigente', async () => {
    expect((await falla(api.post('/asignaciones-tema', { postulacionId: 'pos-4' }))).regla).toBe(
      'RN-07',
    )
  })

  it('la anulación conserva la asignación y libera el tema (RN-13)', async () => {
    const a = await api.post<AsignacionTema>('/asignaciones-tema/asg-1/anular', {
      causaAnulacion: 'OTRA',
      motivoAnulacion: 'Solicitud del estudiante',
    })
    expect(a).toMatchObject({ estado: 'ANULADA', motivoAnulacion: 'Solicitud del estudiante' })
    expect((await api.get<Tema>('/temas/tem-4')).estado).toBe('PUBLICADO')
  })
})

describe('tutor y carga tutorial (RF-27, RF-30, RN-11)', () => {
  it('bloquea al superar un límite configurado como bloqueante', async () => {
    await api.post('/asignaciones-tema/asg-2/tutor', { docenteId: 'doc-2' })
    // doc-2 tiene límite específico 1 con bloqueo: un segundo trabajo debe rechazarse
    const e = await falla(
      api.post('/asignaciones-tema/asg-1/tutor', {
        docenteId: 'doc-2',
        motivoCambio: 'Cambio de línea',
      }),
    )
    expect(e.code).toBe('CARGA_TUTORIAL_EXCEDIDA')
  })

  it('advierte al superar un límite global no bloqueante y permite confirmar', async () => {
    await api.put('/periodos/per-2026-2/config-carga', {
      docenteId: null,
      maxTrabajos: 1,
      bloquearAlSuperar: false,
    })
    const e = await falla(api.post('/asignaciones-tema/asg-2/tutor', { docenteId: 'doc-6' }))
    expect(e.code).toBe('CARGA_TUTORIAL_ADVERTENCIA')
    const t = await api.post<AsignacionTutor>('/asignaciones-tema/asg-2/tutor', {
      docenteId: 'doc-6',
      confirmarExceso: true,
    })
    expect(t.estado).toBe('VIGENTE')
  })

  it('el reemplazo exige motivo y conserva el historial', async () => {
    expect(
      (await falla(api.post('/asignaciones-tema/asg-1/tutor', { docenteId: 'doc-3' }))).code,
    ).toBe('MOTIVO_REQUERIDO')
    await api.post('/asignaciones-tema/asg-1/tutor', {
      docenteId: 'doc-3',
      motivoCambio: 'Licencia',
    })
    const h = await api.get<AsignacionTutor[]>('/asignaciones-tema/asg-1/tutores')
    expect(h.map((x) => x.estado).sort()).toEqual(['REEMPLAZADA', 'VIGENTE'])
  })
})

describe('PAT (RF-13, RF-14, RF-31, RN-12)', () => {
  it('no permite cargar una nueva versión mientras la anterior está pendiente', async () => {
    como('usr-est-9')
    const fd = new FormData()
    fd.append('archivo', new File(['%PDF-1.4'], 'pat.pdf', { type: 'application/pdf' }))
    expect((await falla(api.post('/asignaciones-tema/asg-1/documentos-pat', fd))).code).toBe(
      'PAT_EN_REVISION',
    )
  })

  it('observar exige observaciones; tras observar se carga la versión 3 con hash', async () => {
    expect(
      (await falla(api.post('/documentos-pat/doc-pat-2/revision', { resultado: 'OBSERVADO' })))
        .regla,
    ).toBe('RN-12')
    await api.post('/documentos-pat/doc-pat-2/revision', {
      resultado: 'OBSERVADO',
      observaciones: 'Falta el cronograma.',
    })
    como('usr-est-9')
    const fd = new FormData()
    fd.append(
      'archivo',
      new File(['%PDF-1.4 contenido'], 'pat-v3.pdf', { type: 'application/pdf' }),
    )
    const d = await api.post<DocumentoPat>('/asignaciones-tema/asg-1/documentos-pat', fd)
    expect(d.version).toBe(3)
    expect(d.hashSha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('RNF-09: rechaza formatos distintos de PDF o DOCX', async () => {
    await api.post('/documentos-pat/doc-pat-2/revision', {
      resultado: 'RECHAZADO',
      observaciones: 'Rehacer.',
    })
    como('usr-est-9')
    const fd = new FormData()
    fd.append('archivo', new File(['x'], 'pat.txt', { type: 'text/plain' }))
    expect((await falla(api.post('/asignaciones-tema/asg-1/documentos-pat', fd))).code).toBe(
      'FORMATO_INVALIDO',
    )
  })
})

describe('condicionados (RN-02, RN-03)', () => {
  it('no se inicia la titulación con condicionados pendientes', async () => {
    await api.post('/periodos/per-2026-2/estado', { estado: 'POSTULACION_CERRADA' })
    expect(
      (await falla(api.post('/periodos/per-2026-2/estado', { estado: 'EN_CURSO' }))).regla,
    ).toBe('RN-02')
  })

  it('NO_ADMITIDO retira al integrante y conserva el grupo si sigue cumpliendo el mínimo', async () => {
    const r = await api.post<EstudianteHabilitado & { efectos: string[] }>(
      '/estudiantes-habilitados/hab-13/resolver-ingreso',
      {
        situacionIngreso: 'NO_ADMITIDO',
        observacion: 'No presentó el certificado.',
      },
    )
    expect(r.situacionIngreso).toBe('NO_ADMITIDO')
    expect(r.efectos.join(' ')).toMatch(/Retirado del grupo/)
    const a = await api.get<AsignacionTema>('/asignaciones-tema/asg-2')
    expect(a.estado).toBe('VIGENTE')
  })

  it('NO_ADMITIDO anula la asignación del grupo si queda por debajo del mínimo', async () => {
    await api.post('/estudiantes-habilitados/hab-13/resolver-ingreso', {
      situacionIngreso: 'NO_ADMITIDO',
      observacion: 'Sin requisito.',
    })
    await api.post('/estudiantes-habilitados/hab-12/resolver-ingreso', {
      situacionIngreso: 'NO_ADMITIDO',
      observacion: 'Sin requisito.',
    })
    const a = await api.get<AsignacionTema>('/asignaciones-tema/asg-2')
    expect(a).toMatchObject({ estado: 'ANULADA', causaAnulacion: 'INCUMPLIMIENTO_CONDICION' })
  })
})
