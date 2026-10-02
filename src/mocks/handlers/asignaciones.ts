import { http } from 'msw'
import type { CausaAnulacion } from '@/types/dominio'
import { ahora, db, uid, type AsignacionTemaRow } from '../db'
import * as q from '../consultas'
import * as dto from '../dto'
import {
  API,
  auditar,
  cuerpo,
  falla,
  noEncontrado,
  notificar,
  prohibido,
  requiereRol,
  ruta,
} from '../util'
import { anularAsignacion } from './catalogos'
import { rechazarPostulacionesAbiertas } from './temas'

export const asignacionHandlers = [
  http.get(
    `${API}/asignaciones-tema`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ADMIN')
      const periodoId = url.searchParams.get('periodoId')
      const estado = url.searchParams.get('estado')
      return db.asignacionesTema
        .filter((a) => !periodoId || q.tema(a.temaId)?.periodoId === periodoId)
        .filter((a) => !estado || a.estado === estado)
        .sort((a, b) => b.fechaAsignacion.localeCompare(a.fechaAsignacion))
        .map(dto.asignacionDto)
    }),
  ),
  http.get(
    `${API}/asignaciones-tema/:id`,
    ruta(({ u, params }) => {
      const a = db.asignacionesTema.find((x) => x.id === params.id)
      if (!a) throw noEncontrado('La asignación')
      if (u.rol === 'ESTUDIANTE') {
        const e = q.estudianteDeUsuario(u.id)
        if (!e || !q.estudiantesDeAsignacion(a.id).includes(e.id)) throw prohibido()
      }
      return dto.asignacionDto(a)
    }),
  ),
  // RF-24 / RF-25: asignar tema desde una postulación aceptada
  http.post(
    `${API}/asignaciones-tema`,
    ruta(async ({ req, u }) => {
      requiereRol(u, 'ADMIN')
      const b = await cuerpo<{ postulacionId: string; motivo?: string }>(req)
      const p = db.postulaciones.find((x) => x.id === b.postulacionId)
      if (!p) throw noEncontrado('La postulación')
      if (p.estado !== 'ACEPTADA')
        throw falla(
          409,
          'POSTULACION_NO_ACEPTADA',
          'Solo se asigna a partir de una postulación aceptada.',
          'RF-24',
        )
      const t = q.tema(p.temaId)!
      if (q.asignacionVigenteDeTema(t.id))
        throw falla(409, 'TEMA_YA_ASIGNADO', 'El tema ya tiene una asignación vigente.', 'RN-07')
      for (const est of q.integrantesDePostulacion(p)) {
        if (q.asignacionVigenteDe(p.periodoId, est))
          throw falla(
            409,
            'ESTUDIANTE_YA_ASIGNADO',
            'Un estudiante de la postulación ya tiene una asignación vigente.',
            'RN-08',
          )
      }
      const a: AsignacionTemaRow = {
        id: uid(),
        temaId: t.id,
        postulacionId: p.id,
        grupoId: p.grupoId,
        estudianteId: p.estudianteId,
        aprobadaPorId: u.id,
        estado: 'VIGENTE',
        fechaAsignacion: ahora(),
        motivo: b.motivo ?? null,
        causaAnulacion: null,
        motivoAnulacion: null,
        anuladaPorId: null,
        fechaAnulacion: null,
      }
      db.asignacionesTema.push(a)
      const anterior = t.estado
      t.estado = 'ASIGNADO'
      db.temaHistorial.push({
        id: uid(),
        temaId: t.id,
        usuarioId: u.id,
        estadoAnterior: anterior,
        estadoNuevo: 'ASIGNADO',
        cambios: null,
        fecha: ahora(),
      })
      rechazarPostulacionesAbiertas(t.id, 'El tema fue asignado a otra postulación.', p.id)
      // las demás postulaciones aceptadas del tema (si las hubiera) también se rechazan
      for (const otra of db.postulaciones.filter(
        (x) => x.temaId === t.id && x.id !== p.id && x.estado === 'ACEPTADA',
      )) {
        otra.estado = 'RECHAZADA'
        otra.observacion = 'El tema fue asignado a otra postulación.'
      }
      auditar(u, 'ASIGNAR_TEMA', 'asignacion_tema', a.id, null, {
        temaId: t.id,
        postulacionId: p.id,
      })
      notificar(
        q.usuariosDeEstudiantes(q.integrantesDePostulacion(p)),
        'TEMA_ASIGNADO',
        'Tema asignado',
        `Se te asignó el tema "${t.titulo}".`,
        { tipo: 'asignacion_tema', id: a.id },
      )
      return dto.asignacionDto(a)
    }),
  ),
  http.post(
    `${API}/asignaciones-tema/:id/anular`,
    ruta(
      async ({ req, u, params }) => {
        requiereRol(u, 'ADMIN')
        const a = db.asignacionesTema.find((x) => x.id === params.id)
        if (!a) throw noEncontrado('La asignación')
        if (a.estado !== 'VIGENTE') throw falla(409, 'YA_ANULADA', 'La asignación ya fue anulada.')
        const b = await cuerpo<{ causaAnulacion: CausaAnulacion; motivoAnulacion: string }>(req)
        if (!b.causaAnulacion || !b.motivoAnulacion?.trim())
          throw falla(400, 'MOTIVO_REQUERIDO', 'La anulación exige causa y motivo.', 'RN-13')
        anularAsignacion(a.id, b.causaAnulacion, b.motivoAnulacion.trim(), u.id)
        auditar(
          u,
          'ANULAR_ASIGNACION',
          'asignacion_tema',
          a.id,
          { estado: 'VIGENTE' },
          { estado: 'ANULADA', causa: b.causaAnulacion, motivo: b.motivoAnulacion },
        )
        return dto.asignacionDto(a)
      },
      { status: 200 },
    ),
  ),

  // ── Tutor (RF-26 a RF-30) ──
  http.get(
    `${API}/asignaciones-tema/:id/tutores`,
    ruta(({ params }) =>
      db.asignacionesTutor
        .filter((t) => t.asignacionTemaId === params.id)
        .sort((a, b) => b.fechaAsignacion.localeCompare(a.fechaAsignacion))
        .map(dto.asignacionTutorDto),
    ),
  ),
  http.post(
    `${API}/asignaciones-tema/:id/tutor`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const a = db.asignacionesTema.find((x) => x.id === params.id)
      if (!a) throw noEncontrado('La asignación')
      if (a.estado !== 'VIGENTE')
        throw falla(409, 'ASIGNACION_ANULADA', 'La asignación de tema no está vigente.')
      const b = await cuerpo<{
        docenteId: string
        motivoCambio?: string
        confirmarExceso?: boolean
      }>(req)
      const d = q.docente(b.docenteId)
      if (!d) throw noEncontrado('El docente')
      if (!d.habilitadoTutoria)
        throw falla(
          409,
          'DOCENTE_NO_HABILITADO',
          'El docente no está habilitado para tutoría.',
          'RF-27',
        )
      const vigente = q.tutorVigente(a.id)
      if (vigente?.docenteId === d.id)
        throw falla(409, 'MISMO_TUTOR', 'El docente ya es el tutor vigente.')
      if (vigente && !b.motivoCambio?.trim())
        throw falla(
          400,
          'MOTIVO_REQUERIDO',
          'El reemplazo de tutor exige indicar el motivo.',
          'RF-27',
        )
      const t = q.tema(a.temaId)!
      const carga = q.cargaDocente(t.periodoId, d.id)
      if (carga.limite !== null && carga.actual + 1 > carga.limite) {
        if (carga.bloquear)
          throw falla(
            409,
            'CARGA_TUTORIAL_EXCEDIDA',
            `El docente alcanzó su límite de ${carga.limite} trabajo(s); la configuración bloquea la asignación.`,
            'RN-11',
            carga,
          )
        if (!b.confirmarExceso)
          throw falla(
            409,
            'CARGA_TUTORIAL_ADVERTENCIA',
            `El docente supera su límite de ${carga.limite} trabajo(s) (actual: ${carga.actual}). Confirme para continuar.`,
            'RN-11',
            carga,
          )
      }
      const fecha = ahora()
      if (vigente) {
        vigente.estado = 'REEMPLAZADA'
        vigente.fechaFin = fecha
        vigente.motivoCambio = b.motivoCambio!.trim()
      }
      const propuesto = db.tutoresPropuestos.find(
        (tp) => tp.postulacionId === a.postulacionId && tp.docenteId === d.id,
      )
      const nuevo = {
        id: uid(),
        asignacionTemaId: a.id,
        docenteId: d.id,
        tutorPropuestoId: propuesto?.id ?? null,
        tipo: propuesto ? ('PROPUESTO_CONFIRMADO' as const) : ('ASIGNADO_DIRECTO' as const),
        estado: 'VIGENTE' as const,
        asignadaPorId: u.id,
        fechaAsignacion: fecha,
        fechaFin: null,
        motivoCambio: null,
      }
      db.asignacionesTutor.push(nuevo)
      auditar(
        u,
        vigente ? 'REEMPLAZAR_TUTOR' : 'ASIGNAR_TUTOR',
        'asignacion_tutor',
        nuevo.id,
        vigente ? { docenteId: vigente.docenteId } : null,
        { docenteId: d.id, tipo: nuevo.tipo, motivo: b.motivoCambio },
      )
      const du = q.usuario(d.usuarioId)!
      notificar(
        q.usuariosDeEstudiantes(q.estudiantesDeAsignacion(a.id)),
        'TUTOR_ASIGNADO',
        vigente ? 'Tutor reemplazado' : 'Tutor asignado',
        `${du.nombres} ${du.apellidos} es tu tutor(a) para "${t.titulo}".`,
        { tipo: 'asignacion_tutor', id: nuevo.id },
      )
      notificar(
        [du.id],
        'TUTORIA_ASIGNADA',
        'Nueva tutoría asignada',
        `Fuiste asignado(a) como tutor(a) del tema "${t.titulo}".`,
        { tipo: 'asignacion_tutor', id: nuevo.id },
      )
      return dto.asignacionTutorDto(nuevo)
    }),
  ),
  http.get(
    `${API}/periodos/:pid/carga-tutorial`,
    ruta(({ u, params }) => {
      requiereRol(u, 'ADMIN')
      return db.docentes.map((d) => ({
        docente: dto.docenteResumen(d.id),
        habilitadoTutoria: d.habilitadoTutoria,
        ...q.cargaDocente(params.pid, d.id),
      }))
    }),
  ),
]
