import type { MockDb } from './db'

const DIA = 24 * 60 * 60 * 1000
const rel = (dias: number, horas = 0) =>
  new Date(Date.now() + dias * DIA + horas * 60 * 60 * 1000).toISOString()

const NOMBRES_EST: [string, string][] = [
  ['Valeria', 'Andrade Mora'],
  ['Mateo', 'Cevallos Ruiz'],
  ['Camila', 'Paredes León'],
  ['Sebastián', 'Torres Vega'],
  ['Daniela', 'Morales Pinto'],
  ['Andrés', 'Salazar Ortiz'],
  ['Gabriela', 'Rivas Molina'],
  ['Joaquín', 'Herrera Lima'],
  ['Isabella', 'Castro Núñez'],
  ['Nicolás', 'Vargas Ponce'],
  ['Martina', 'Benítez Gil'],
  ['Diego', 'Rojas Cárdenas'],
  ['Sofía', 'Mendoza Jara'],
  ['Emilio', 'Guerrero Sáenz'],
  ['Lucía', 'Navarro Bravo'],
  ['Tomás', 'Espinoza Reyes'],
  ['Renata', 'Ibarra Flores'],
  ['Felipe', 'Quiroga Méndez'],
  ['Antonella', 'Suárez Peña'],
  ['Samuel', 'Aguirre Cruz'],
]

const DOCENTES: [string, string, string, string][] = [
  ['Carlos', 'Mejía Romero', 'PhD en Ciencias de la Computación', 'Computación'],
  ['Patricia', 'Zambrano Ruiz', 'MSc en Ingeniería de Software', 'Computación'],
  ['Fernando', 'López Arias', 'PhD en Inteligencia Artificial', 'Computación'],
  ['María José', 'Ortega Villa', 'MSc en Redes y Telecomunicaciones', 'Telecomunicaciones'],
  ['Ricardo', 'Peña Solís', 'MSc en Sistemas de Información', 'Sistemas'],
  ['Elena', 'Cordero Díaz', 'PhD en Ciencia de Datos', 'Computación'],
  ['Jorge', 'Bustamante Real', 'MSc en Seguridad Informática', 'Sistemas'],
  ['Verónica', 'Salinas Mora', 'MSc en Educación', 'Ciencias Básicas'],
]

