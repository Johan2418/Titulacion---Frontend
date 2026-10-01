import { http } from 'msw'
import type { ResultadoRevision } from '@/types/dominio'
import { MAX_TAMANO_PAT } from '@/lib/archivos'
import { ahora, db, uid } from '../db'
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
  sha256,
  urlPrefirmada,
} from '../util'

const MIME_PAT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function exigirAccesoAsignacion(usuarioId: string, rol: string, asignacionId: string) {
  if (rol === 'ADMIN') return
  if (rol === 'DOCENTE') {
    const d = q.docenteDeUsuario(usuarioId)
    if (
      !db.asignacionesTutor.some(
        (t) => t.asignacionTemaId === asignacionId && t.docenteId === d?.id,
      )
    )
      throw prohibido()
    return
  }
  const e = q.estudianteDeUsuario(usuarioId)
  if (!e || !q.estudiantesDeAsignacion(asignacionId).includes(e.id)) throw prohibido()
}

export const patHandlers = [
  // ── Plantillas (RF-12, RF-33) ──
  http.get(
    `${API}/periodos/:pid/plantillas-pat`,
    ruta(({ params }) =>
      db.plantillas
        .filter((p) => p.periodoId === params.pid)
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
        .map(dto.plantillaDto),
    ),
  ),
  http.get(
    `${API}/periodos/:pid/plantillas-pat/vigente`,
    ruta(({ params }) => {
      const p = db.plantillas.find((x) => x.periodoId === params.pid && x.activa)
      return p ? dto.plantillaDto(p) : Response.json(null)
    }),
  ),
  http.post(
    `${API}/periodos/:pid/plantillas-pat`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const form = await req.formData()
      const archivo = form.get('archivo') as File | null
      const version = String(form.get('version') ?? '').trim()
      if (!archivo) throw falla(400, 'ARCHIVO_REQUERIDO', 'Debe adjuntar la plantilla.')
      if (!version) throw falla(400, 'VERSION_REQUERIDA', 'Debe indicar la versión.')
      if (db.plantillas.some((p) => p.periodoId === params.pid && p.version === version))
        throw falla(409, 'VERSION_DUPLICADA', `Ya existe la versión ${version} en el período.`)
      const activar = form.get('activar') === 'true'
      if (activar)
        for (const p of db.plantillas.filter((x) => x.periodoId === params.pid)) p.activa = false
      const pl = {
        id: uid(),
        periodoId: params.pid,
        version,
        nombreArchivo: archivo.name,
        rutaAlmacenamiento: `plantillas/${archivo.name}`,
        mimeType: archivo.type || 'application/octet-stream',
        tamanoBytes: archivo.size,
        fechaVigenciaInicio: (form.get('fechaVigenciaInicio') as string) || null,
        fechaVigenciaFin: (form.get('fechaVigenciaFin') as string) || null,
        publicadaPorId: u.id,
        activa: activar,
        creadoEn: ahora(),
      }
      db.plantillas.push(pl)
      auditar(u, 'PUBLICAR_PLANTILLA', 'plantilla_pat', pl.id, null, { version, activa: activar })
      return dto.plantillaDto(pl)
    }),
  ),
  http.post(
    `${API}/plantillas-pat/:id/activar`,
    ruta(
      ({ u, params }) => {
        requiereRol(u, 'ADMIN')
        const pl = db.plantillas.find((x) => x.id === params.id)
        if (!pl) throw noEncontrado('La plantilla')
        const anterior = db.plantillas.find((x) => x.periodoId === pl.periodoId && x.activa)
        for (const p of db.plantillas.filter((x) => x.periodoId === pl.periodoId)) p.activa = false
        pl.activa = true
        auditar(
          u,
          'ACTIVAR_PLANTILLA',
          'plantilla_pat',
          pl.id,
          { activa: anterior?.id ?? null },
          { activa: pl.id },
        )
        return dto.plantillaDto(pl)
      },
      { status: 200 },
    ),
  ),
  http.get(
    `${API}/plantillas-pat/:id/descarga`,
    ruta(({ params }) => {
      const pl = db.plantillas.find((x) => x.id === params.id)
      if (!pl) throw noEncontrado('La plantilla')
      return urlPrefirmada(
        pl.nombreArchivo,
        `Plantilla PAT versión ${pl.version} (archivo simulado)`,
      )
    }),
  ),

  // ── Documentos PAT (RF-13, RF-14) ──
  http.get(
    `${API}/asignaciones-tema/:id/documentos-pat`,
    ruta(({ u, params }) => {
      exigirAccesoAsignacion(u.id, u.rol, params.id)
      return q
        .documentosDeAsignacion(params.id)
        .reverse()
        .map((d) => dto.documentoDto(d))
    }),
  ),
  http.post(
    `${API}/asignaciones-tema/:id/documentos-pat`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ESTUDIANTE')
      const a = db.asignacionesTema.find((x) => x.id === params.id)
      if (!a) throw noEncontrado('La asignación')
      exigirAccesoAsignacion(u.id, u.rol, a.id)
      if (a.estado !== 'VIGENTE')
        throw falla(
          409,
          'SIN_ASIGNACION_VIGENTE',
          'Se requiere una asignación vigente para cargar el PAT.',
          'RF-13',
        )
      const ultimo = q.documentosDeAsignacion(a.id).at(-1)
      if (ultimo) {
        const estado = q.estadoDocumento(ultimo.id)
        if (estado === 'PENDIENTE')
          throw falla(409, 'PAT_EN_REVISION', 'La última versión aún está pendiente de revisión.')
        if (estado === 'APROBADO') throw falla(409, 'PAT_APROBADO', 'El PAT ya fue aprobado.')
      }
      const form = await req.formData()
      const archivo = form.get('archivo') as File | null
      if (!archivo || archivo.size === 0)
        throw falla(400, 'ARCHIVO_REQUERIDO', 'Debe adjuntar el PAT.', 'RNF-14')
      const ext = archivo.name.split('.').pop()?.toLowerCase() ?? ''
      if (!MIME_PAT[ext] || (archivo.type && archivo.type !== MIME_PAT[ext]))
        throw falla(
          415,
          'FORMATO_INVALIDO',
          'El PAT debe ser un archivo PDF o DOCX válido.',
          'RNF-09',
        )
      if (archivo.size > MAX_TAMANO_PAT)
        throw falla(
          413,
          'ARCHIVO_GRANDE',
          'El archivo supera el tamaño máximo permitido.',
          'RNF-14',
        )
      const plantilla = db.plantillas.find(
        (p) => p.periodoId === q.tema(a.temaId)!.periodoId && p.activa,
      )
      const doc = {
        id: uid(),
        asignacionTemaId: a.id,
        plantillaId: plantilla?.id ?? null,
        version: (ultimo?.version ?? 0) + 1,
        nombreArchivo: archivo.name,
        rutaAlmacenamiento: `pat/${a.id}/${archivo.name}`,
        formato: ext.toUpperCase() as 'PDF' | 'DOCX',
        tamanoBytes: archivo.size,
        hashSha256: await sha256(archivo),
        cargadoPorId: u.id,
        fechaCarga: ahora(),
      }
      db.documentosPat.push(doc)
      auditar(u, 'CARGAR_PAT', 'documento_pat', doc.id, null, {
        version: doc.version,
        hash: doc.hashSha256,
      })
      notificar(
        db.usuarios.filter((x) => x.rol === 'ADMIN').map((x) => x.id),
        'PAT_CARGADO',
        'Nuevo PAT por revisar',
        `Se cargó la versión ${doc.version} del PAT de "${q.tema(a.temaId)!.titulo}".`,
        { tipo: 'documento_pat', id: doc.id },
      )
      return dto.documentoDto(doc)
    }),
  ),
  http.get(
    `${API}/documentos-pat/:id/descarga`,
    ruta(({ u, params }) => {
      const d = db.documentosPat.find((x) => x.id === params.id)
      if (!d) throw noEncontrado('El documento')
      exigirAccesoAsignacion(u.id, u.rol, d.asignacionTemaId)
      return urlPrefirmada(
        d.nombreArchivo,
        `PAT versión ${d.version} — SHA-256 ${d.hashSha256} (archivo simulado)`,
      )
    }),
  ),
  // Bandeja de revisión (RF-31)
  http.get(
    `${API}/documentos-pat`,
    ruta(({ u, url }) => {
      requiereRol(u, 'ADMIN')
      const periodoId = url.searchParams.get('periodoId')
      const estado = url.searchParams.get('estado')
      return db.documentosPat
        .filter((d) => {
          const a = db.asignacionesTema.find((x) => x.id === d.asignacionTemaId)!
          return !periodoId || q.tema(a.temaId)?.periodoId === periodoId
        })
        .filter((d) => !estado || q.estadoDocumento(d.id) === estado)
        .sort((a, b) => b.fechaCarga.localeCompare(a.fechaCarga))
        .map((d) => dto.documentoDto(d, true))
    }),
  ),
  // RF-31 / RF-32 / RN-12
  http.post(
    `${API}/documentos-pat/:id/revision`,
    ruta(async ({ req, u, params }) => {
      requiereRol(u, 'ADMIN')
      const d = db.documentosPat.find((x) => x.id === params.id)
      if (!d) throw noEncontrado('El documento')
      if (q.revisionDe(d.id))
        throw falla(409, 'YA_REVISADO', 'Esta versión ya fue revisada.', 'RN-12')
      const b = await cuerpo<{ resultado: ResultadoRevision; observaciones?: string }>(req)
      if (!['APROBADO', 'OBSERVADO', 'RECHAZADO'].includes(b.resultado))
        throw falla(400, 'RESULTADO_INVALIDO', 'Resultado de revisión inválido.')
      if (b.resultado !== 'APROBADO' && !b.observaciones?.trim())
        throw falla(
          400,
          'OBSERVACIONES_REQUERIDAS',
          'Observar o rechazar el PAT exige registrar observaciones.',
          'RN-12',
        )
      const r = {
        id: uid(),
        documentoPatId: d.id,
        revisorId: u.id,
        resultado: b.resultado,
        observaciones: b.observaciones?.trim() || null,
        fechaRevision: ahora(),
      }
      db.revisionesPat.push(r)
      auditar(u, 'REVISAR_PAT', 'revision_pat', r.id, null, {
        documentoId: d.id,
        resultado: r.resultado,
      })
      const etiqueta = { APROBADO: 'aprobado', OBSERVADO: 'observado', RECHAZADO: 'rechazado' }[
        r.resultado
      ]
      notificar(
        q.usuariosDeEstudiantes(q.estudiantesDeAsignacion(d.asignacionTemaId)),
        'PAT_REVISADO',
        `Tu PAT fue ${etiqueta}`,
        r.resultado === 'APROBADO'
          ? `La versión ${d.version} de tu PAT fue aprobada.`
          : `La versión ${d.version} de tu PAT fue ${etiqueta}. Revisa las observaciones y carga una nueva versión.`,
        { tipo: 'documento_pat', id: d.id },
      )
      return dto.documentoDto(d, true)
    }),
  ),
]
