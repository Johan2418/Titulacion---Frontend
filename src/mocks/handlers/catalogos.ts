import { http } from 'msw'
import type { EstadoPeriodo } from '@/types/dominio'
import { ahora, db, uid, type HabilitadoRow, type LoteRow } from '../db'
import * as q from '../consultas'
import * as dto from '../dto'
import {
  API,
  auditar,
  cuerpo,
  falla,
  noEncontrado,
  notificar,
  requerido,
  requiereRol,
  ruta,
} from '../util'

const TRANSICIONES: Record<EstadoPeriodo, EstadoPeriodo[]> = {
  BORRADOR: ['POSTULACION_ABIERTA'],
  POSTULACION_ABIERTA: ['POSTULACION_CERRADA'],
  POSTULACION_CERRADA: ['POSTULACION_ABIERTA', 'EN_CURSO'],
  EN_CURSO: ['ARCHIVADO'],
  ARCHIVADO: [],
}

function validarFechasPeriodo(b: {
  fechaInicioPostulacion: string
  fechaFinPostulacion: string
  fechaInicioTitulacion: string
}) {
  if (new Date(b.fechaFinPostulacion) <= new Date(b.fechaInicioPostulacion))
    throw falla(
      400,
      'FECHAS_INVALIDAS',
      'La fecha de fin de postulación debe ser posterior a la de inicio.',
    )
  if (new Date(b.fechaInicioTitulacion) < new Date(b.fechaFinPostulacion))
    throw falla(
      400,
      'FECHAS_INVALIDAS',
      'La fecha de inicio de titulación debe ser igual o posterior al fin de postulación.',
    )
}

/** Simula el procesamiento asíncrono de un lote: se completa tras unos segundos. */
function avanzarLote(l: LoteRow) {
  if (l.estado === 'EN_PROCESO' && Date.now() - new Date(l.fechaInicio).getTime() > 2500) {
    l.estado =
      l.filasError === 0 ? 'COMPLETADO' : l.filasOk === 0 ? 'FALLIDO' : 'COMPLETADO_CON_ERRORES'
    l.fechaFin = ahora()
  }
  return l
}

function parsearCsv(texto: string) {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim())
  const [cab, ...filas] = lineas
  const columnas = (cab ?? '').split(/[;,]/).map((c) => c.trim().toLowerCase())
  return filas.map((f) => {
    const valores = f.split(/[;,]/).map((v) => v.trim())
    return Object.fromEntries(columnas.map((c, i) => [c, valores[i] ?? '']))
  })
}