export function crearSemilla(): MockDb {
  const creado = rel(-60)
  const db: MockDb = {
    usuarios: [],
    periodos: [],
    estudiantes: [],
    docentes: [],
    lineas: [],
    habilitados: [],
    lotes: [],
    temas: [],
    temaHistorial: [],
    grupos: [],
    integrantes: [],
    invitaciones: [],
    postulaciones: [],
    tutoresPropuestos: [],
    resoluciones: [],
    participantes: [],
    asignacionesTema: [],
    asignacionesTutor: [],
    configCarga: [],
    plantillas: [],
    documentosPat: [],
    revisionesPat: [],
    notificaciones: [],
    auditoria: [],
    exportaciones: [],
  }

  // ── Usuarios ──
  db.usuarios.push(
    {
      id: 'usr-admin',
      email: 'ana.rodriguez@institucion.edu',
      nombres: 'Ana',
      apellidos: 'Rodríguez Paz',
      rol: 'ADMIN',
      estado: 'ACTIVO',
      idExternoSso: 'sso-admin',
      ultimoAcceso: null,
      creadoEn: creado,
    },
    {
      id: 'usr-admin2',
      email: 'luis.ramos@institucion.edu',
      nombres: 'Luis',
      apellidos: 'Ramos Cedeño',
      rol: 'ADMIN',
      estado: 'ACTIVO',
      idExternoSso: 'sso-admin2',
      ultimoAcceso: null,
      creadoEn: creado,
    },
  )

  DOCENTES.forEach(([n, a, t, d], i) => {
    const k = i + 1
    db.usuarios.push({
      id: `usr-doc-${k}`,
      email: `${n.split(' ')[0].toLowerCase()}.${a.split(' ')[0].toLowerCase()}@institucion.edu`
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, ''),
      nombres: n,
      apellidos: a,
      rol: 'DOCENTE',
      estado: 'ACTIVO',
      idExternoSso: `sso-doc-${k}`,
      ultimoAcceso: null,
      creadoEn: creado,
    })
    db.docentes.push({
      id: `doc-${k}`,
      usuarioId: `usr-doc-${k}`,
      cedula: `17000000${String(k).padStart(2, '0')}`,
      tituloAcademico: t,
      departamento: d,
      habilitadoTutoria: k !== 8,
    })
  })

  NOMBRES_EST.forEach(([n, a], i) => {
    const k = i + 1
    db.usuarios.push({
      id: `usr-est-${k}`,
      email: `${n.toLowerCase()}.${a.split(' ')[0].toLowerCase()}@estudiantes.institucion.edu`
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, ''),
      nombres: n,
      apellidos: a,
      rol: 'ESTUDIANTE',
      estado: 'ACTIVO',
      idExternoSso: `sso-est-${k}`,
      ultimoAcceso: null,
      creadoEn: creado,
    })
    db.estudiantes.push({
      id: `est-${k}`,
      usuarioId: `usr-est-${k}`,
      cedula: `09${String(10000000 + k * 7919).slice(0, 8)}`,
      matricula: `2021${String(k).padStart(4, '0')}`,
      carrera: k % 3 === 0 ? 'Ingeniería en Sistemas' : 'Ingeniería en Computación',
      nivel: 9 + (k % 2),
    })
  })

  // ── Períodos ──
  db.periodos.push(
    {
      id: 'per-2026-1',
      codigo: '2026-1',
      nombre: 'Titulación 2026 – Primer período',
      fechaInicioPostulacion: rel(-200),
      fechaFinPostulacion: rel(-170),
      fechaInicioTitulacion: rel(-150),
      estado: 'ARCHIVADO',
      maxIntegrantesDefault: 3,
    },
    {
      id: 'per-2026-2',
      codigo: '2026-2',
      nombre: 'Titulación 2026 – Segundo período',
      fechaInicioPostulacion: rel(-10),
      fechaFinPostulacion: rel(20),
      fechaInicioTitulacion: rel(40),
      estado: 'POSTULACION_ABIERTA',
      maxIntegrantesDefault: 3,
    },
  )
  const P = 'per-2026-2'

  // ── Líneas ──
  db.lineas.push(
    {
      id: 'lin-1',
      codigo: 'IA',
      nombre: 'Inteligencia Artificial',
      descripcion: 'Aprendizaje automático, visión y PLN.',
      activa: true,
    },
    {
      id: 'lin-2',
      codigo: 'ISW',
      nombre: 'Ingeniería de Software',
      descripcion: 'Procesos, calidad y arquitectura de software.',
      activa: true,
    },
    {
      id: 'lin-3',
      codigo: 'RED',
      nombre: 'Redes y Ciberseguridad',
      descripcion: 'Infraestructura, protocolos y seguridad.',
      activa: true,
    },
    {
      id: 'lin-4',
      codigo: 'DAT',
      nombre: 'Ciencia de Datos',
      descripcion: 'Analítica, big data y visualización.',
      activa: true,
    },
    {
      id: 'lin-5',
      codigo: 'EDU',
      nombre: 'Tecnología Educativa',
      descripcion: null,
      activa: false,
    },
  )

  // ── Habilitados (período actual) ──
  for (let k = 1; k <= 18; k++) {
    const condicionado = k === 13 || k === 14 || k === 12
    db.habilitados.push({
      id: `hab-${k}`,
      periodoId: P,
      estudianteId: `est-${k}`,
      origen: k <= 10 ? 'IMPORTACION' : 'MANUAL',
      loteImportacionId: k <= 10 ? 'lote-1' : null,
      estado: 'HABILITADO',
      condicionIngreso: condicionado ? 'CONDICIONADO' : 'REGULAR',
      requisitoPendiente: condicionado
        ? k === 12
          ? 'Certificado de suficiencia en inglés B1'
          : 'Aprobación de prácticas preprofesionales'
        : null,
      situacionIngreso: condicionado ? 'PENDIENTE' : 'ADMITIDO',
      fechaHabilitacion: rel(-15),
      fechaResolucionIngreso: condicionado ? null : rel(-15),
      resueltoPorId: condicionado ? null : 'usr-admin',
      observacionIngreso: null,
    })
  }
  db.lotes.push({
    id: 'lote-1',
    periodoId: P,
    ejecutadoPorId: 'usr-admin',
    tipo: 'ESTUDIANTES',
    nombreArchivo: 'habilitados-2026-2.csv',
    rutaAlmacenamiento: 'importaciones/lote-1.csv',
    estado: 'COMPLETADO_CON_ERRORES',
    totalFilas: 11,
    filasOk: 10,
    filasError: 1,
    errores: [{ fila: 7, mensaje: 'Cédula inválida: 09ABC' }],
    fechaInicio: rel(-15),
    fechaFin: rel(-15),
  })

  // ── Temas ──
  const temas: [string, string, string, number, number, string, string][] = [
    [
      'tem-1',
      'lin-1',
      'doc-1',
      1,
      2,
      'PUBLICADO',
      'Detección temprana de deserción estudiantil con aprendizaje automático',
    ],
    [
      'tem-2',
      'lin-2',
      'doc-1',
      2,
      3,
      'PUBLICADO',
      'Plataforma de microservicios para gestión de laboratorios',
    ],
    [
      'tem-3',
      'lin-3',
      'doc-4',
      1,
      2,
      'PUBLICADO',
      'Sistema de detección de intrusiones basado en anomalías para redes universitarias',
    ],
    [
      'tem-4',
      'lin-4',
      'doc-6',
      1,
      1,
      'ASIGNADO',
      'Tablero analítico del rendimiento académico por cohortes',
    ],
    [
      'tem-5',
      'lin-2',
      'doc-2',
      2,
      3,
      'ASIGNADO',
      'Aplicación móvil accesible para la biblioteca institucional',
    ],
    [
      'tem-6',
      'lin-1',
      'doc-3',
      1,
      3,
      'PUBLICADO',
      'Clasificación de documentos académicos con modelos de lenguaje',
    ],
    [
      'tem-7',
      'lin-4',
      'doc-6',
      2,
      2,
      'PUBLICADO',
      'Predicción de demanda energética del campus con series temporales',
    ],
    [
      'tem-8',
      'lin-3',
      'doc-7',
      1,
      2,
      'CERRADO',
      'Auditoría automatizada de configuraciones en la nube',
    ],
    [
      'tem-9',
      'lin-2',
      'doc-5',
      1,
      2,
      'BORRADOR',
      'Generador de pruebas de regresión a partir de historias de usuario',
    ],
    ['tem-10', 'lin-1', 'doc-1', 1, 1, 'RETIRADO', 'Chatbot de orientación vocacional'],
    [
      'tem-11',
      'lin-2',
      'doc-2',
      1,
      3,
      'PUBLICADO',
      'Gestor de proyectos de vinculación con la comunidad',
    ],
  ]
  for (const [id, linea, docente, min, max, estado, titulo] of temas) {
    db.temas.push({
      id,
      periodoId: P,
      lineaId: linea,
      docenteProponenteId: docente,
      titulo,
      descripcion: `${titulo}. El trabajo comprende el levantamiento de requisitos, el diseño de la solución, su implementación y la validación con usuarios reales de la institución, documentando los resultados en el PAT.`,
      minIntegrantes: min,
      maxIntegrantes: max,
      estado: estado as MockDb['temas'][number]['estado'],
      creadoEn: rel(-20),
    })
    db.temaHistorial.push({
      id: `th-${id}-1`,
      temaId: id,
      usuarioId: 'usr-admin',
      estadoAnterior: null,
      estadoNuevo: 'BORRADOR',
      cambios: null,
      fecha: rel(-20),
    })
    if (estado !== 'BORRADOR') {
      db.temaHistorial.push({
        id: `th-${id}-2`,
        temaId: id,
        usuarioId: 'usr-admin',
        estadoAnterior: 'BORRADOR',
        estadoNuevo:
          estado === 'RETIRADO' || estado === 'CERRADO' || estado === 'ASIGNADO'
            ? 'PUBLICADO'
            : (estado as 'PUBLICADO'),
        cambios: null,
        fecha: rel(-12),
      })
    }
    if (estado === 'RETIRADO' || estado === 'CERRADO' || estado === 'ASIGNADO') {
      db.temaHistorial.push({
        id: `th-${id}-3`,
        temaId: id,
        usuarioId: 'usr-admin',
        estadoAnterior: 'PUBLICADO',
        estadoNuevo: estado,
        cambios: null,
        fecha: rel(-3),
      })
    }
  }

  // ── Grupos ──
  const grupo = (
    id: string,
    nombre: string,
    estado: MockDb['grupos'][number]['estado'],
    miembros: number[],
  ) => {
    db.grupos.push({ id, periodoId: P, nombre, estado, creadoEn: rel(-8) })
    miembros.forEach((k, i) =>
      db.integrantes.push({
        id: `int-${id}-${k}`,
        grupoId: id,
        periodoId: P,
        estudianteId: `est-${k}`,
        rolEnGrupo: i === 0 ? 'REPRESENTANTE' : 'INTEGRANTE',
        estado: 'ACTIVO',
        fechaIngreso: rel(-8 + i * 0.1),
        fechaSalida: null,
        motivoSalida: null,
      }),
    )
  }
  grupo('grp-1', 'Equipo Andrade', 'ACTIVO', [1, 2])
  grupo('grp-2', 'Equipo Rivas', 'ACTIVO', [7, 8])
  grupo('grp-3', 'Equipo Benítez', 'ACTIVO', [11, 12, 13])

  db.invitaciones.push(
    {
      id: 'inv-1',
      grupoId: 'grp-1',
      periodoId: P,
      estudianteEmisorId: 'est-1',
      estudianteDestinoId: 'est-2',
      estado: 'ACEPTADA',
      fechaEnvio: rel(-8),
      expiraEn: rel(-1),
      fechaRespuesta: rel(-7.9),
    },
    {
      id: 'inv-2',
      grupoId: 'grp-1',
      periodoId: P,
      estudianteEmisorId: 'est-1',
      estudianteDestinoId: 'est-3',
      estado: 'PENDIENTE',
      fechaEnvio: rel(-1),
      expiraEn: rel(6),
      fechaRespuesta: null,
    },
  )

  // ── Postulaciones ──
  const postulacion = (
    id: string,
    temaId: string,
    estado: MockDb['postulaciones'][number]['estado'],
    opts: { grupoId?: string; estudianteId?: string; num: number; por: string; dias: number },
    tutores: string[],
  ) => {
    db.postulaciones.push({
      id,
      temaId,
      periodoId: P,
      grupoId: opts.grupoId ?? null,
      estudianteId: opts.estudianteId ?? null,
      numIntegrantes: opts.num,
      registradaPorId: opts.por,
      estado,
      fechaPostulacion: rel(opts.dias),
      observacion: null,
    })
    tutores.forEach((d, i) =>
      db.tutoresPropuestos.push({
        id: `tp-${id}-${i}`,
        postulacionId: id,
        docenteId: d,
        ordenPrioridad: i + 1,
      }),
    )
  }
  // grupo 1 → tema 2 (pendiente, sin competencia)
  postulacion(
    'pos-1',
    'tem-2',
    'PENDIENTE',
    { grupoId: 'grp-1', num: 2, por: 'usr-est-1', dias: -2 },
    ['doc-1', 'doc-2'],
  )
  // conflicto en tema 3: individual est-6 vs grupo 2
  postulacion(
    'pos-2',
    'tem-3',
    'EN_CONFLICTO',
    { estudianteId: 'est-6', num: 1, por: 'usr-est-6', dias: -5 },
    ['doc-4', 'doc-7'],
  )
  postulacion(
    'pos-3',
    'tem-3',
    'EN_CONFLICTO',
    { grupoId: 'grp-2', num: 2, por: 'usr-est-7', dias: -4 },
    ['doc-4'],
  )
  // est-9 → tema 4 asignado
  postulacion(
    'pos-4',
    'tem-4',
    'ACEPTADA',
    { estudianteId: 'est-9', num: 1, por: 'usr-est-9', dias: -9 },
    ['doc-6', 'doc-3'],
  )
  // grupo 3 → tema 5 asignado
  postulacion(
    'pos-5',
    'tem-5',
    'ACEPTADA',
    { grupoId: 'grp-3', num: 3, por: 'usr-est-11', dias: -9 },
    ['doc-2', 'doc-5'],
  )
  // est-10 → tema 4 rechazada al asignarse
  postulacion(
    'pos-6',
    'tem-4',
    'RECHAZADA',
    { estudianteId: 'est-10', num: 1, por: 'usr-est-10', dias: -8 },
    ['doc-6'],
  )
  // est-5 → tema 6 pendiente
  postulacion(
    'pos-7',
    'tem-6',
    'PENDIENTE',
    { estudianteId: 'est-5', num: 1, por: 'usr-est-5', dias: -1 },
    ['doc-3'],
  )

  // ── Asignaciones ──
  db.asignacionesTema.push(
    {
      id: 'asg-1',
      temaId: 'tem-4',
      postulacionId: 'pos-4',
      grupoId: null,
      estudianteId: 'est-9',
      aprobadaPorId: 'usr-admin',
      estado: 'VIGENTE',
      fechaAsignacion: rel(-6),
      motivo: null,
      causaAnulacion: null,
      motivoAnulacion: null,
      anuladaPorId: null,
      fechaAnulacion: null,
    },
    {
      id: 'asg-2',
      temaId: 'tem-5',
      postulacionId: 'pos-5',
      grupoId: 'grp-3',
      estudianteId: null,
      aprobadaPorId: 'usr-admin',
      estado: 'VIGENTE',
      fechaAsignacion: rel(-3),
      motivo: null,
      causaAnulacion: null,
      motivoAnulacion: null,
      anuladaPorId: null,
      fechaAnulacion: null,
    },
  )
  db.asignacionesTutor.push({
    id: 'at-1',
    asignacionTemaId: 'asg-1',
    docenteId: 'doc-6',
    tutorPropuestoId: 'tp-pos-4-0',
    tipo: 'PROPUESTO_CONFIRMADO',
    estado: 'VIGENTE',
    asignadaPorId: 'usr-admin',
    fechaAsignacion: rel(-6),
    fechaFin: null,
    motivoCambio: null,
  })

  // ── Carga tutorial ──
  db.configCarga.push(
    { id: 'cfg-1', periodoId: P, docenteId: null, maxTrabajos: 3, bloquearAlSuperar: false },
    { id: 'cfg-2', periodoId: P, docenteId: 'doc-2', maxTrabajos: 1, bloquearAlSuperar: true },
  )

  // ── PAT ──
  db.plantillas.push(
    {
      id: 'pla-1',
      periodoId: P,
      version: '1.0',
      nombreArchivo: 'plantilla-pat-v1.docx',
      rutaAlmacenamiento: 'plantillas/pla-1.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      tamanoBytes: 48_213,
      fechaVigenciaInicio: rel(-30),
      fechaVigenciaFin: rel(-11),
      publicadaPorId: 'usr-admin',
      activa: false,
      creadoEn: rel(-30),
    },
    {
      id: 'pla-2',
      periodoId: P,
      version: '1.1',
      nombreArchivo: 'plantilla-pat-v1.1.docx',
      rutaAlmacenamiento: 'plantillas/pla-2.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      tamanoBytes: 51_904,
      fechaVigenciaInicio: rel(-10),
      fechaVigenciaFin: null,
      publicadaPorId: 'usr-admin',
      activa: true,
      creadoEn: rel(-10),
    },
  )
  db.documentosPat.push(
    {
      id: 'doc-pat-1',
      asignacionTemaId: 'asg-1',
      plantillaId: 'pla-2',
      version: 1,
      nombreArchivo: 'PAT-Castro-v1.pdf',
      rutaAlmacenamiento: 'pat/doc-pat-1.pdf',
      formato: 'PDF',
      tamanoBytes: 482_113,
      hashSha256: 'a3f1c2e4b5d6978812ab34cd56ef7890a3f1c2e4b5d6978812ab34cd56ef7890',
      cargadoPorId: 'usr-est-9',
      fechaCarga: rel(-5),
    },
    {
      id: 'doc-pat-2',
      asignacionTemaId: 'asg-1',
      plantillaId: 'pla-2',
      version: 2,
      nombreArchivo: 'PAT-Castro-v2.pdf',
      rutaAlmacenamiento: 'pat/doc-pat-2.pdf',
      formato: 'PDF',
      tamanoBytes: 501_337,
      hashSha256: 'b7e2d1f0c9a8b7e6d5c4b3a2918f7e6db7e2d1f0c9a8b7e6d5c4b3a2918f7e6d',
      cargadoPorId: 'usr-est-9',
      fechaCarga: rel(-1),
    },
  )
  db.revisionesPat.push({
    id: 'rev-1',
    documentoPatId: 'doc-pat-1',
    revisorId: 'usr-admin',
    resultado: 'OBSERVADO',
    observaciones:
      'El objetivo general no es medible. Ajustar el cronograma: la fase de validación debe durar al menos 4 semanas.',
    fechaRevision: rel(-3),
  })

  // ── Notificaciones ──
  const notif = (
    usuarioId: string,
    tipo: string,
    titulo: string,
    mensaje: string,
    dias: number,
    leida = false,
  ) =>
    db.notificaciones.push({
      id: `ntf-${db.notificaciones.length + 1}`,
      usuarioId,
      tipo,
      titulo,
      mensaje,
      entidadTipo: null,
      entidadId: null,
      canal: 'EN_APP',
      leida,
      fechaCreacion: rel(dias),
      fechaEnvio: rel(dias),
    })
  notif(
    'usr-est-3',
    'INVITACION',
    'Nueva invitación a grupo',
    'Valeria Andrade te invitó a unirte al grupo "Equipo Andrade".',
    -1,
  )
  notif(
    'usr-est-9',
    'PAT_REVISADO',
    'Tu PAT fue observado',
    'La versión 1 de tu PAT tiene observaciones. Carga una nueva versión.',
    -3,
    true,
  )
  notif(
    'usr-est-9',
    'TUTOR_ASIGNADO',
    'Tutor asignado',
    'Elena Cordero Díaz fue asignada como tu tutora.',
    -6,
    true,
  )
  notif(
    'usr-est-6',
    'POSTULACION_CONFLICTO',
    'Postulación en conflicto',
    'Otra postulación compite por el tema que elegiste. El responsable resolverá el conflicto.',
    -4,
  )
  notif(
    'usr-admin',
    'PAT_CARGADO',
    'Nuevo PAT por revisar',
    'Isabella Castro cargó la versión 2 de su PAT.',
    -1,
  )

  // ── Auditoría ──
  db.auditoria.push(
    {
      id: 1,
      usuarioId: 'usr-admin',
      accion: 'CREAR',
      entidadTipo: 'periodo_titulacion',
      entidadId: P,
      valoresAnteriores: null,
      valoresNuevos: { codigo: '2026-2', estado: 'BORRADOR' },
      ipOrigen: '10.0.0.12',
      fechaHora: rel(-30),
    },
    {
      id: 2,
      usuarioId: 'usr-admin',
      accion: 'CAMBIAR_ESTADO',
      entidadTipo: 'periodo_titulacion',
      entidadId: P,
      valoresAnteriores: { estado: 'BORRADOR' },
      valoresNuevos: { estado: 'POSTULACION_ABIERTA' },
      ipOrigen: '10.0.0.12',
      fechaHora: rel(-10),
    },
    {
      id: 3,
      usuarioId: 'usr-admin',
      accion: 'ASIGNAR_TEMA',
      entidadTipo: 'asignacion_tema',
      entidadId: 'asg-1',
      valoresAnteriores: null,
      valoresNuevos: { temaId: 'tem-4', postulacionId: 'pos-4' },
      ipOrigen: '10.0.0.12',
      fechaHora: rel(-6),
    },
    {
      id: 4,
      usuarioId: 'usr-admin',
      accion: 'REVISAR_PAT',
      entidadTipo: 'revision_pat',
      entidadId: 'rev-1',
      valoresAnteriores: null,
      valoresNuevos: { resultado: 'OBSERVADO' },
      ipOrigen: '10.0.0.12',
      fechaHora: rel(-3),
    },
  )

  return db
}
