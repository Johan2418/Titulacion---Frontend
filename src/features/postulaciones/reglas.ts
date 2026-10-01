import type {
  EstudianteHabilitado,
  Grupo,
  Modalidad,
  PeriodoTitulacion,
  Postulacion,
  Tema,
} from '@/types/dominio'

export interface Verificacion {
  id: string
  ok: boolean
  mensaje: string
  regla?: string
}

export interface ContextoPostulacion {
  tema: Pick<Tema, 'disponible' | 'minIntegrantes' | 'maxIntegrantes'>
  modalidad: Modalidad
  periodo: Pick<
    PeriodoTitulacion,
    'estado' | 'fechaInicioPostulacion' | 'fechaFinPostulacion'
  > | null
  habilitacion: Pick<EstudianteHabilitado, 'estado' | 'situacionIngreso'> | null
  grupo: Pick<Grupo, 'integrantes'> | null
  estudianteId: string
  postulacionActiva: Pick<Postulacion, 'id'> | null
  ahora?: Date
}

export function integrantesActivos(grupo: Pick<Grupo, 'integrantes'> | null) {
  return grupo?.integrantes.filter((i) => i.estado === 'ACTIVO') ?? []
}

export function esRepresentante(grupo: Pick<Grupo, 'integrantes'> | null, estudianteId: string) {
  return integrantesActivos(grupo).some(
    (i) => i.estudiante.id === estudianteId && i.rolEnGrupo === 'REPRESENTANTE',
  )
}

/**
 * Verificaciones previas a postular (RF-04, RF-08, RF-09, RN-04, RN-05, RN-08).
 * Son solo una ayuda para el usuario: el backend vuelve a validar todo.
 */
export function verificarPostulacion(c: ContextoPostulacion): Verificacion[] {
  const ahora = c.ahora ?? new Date()
  const p = c.periodo
  const enFechas =
    !!p &&
    p.estado === 'POSTULACION_ABIERTA' &&
    ahora >= new Date(p.fechaInicioPostulacion) &&
    ahora <= new Date(p.fechaFinPostulacion)
  const n = c.modalidad === 'GRUPAL' ? integrantesActivos(c.grupo).length : 1
  const v: Verificacion[] = [
    {
      id: 'fechas',
      ok: enFechas,
      mensaje: 'La postulación está dentro de las fechas del período.',
      regla: 'RF-08',
    },
    {
      id: 'habilitado',
      ok:
        c.habilitacion?.estado === 'HABILITADO' &&
        c.habilitacion.situacionIngreso !== 'NO_ADMITIDO',
      mensaje: 'Estás habilitado en el período y no figuras como no admitido.',
      regla: 'RF-09',
    },
    {
      id: 'disponible',
      ok: c.tema.disponible,
      mensaje: 'El tema está publicado y sin asignación vigente.',
      regla: 'RF-07',
    },
    {
      id: 'unica',
      ok: !c.postulacionActiva,
      mensaje: 'No tienes otra postulación activa (individual o grupal).',
      regla: 'RN-08',
    },
  ]
  if (c.modalidad === 'GRUPAL') {
    v.push(
      {
        id: 'grupo',
        ok: esRepresentante(c.grupo, c.estudianteId),
        mensaje: 'Eres el representante de un grupo activo.',
        regla: 'RN-04',
      },
      {
        id: 'minimo-grupo',
        ok: n >= 2,
        mensaje: 'El grupo tiene al menos 2 integrantes.',
        regla: 'RN-05',
      },
    )
  }
  v.push({
    id: 'rango',
    ok: n >= c.tema.minIntegrantes && n <= c.tema.maxIntegrantes,
    mensaje: `El número de integrantes (${n}) está entre ${c.tema.minIntegrantes} y ${c.tema.maxIntegrantes}.`,
    regla: 'RN-05',
  })
  return v
}

/** RF-11: el docente proponente del tema se sugiere en primer lugar. */
export function ordenarSugeridos<T extends { id: string }>(
  docentes: T[],
  proponenteId: string,
): T[] {
  return [...docentes].sort((a, b) => Number(b.id === proponenteId) - Number(a.id === proponenteId))
}

export function moverElemento<T>(lista: T[], desde: number, hasta: number): T[] {
  if (hasta < 0 || hasta >= lista.length) return lista
  const copia = [...lista]
  const [x] = copia.splice(desde, 1)
  copia.splice(hasta, 0, x)
  return copia
}