export const catalogoHandlers = [
  // ── Períodos (RF-17) ──
  http.get(
    `${API}/periodos`,
    ruta(() => [...db.periodos].reverse().map(dto.periodoDto)),
  ),
  http.get(
    `${API}/periodos/actual`,
    ruta(() => {
      const p = q.periodoActual()
      return p ? dto.periodoDto(p) : Response.json(null)
    }),
  ),
  http.get(
    `${API}/periodos/:id`,
    ruta(({ params }) => {
      const p = q.periodo(params.id)
      if (!p) throw noEncontrado('El período')
      return dto.periodoDto(p)
    }),
  ),
  http.post(
    `${API}/periodos`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ADMIN')
      const b = await cuerpo<{
        codigo: string
        nombre: string
        fechaInicioPostulacion: string
        fechaFinPostulacion: string
        fechaInicioTitulacion: string
        maxIntegrantesDefault?: number
      }>(req)
      for (const c of [
        'codigo',
        'nombre',
        'fechaInicioPostulacion',
        'fechaFinPostulacion',
        'fechaInicioTitulacion',
      ] as const)
        requerido(b[c], c)
      if (db.periodos.some((p) => p.codigo === b.codigo))
        throw falla(409, 'CODIGO_DUPLICADO', `Ya existe un período con el código ${b.codigo}.`)
      validarFechasPeriodo(b)
      const p = {
        id: uid(),
        codigo: b.codigo,
        nombre: b.nombre,
        fechaInicioPostulacion: b.fechaInicioPostulacion,
        fechaFinPostulacion: b.fechaFinPostulacion,
        fechaInicioTitulacion: b.fechaInicioTitulacion,
        estado: 'BORRADOR' as const,
        maxIntegrantesDefault: Number(b.maxIntegrantesDefault) || 3,
      }
      db.periodos.push(p)
      auditar(u, 'CREAR', 'periodo_titulacion', p.id, null, { ...p })
      return dto.periodoDto(p)
    }),
  ),
  http.patch(
    `${API}/periodos/:id`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const p = q.periodo(params.id)
      if (!p) throw noEncontrado('El período')
      if (p.estado === 'ARCHIVADO')
        throw falla(409, 'PERIODO_ARCHIVADO', 'Un período archivado no puede modificarse.')
      const b = await cuerpo<Partial<typeof p>>(req)
      const antes = { ...p }
      const nuevo = { ...p, ...b, id: p.id, estado: p.estado }
      validarFechasPeriodo(nuevo)
      Object.assign(p, nuevo)
      auditar(u, 'ACTUALIZAR', 'periodo_titulacion', p.id, antes, { ...p })
      return dto.periodoDto(p)
    }),
  ),
  http.post(
    `${API}/periodos/:id/estado`,
    ruta(
      async ({ req, u, params }) => {
        requiereRol(u, 'ADMIN')
        const p = q.periodo(params.id)
        if (!p) throw noEncontrado('El período')
        const { estado } = await cuerpo<{ estado: EstadoPeriodo }>(req)
        if (!TRANSICIONES[p.estado].includes(estado))
          throw falla(409, 'TRANSICION_INVALIDA', `No se puede pasar de ${p.estado} a ${estado}.`)
        if (estado === 'EN_CURSO') {
          const pendientes = q.condicionadosPendientes(p.id)
          if (pendientes > 0)
            throw falla(
              409,
              'CONDICIONADOS_PENDIENTES',
              `No se puede iniciar la titulación: hay ${pendientes} estudiante(s) condicionado(s) sin resolver.`,
              'RN-02',
            )
        }
        if (
          estado === 'POSTULACION_ABIERTA' &&
          db.periodos.some((x) => x.id !== p.id && x.estado === 'POSTULACION_ABIERTA')
        )
          throw falla(
            409,
            'PERIODO_ABIERTO_EXISTENTE',
            'Ya existe otro período con postulación abierta.',
          )
        const anterior = p.estado
        p.estado = estado
        auditar(u, 'CAMBIAR_ESTADO', 'periodo_titulacion', p.id, { estado: anterior }, { estado })
        return dto.periodoDto(p)
      },
      { status: 200 },
    ),
  ),

  // ── Líneas de investigación ──
  http.get(
    `${API}/lineas-investigacion`,
    ruta(() => db.lineas),
  ),
  http.post(
    `${API}/lineas-investigacion`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ADMIN')
      const b = await cuerpo<{ codigo: string; nombre: string; descripcion?: string }>(req)
      requerido(b.codigo, 'codigo')
      requerido(b.nombre, 'nombre')
      if (db.lineas.some((l) => l.codigo === b.codigo))
        throw falla(409, 'CODIGO_DUPLICADO', `Ya existe una línea con el código ${b.codigo}.`)
      const l = {
        id: uid(),
        codigo: b.codigo,
        nombre: b.nombre,
        descripcion: b.descripcion ?? null,
        activa: true,
      }
      db.lineas.push(l)
      auditar(u, 'CREAR', 'linea_investigacion', l.id, null, l)
      return l
    }),
  ),
  http.patch(
    `${API}/lineas-investigacion/:id`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const l = db.lineas.find((x) => x.id === params.id)
      if (!l) throw noEncontrado('La línea')
      const antes = { ...l }
      Object.assign(l, await cuerpo(req), { id: l.id })
      auditar(u, 'ACTUALIZAR', 'linea_investigacion', l.id, antes, { ...l })
      return l
    }),
  ),

  // ── Docentes (RF-19) ──
  http.get(
    `${API}/docentes`,
    ruta(({ url }) => {
      const hab = url.searchParams.get('habilitadoTutoria')
      return db.docentes
        .filter((d) => hab === null || String(d.habilitadoTutoria) === hab)
        .map((d) => dto.docenteDto(d.id))
    }),
  ),
  http.post(
    `${API}/docentes`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ADMIN')
      const b = await cuerpo<Record<string, string> & { habilitadoTutoria?: boolean }>(req)
      for (const c of ['cedula', 'nombres', 'apellidos', 'email']) requerido(b[c], c)
      if (db.docentes.some((d) => d.cedula === b.cedula))
        throw falla(409, 'CEDULA_DUPLICADA', 'Ya existe un docente con esa cédula.')
      if (db.usuarios.some((x) => x.email === b.email))
        throw falla(409, 'EMAIL_DUPLICADO', 'Ya existe un usuario con ese correo.')
      const usuarioId = uid()
      db.usuarios.push({
        id: usuarioId,
        email: b.email,
        nombres: b.nombres,
        apellidos: b.apellidos,
        rol: 'DOCENTE',
        estado: 'ACTIVO',
        idExternoSso: null,
        ultimoAcceso: null,
        creadoEn: ahora(),
      })
      const d = {
        id: uid(),
        usuarioId,
        cedula: b.cedula,
        tituloAcademico: b.tituloAcademico || null,
        departamento: b.departamento || null,
        habilitadoTutoria: b.habilitadoTutoria ?? true,
      }
      db.docentes.push(d)
      auditar(u, 'CREAR', 'docente', d.id, null, { ...d, email: b.email })
      return dto.docenteDto(d.id)
    }),
  ),
  http.patch(
    `${API}/docentes/:id`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const d = q.docente(params.id)
      if (!d) throw noEncontrado('El docente')
      const b = await cuerpo<Record<string, string | boolean>>(req)
      const antes = dto.docenteDto(d.id)
      if (typeof b.habilitadoTutoria === 'boolean') d.habilitadoTutoria = b.habilitadoTutoria
      if (typeof b.tituloAcademico === 'string') d.tituloAcademico = b.tituloAcademico
      if (typeof b.departamento === 'string') d.departamento = b.departamento
      const usr = q.usuario(d.usuarioId)!
      if (typeof b.nombres === 'string') usr.nombres = b.nombres
      if (typeof b.apellidos === 'string') usr.apellidos = b.apellidos
      if (b.estado === 'ACTIVO' || b.estado === 'INACTIVO') usr.estado = b.estado
      const despues = dto.docenteDto(d.id)
      auditar(u, 'ACTUALIZAR', 'docente', d.id, { ...antes }, { ...despues })
      return despues
    }),
  ),
  http.post(
    `${API}/docentes/importar`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ADMIN')
      const form = await req.formData()
      const archivo = form.get('archivo') as File | null
      if (!archivo) throw falla(400, 'ARCHIVO_REQUERIDO', 'Debe adjuntar un archivo CSV.')
      const filas = parsearCsv(await archivo.text())
      const errores: { fila: number; mensaje: string }[] = []
      let ok = 0
      filas.forEach((f, i) => {
        const n = i + 2
        if (!f.cedula || !/^\d{10}$/.test(f.cedula))
          return errores.push({ fila: n, mensaje: `Cédula inválida: ${f.cedula || '(vacía)'}` })
        if (!f.email?.includes('@')) return errores.push({ fila: n, mensaje: 'Correo inválido.' })
        if (db.docentes.some((d) => d.cedula === f.cedula))
          return errores.push({ fila: n, mensaje: 'El docente ya existe.' })
        const usuarioId = uid()
        db.usuarios.push({
          id: usuarioId,
          email: f.email,
          nombres: f.nombres || 'Sin nombre',
          apellidos: f.apellidos || '',
          rol: 'DOCENTE',
          estado: 'ACTIVO',
          idExternoSso: null,
          ultimoAcceso: null,
          creadoEn: ahora(),
        })
        db.docentes.push({
          id: uid(),
          usuarioId,
          cedula: f.cedula,
          tituloAcademico: f.titulo || null,
          departamento: f.departamento || null,
          habilitadoTutoria: f.habilitado !== 'no',
        })
        ok++
      })
      const lote: LoteRow = {
        id: uid(),
        periodoId: null,
        ejecutadoPorId: u.id,
        tipo: 'DOCENTES',
        nombreArchivo: archivo.name,
        rutaAlmacenamiento: `importaciones/${archivo.name}`,
        estado: 'EN_PROCESO',
        totalFilas: filas.length,
        filasOk: ok,
        filasError: errores.length,
        errores,
        fechaInicio: ahora(),
        fechaFin: null,
      }
      db.lotes.push(lote)
      auditar(u, 'IMPORTAR', 'lote_importacion', lote.id, null, {
        tipo: 'DOCENTES',
        totalFilas: filas.length,
      })
      return dto.loteDto(lote)
    }),
  ),

  // ── Estudiantes (catálogo institucional) ──
  http.get(
    `${API}/estudiantes`,
    ruta(({ url, u }) => {
      requiereRol(u, 'ADMIN')
      const texto = (url.searchParams.get('q') ?? '').toLowerCase()
      return db.estudiantes
        .map((e) => dto.estudianteDto(e.id))
        .filter(
          (e) =>
            !texto ||
            `${e.nombres} ${e.apellidos} ${e.cedula} ${e.matricula}`.toLowerCase().includes(texto),
        )
    }),
  ),

  // ── Estudiantes habilitados (RF-18) ──
  http.get(
    `${API}/periodos/:pid/estudiantes-habilitados`,
    ruta(({ params, u, url }) => {
      const disponibles = url.searchParams.get('sinGrupo') === 'true'
      if (!disponibles) requiereRol(u, 'ADMIN')
      return db.habilitados
        .filter((h) => h.periodoId === params.pid)
        .filter(
          (h) =>
            !disponibles ||
            (h.estado === 'HABILITADO' &&
              h.situacionIngreso !== 'NO_ADMITIDO' &&
              !q.grupoActivoDe(h.periodoId, h.estudianteId) &&
              !q.postulacionActivaIndividual(h.periodoId, h.estudianteId) &&
              !q.asignacionVigenteDe(h.periodoId, h.estudianteId)),
        )
        .map(dto.habilitadoDto)
    }),
  ),
  http.post(
    `${API}/periodos/:pid/estudiantes-habilitados`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const b = await cuerpo<{
        estudianteId: string
        condicionIngreso: 'REGULAR' | 'CONDICIONADO'
        requisitoPendiente?: string
      }>(req)
      requerido(b.estudianteId, 'estudianteId')
      if (!q.estudiante(b.estudianteId)) throw noEncontrado('El estudiante')
      if (q.habilitacion(params.pid, b.estudianteId))
        throw falla(409, 'YA_HABILITADO', 'El estudiante ya está habilitado en este período.')
      if (b.condicionIngreso === 'CONDICIONADO' && !b.requisitoPendiente)
        throw falla(
          400,
          'REQUISITO_REQUERIDO',
          'Un estudiante condicionado debe registrar el requisito pendiente.',
        )
      const regular = b.condicionIngreso !== 'CONDICIONADO'
      const h: HabilitadoRow = {
        id: uid(),
        periodoId: params.pid,
        estudianteId: b.estudianteId,
        origen: 'MANUAL',
        loteImportacionId: null,
        estado: 'HABILITADO',
        condicionIngreso: regular ? 'REGULAR' : 'CONDICIONADO',
        requisitoPendiente: regular ? null : b.requisitoPendiente!,
        situacionIngreso: regular ? 'ADMITIDO' : 'PENDIENTE',
        fechaHabilitacion: ahora(),
        fechaResolucionIngreso: regular ? ahora() : null,
        resueltoPorId: regular ? u.id : null,
        observacionIngreso: null,
      }
      db.habilitados.push(h)
      auditar(u, 'HABILITAR', 'estudiante_habilitado', h.id, null, { ...h })
      return dto.habilitadoDto(h)
    }),
  ),
  http.patch(
    `${API}/estudiantes-habilitados/:id`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const h = db.habilitados.find((x) => x.id === params.id)
      if (!h) throw noEncontrado('La habilitación')
      const b = await cuerpo<Partial<HabilitadoRow>>(req)
      const antes = { ...h }
      if (b.estado) h.estado = b.estado
      if (b.condicionIngreso && h.situacionIngreso !== 'NO_ADMITIDO') {
        if (b.condicionIngreso === 'CONDICIONADO') {
          if (!b.requisitoPendiente && !h.requisitoPendiente)
            throw falla(
              400,
              'REQUISITO_REQUERIDO',
              'Un estudiante condicionado debe registrar el requisito pendiente.',
            )
          h.condicionIngreso = 'CONDICIONADO'
          h.requisitoPendiente = b.requisitoPendiente ?? h.requisitoPendiente
          h.situacionIngreso = 'PENDIENTE'
          h.fechaResolucionIngreso = null
          h.resueltoPorId = null
        } else {
          h.condicionIngreso = 'REGULAR'
          h.requisitoPendiente = null
          h.situacionIngreso = 'ADMITIDO'
          h.fechaResolucionIngreso = ahora()
          h.resueltoPorId = u.id
        }
      } else if (b.requisitoPendiente !== undefined && h.condicionIngreso === 'CONDICIONADO') {
        h.requisitoPendiente = b.requisitoPendiente
      }
      auditar(u, 'ACTUALIZAR', 'estudiante_habilitado', h.id, antes, { ...h })
      return dto.habilitadoDto(h)
    }),
  ),
  /** RF-18 / RN-03: resolución del ingreso de un condicionado. */
  http.post(
    `${API}/estudiantes-habilitados/:id/resolver-ingreso`,
    ruta(
      async ({ req, u, params }) => {
        requiereRol(u, 'ADMIN')
        const h = db.habilitados.find((x) => x.id === params.id)
        if (!h) throw noEncontrado('La habilitación')
        if (h.condicionIngreso !== 'CONDICIONADO' || h.situacionIngreso !== 'PENDIENTE')
          throw falla(
            409,
            'INGRESO_YA_RESUELTO',
            'Solo se resuelve el ingreso de condicionados pendientes.',
          )
        const b = await cuerpo<{
          situacionIngreso: 'ADMITIDO' | 'NO_ADMITIDO'
          observacion?: string
        }>(req)
        if (b.situacionIngreso === 'NO_ADMITIDO' && !b.observacion?.trim())
          throw falla(400, 'OBSERVACION_REQUERIDA', 'Debe indicar el motivo de la no admisión.')
        const antes = { ...h }
        h.situacionIngreso = b.situacionIngreso
        h.observacionIngreso = b.observacion ?? null
        h.fechaResolucionIngreso = ahora()
        h.resueltoPorId = u.id
        const efectos: string[] = []
        if (b.situacionIngreso === 'NO_ADMITIDO') efectos.push(...aplicarNoAdmitido(h, u.id))
        auditar(u, 'RESOLVER_INGRESO', 'estudiante_habilitado', h.id, antes, { ...h, efectos })
        const est = q.estudiante(h.estudianteId)!
        notificar(
          [est.usuarioId],
          'INGRESO_RESUELTO',
          b.situacionIngreso === 'ADMITIDO' ? 'Ingreso admitido' : 'Ingreso no admitido',
          b.situacionIngreso === 'ADMITIDO'
            ? 'Cumpliste el requisito pendiente. Tu ingreso a titulación fue admitido.'
            : `Tu ingreso no fue admitido: ${b.observacion}`,
          { tipo: 'estudiante_habilitado', id: h.id },
        )
        return { ...dto.habilitadoDto(h), efectos }
      },
      { status: 200 },
    ),
  ),
  http.post(
    `${API}/periodos/:pid/estudiantes-habilitados/importar`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const form = await req.formData()
      const archivo = form.get('archivo') as File | null
      if (!archivo) throw falla(400, 'ARCHIVO_REQUERIDO', 'Debe adjuntar un archivo CSV.')
      const filas = parsearCsv(await archivo.text())
      const loteId = uid()
      const errores: { fila: number; mensaje: string }[] = []
      let ok = 0
      filas.forEach((f, i) => {
        const n = i + 2
        if (!f.cedula || !/^\d{10}$/.test(f.cedula))
          return errores.push({ fila: n, mensaje: `Cédula inválida: ${f.cedula || '(vacía)'}` })
        let est = db.estudiantes.find((e) => e.cedula === f.cedula)
        if (!est) {
          if (!f.email?.includes('@'))
            return errores.push({ fila: n, mensaje: 'Correo inválido para estudiante nuevo.' })
          const usuarioId = uid()
          db.usuarios.push({
            id: usuarioId,
            email: f.email,
            nombres: f.nombres || 'Sin nombre',
            apellidos: f.apellidos || '',
            rol: 'ESTUDIANTE',
            estado: 'ACTIVO',
            idExternoSso: null,
            ultimoAcceso: null,
            creadoEn: ahora(),
          })
          est = {
            id: uid(),
            usuarioId,
            cedula: f.cedula,
            matricula: f.matricula || f.cedula,
            carrera: f.carrera || 'Sin carrera',
            nivel: Number(f.nivel) || 10,
          }
          db.estudiantes.push(est)
        }
        if (q.habilitacion(params.pid, est.id))
          return errores.push({ fila: n, mensaje: 'Ya habilitado en el período.' })
        const cond = (f.condicion ?? '').toUpperCase() === 'CONDICIONADO'
        if (cond && !f.requisito)
          return errores.push({ fila: n, mensaje: 'Condicionado sin requisito pendiente.' })
        db.habilitados.push({
          id: uid(),
          periodoId: params.pid,
          estudianteId: est.id,
          origen: 'IMPORTACION',
          loteImportacionId: loteId,
          estado: 'HABILITADO',
          condicionIngreso: cond ? 'CONDICIONADO' : 'REGULAR',
          requisitoPendiente: cond ? f.requisito : null,
          situacionIngreso: cond ? 'PENDIENTE' : 'ADMITIDO',
          fechaHabilitacion: ahora(),
          fechaResolucionIngreso: cond ? null : ahora(),
          resueltoPorId: cond ? null : u.id,
          observacionIngreso: null,
        })
        ok++
      })
      const lote: LoteRow = {
        id: loteId,
        periodoId: params.pid,
        ejecutadoPorId: u.id,
        tipo: 'ESTUDIANTES',
        nombreArchivo: archivo.name,
        rutaAlmacenamiento: `importaciones/${archivo.name}`,
        estado: 'EN_PROCESO',
        totalFilas: filas.length,
        filasOk: ok,
        filasError: errores.length,
        errores,
        fechaInicio: ahora(),
        fechaFin: null,
      }
      db.lotes.push(lote)
      auditar(u, 'IMPORTAR', 'lote_importacion', lote.id, null, {
        tipo: 'ESTUDIANTES',
        totalFilas: filas.length,
      })
      return dto.loteDto(lote)
    }),
  ),
  http.get(
    `${API}/lotes-importacion`,
    ruta(({ url, u }) => {
      requiereRol(u, 'ADMIN')
      const tipo = url.searchParams.get('tipo')
      const periodoId = url.searchParams.get('periodoId')
      return db.lotes
        .filter((l) => (!tipo || l.tipo === tipo) && (!periodoId || l.periodoId === periodoId))
        .map(avanzarLote)
        .reverse()
        .map(dto.loteDto)
    }),
  ),
  http.get(
    `${API}/lotes-importacion/:id`,
    ruta(({ params, u }) => {
      requiereRol(u, 'ADMIN')
      const l = db.lotes.find((x) => x.id === params.id)
      if (!l) throw noEncontrado('El lote')
      return dto.loteDto(avanzarLote(l))
    }),
  ),

  // ── Configuración de carga tutorial (RF-29) ──
  http.get(
    `${API}/periodos/:pid/config-carga`,
    ruta(({ params }) =>
      db.configCarga
        .filter((c) => c.periodoId === params.pid)
        .map((c) => ({
          id: c.id,
          periodoId: c.periodoId,
          docente: c.docenteId ? dto.docenteResumen(c.docenteId) : null,
          maxTrabajos: c.maxTrabajos,
          bloquearAlSuperar: c.bloquearAlSuperar,
        })),
    ),
  ),
  http.put(
    `${API}/periodos/:pid/config-carga`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const b = await cuerpo<{
        docenteId?: string | null
        maxTrabajos: number
        bloquearAlSuperar: boolean
      }>(req)
      if (!(Number(b.maxTrabajos) >= 1))
        throw falla(400, 'MAX_TRABAJOS_INVALIDO', 'El máximo de trabajos debe ser al menos 1.')
      const docenteId = b.docenteId || null
      let c = db.configCarga.find((x) => x.periodoId === params.pid && x.docenteId === docenteId)
      const antes = c ? { ...c } : null
      if (!c) {
        c = {
          id: uid(),
          periodoId: params.pid,
          docenteId,
          maxTrabajos: 1,
          bloquearAlSuperar: false,
        }
        db.configCarga.push(c)
      }
      c.maxTrabajos = Number(b.maxTrabajos)
      c.bloquearAlSuperar = !!b.bloquearAlSuperar
      auditar(u, 'CONFIGURAR_CARGA', 'config_carga_tutorial', c.id, antes, { ...c })
      return { ...c, docente: c.docenteId ? dto.docenteResumen(c.docenteId) : null }
    }),
  ),
  http.delete(
    `${API}/config-carga/:id`,
    ruta(({ u, params }) => {
      requiereRol(u, 'ADMIN')
      const i = db.configCarga.findIndex((x) => x.id === params.id)
      if (i < 0) throw noEncontrado('La configuración')
      if (db.configCarga[i].docenteId === null)
        throw falla(
          409,
          'GLOBAL_REQUERIDO',
          'El límite global del período no puede eliminarse; edítelo.',
        )
      auditar(u, 'ELIMINAR', 'config_carga_tutorial', params.id, { ...db.configCarga[i] }, null)
      db.configCarga.splice(i, 1)
    }),
  ),
]

/**
 * RN-03: un condicionado NO_ADMITIDO pierde su participación.
 * Individual → se anula la asignación/postulación. Grupal → se retira al integrante y,
 * si el grupo queda por debajo del mínimo del tema, se anula la asignación del grupo.
 */
export function aplicarNoAdmitido(h: HabilitadoRow, usuarioId: string): string[] {
  const efectos: string[] = []
  const fecha = ahora()
  const ind = q.postulacionActivaIndividual(h.periodoId, h.estudianteId)
  if (ind) {
    ind.estado = 'ANULADA'
    ind.observacion = 'Estudiante no admitido (RN-03).'
    efectos.push('Postulación individual anulada.')
    const asg = db.asignacionesTema.find(
      (a) => a.postulacionId === ind.id && a.estado === 'VIGENTE',
    )
    if (asg) {
      anularAsignacion(
        asg.id,
        'INCUMPLIMIENTO_CONDICION',
        'Estudiante condicionado no admitido.',
        usuarioId,
      )
      efectos.push('Asignación de tema anulada.')
    }
  }
  const g = q.grupoActivoDe(h.periodoId, h.estudianteId)
  if (g) {
    const integ = db.integrantes.find(
      (i) => i.grupoId === g.id && i.estudianteId === h.estudianteId && i.estado === 'ACTIVO',
    )!
    integ.estado = 'RETIRADO'
    integ.fechaSalida = fecha
    integ.motivoSalida = 'Estudiante condicionado no admitido (RN-03).'
    efectos.push(`Retirado del grupo "${g.nombre}".`)
    const restantes = q.integrantesActivos(g.id)
    if (integ.rolEnGrupo === 'REPRESENTANTE' && restantes[0])
      restantes[0].rolEnGrupo = 'REPRESENTANTE'
    const pos = q.postulacionActivaDeGrupo(g.id)
    const t = pos ? q.tema(pos.temaId) : undefined
    const minimo = Math.max(2, t?.minIntegrantes ?? 2)
    if (restantes.length < minimo) {
      g.estado = 'ANULADO'
      efectos.push(`Grupo "${g.nombre}" anulado por quedar con ${restantes.length} integrante(s).`)
      if (pos) {
        const asg = db.asignacionesTema.find(
          (a) => a.postulacionId === pos.id && a.estado === 'VIGENTE',
        )
        if (asg) {
          anularAsignacion(
            asg.id,
            'INCUMPLIMIENTO_CONDICION',
            'El grupo no cumple el mínimo de integrantes tras la no admisión.',
            usuarioId,
          )
          efectos.push('Asignación del grupo anulada.')
        }
        pos.estado = 'ANULADA'
      }
      notificar(
        restantes.map((r) => q.estudiante(r.estudianteId)?.usuarioId),
        'GRUPO_ANULADO',
        'Grupo anulado',
        `El grupo "${g.nombre}" fue anulado porque un integrante no fue admitido y no se cumple el mínimo.`,
      )
    } else if (pos) {
      pos.numIntegrantes = restantes.length
    }
  }
  return efectos
}

export function anularAsignacion(
  id: string,
  causa: 'INCUMPLIMIENTO_CONDICION' | 'OTRA',
  motivo: string,
  usuarioId: string,
) {
  const a = db.asignacionesTema.find((x) => x.id === id)!
  const fecha = ahora()
  a.estado = 'ANULADA'
  a.causaAnulacion = causa
  a.motivoAnulacion = motivo
  a.anuladaPorId = usuarioId
  a.fechaAnulacion = fecha
  const tutor = q.tutorVigente(a.id)
  if (tutor) {
    tutor.estado = 'ANULADA'
    tutor.fechaFin = fecha
    tutor.motivoCambio = 'Asignación de tema anulada.'
  }
  const pos = db.postulaciones.find((p) => p.id === a.postulacionId)
  if (pos) pos.estado = 'ANULADA'
  const t = q.tema(a.temaId)!
  if (t.estado === 'ASIGNADO') {
    db.temaHistorial.push({
      id: uid(),
      temaId: t.id,
      usuarioId,
      estadoAnterior: 'ASIGNADO',
      estadoNuevo: 'PUBLICADO',
      cambios: { motivo: { antes: null, despues: 'Asignación anulada' } },
      fecha,
    })
    t.estado = 'PUBLICADO'
  }
  notificar(
    q.usuariosDeEstudiantes(q.estudiantesDeAsignacion(a.id)),
    'ASIGNACION_ANULADA',
    'Asignación de tema anulada',
    `La asignación del tema "${t.titulo}" fue anulada: ${motivo}`,
    { tipo: 'asignacion_tema', id: a.id },
  )
}
