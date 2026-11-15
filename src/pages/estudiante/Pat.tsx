import { useState } from 'react'
import { toast } from 'sonner'
import { useUsuario } from '@/auth/AuthProvider'
import { api, ApiError } from '@/api/client'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { FileUpload } from '@/components/FileUpload'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMiAsignacion } from '@/features/asignaciones/api'
import { useMisPostulaciones } from '@/features/postulaciones/api'
import { HistorialVersionesPat } from '@/features/pat/HistorialVersiones'
import {
  descargarGeneracionPat,
  useContenidoPat,
  useDatosPat,
  useDocumentosPat,
  useGeneracionPat,
  useGuardarContenidoPat,
  useGuardarDatosPat,
  useSolicitarGeneracionPat,
  useSubirPat,
} from '@/features/pat/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { MAX_TAMANO_PAT } from '@/lib/archivos'
import { mensajeError } from '@/lib/errores'

const campos = [
  ['fechaNacimiento', 'Fecha de nacimiento', 10],
  ['curso', 'Curso', 40],
  ['paralelo', 'Paralelo', 20],
  ['sexo', 'Sexo', 40],
  ['nacionalidad', 'Nacionalidad', 80],
  ['estadoCivil', 'Estado civil', 40],
  ['provincia', 'Provincia', 100],
  ['canton', 'Cantón', 100],
  ['parroquia', 'Parroquia', 100],
  ['celular', 'Celular', 30],
  ['certificadoVotacion', 'Certificado de votación', 100],
  ['correoPersonal', 'Correo personal', 150],
  ['telefonoConvencional', 'Teléfono convencional', 30],
] as const
const noAplica = ['certificadoVotacion', 'correoPersonal', 'telefonoConvencional']
const etiquetasIdentidad: Record<string, string> = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  cedula: 'Cédula',
  matricula: 'Matrícula',
  nivel: 'Nivel',
  correoInstitucional: 'Correo institucional',
  carrera: 'Carrera',
  facultad: 'Facultad',
}
const nombreCampo = (campo: string) =>
  campo
    .replace(
      /extension_pat configurada por ADMIN/g,
      'Sede o extensión del período (debe configurarla un administrador)',
    )
    .replace(/_no_aplica/g, ' (o marcar No aplica)')
    .replace(/_excluyentes/g, ' incompatibles')
    .replace(/_/g, ' ')
const discapacidades = [
  'VISUAL',
  'FISICA',
  'AUDITIVA',
  'INTELECTUAL',
  'PSICOLOGICA',
  'LENGUAJE',
  'OTRA',
]

function Formularios({ pid, aid }: { pid: string; aid: string }) {
  const datos = useDatosPat()
  const contenido = useContenidoPat(pid, aid)
  const guardarDatos = useGuardarDatosPat()
  const guardarContenido = useGuardarContenidoPat(pid, aid)
  const [personal, setPersonal] = useState<Record<string, unknown> | null>(null)
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null)
  const d = personal ?? datos.data?.datos ?? {}
  const c = plan ?? contenido.data?.contenido ?? {}
  const editar = (k: string, v: unknown) => setPersonal({ ...d, [k]: v })
  const editarPlan = (k: string, v: unknown) => setPlan({ ...c, [k]: v })
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {datos.isPending ? (
            <p>Cargando datos…</p>
          ) : datos.isError ? (
            <p>No se pudieron cargar los datos.</p>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                {Object.entries(datos.data.identidad ?? {})
                  .filter(([k]) => k !== 'id')
                  .map(([k, v]) => (
                    <p key={k}>
                      {etiquetasIdentidad[k] ?? k}: {String(v ?? '')}
                    </p>
                  ))}
              </div>
              {campos.map(([k, label, max]) => (
                <label key={k} className="block text-sm">
                  {label}
                  <Input
                    type={
                      k === 'fechaNacimiento' ? 'date' : k === 'correoPersonal' ? 'email' : 'text'
                    }
                    maxLength={max}
                    value={String(d[k] ?? '')}
                    disabled={d[`${k}NoAplica`] === true}
                    onChange={(e) => editar(k, e.target.value)}
                  />
                  {noAplica.includes(k) && (
                    <span>
                      <input
                        type="checkbox"
                        checked={d[`${k}NoAplica`] === true}
                        onChange={(e) =>
                          setPersonal({ ...d, [k]: null, [`${k}NoAplica`]: e.target.checked })
                        }
                      />{' '}
                      No aplica
                    </span>
                  )}
                </label>
              ))}
              <label className="block text-sm">
                ¿Tiene discapacidad?{' '}
                <select
                  value={d.tieneDiscapacidad == null ? '' : String(d.tieneDiscapacidad)}
                  onChange={(e) => editar('tieneDiscapacidad', e.target.value === 'true')}
                >
                  <option value="">Seleccione</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              {d.tieneDiscapacidad === true && (
                <div className="space-y-2">
                  {discapacidades.map((x) => (
                    <label key={x} className="block text-sm">
                      <input
                        type="checkbox"
                        checked={Array.isArray(d.discapacidades) && d.discapacidades.includes(x)}
                        onChange={(e) =>
                          editar(
                            'discapacidades',
                            e.target.checked
                              ? [...(Array.isArray(d.discapacidades) ? d.discapacidades : []), x]
                              : Array.isArray(d.discapacidades)
                                ? d.discapacidades.filter((v) => v !== x)
                                : [],
                          )
                        }
                      />{' '}
                      {x}
                    </label>
                  ))}
                  <label>
                    Grado
                    <Input
                      maxLength={200}
                      value={String(d.gradoDiscapacidad ?? '')}
                      onChange={(e) => editar('gradoDiscapacidad', e.target.value)}
                    />
                  </label>
                  {Array.isArray(d.discapacidades) && d.discapacidades.includes('OTRA') && (
                    <label>
                      Otra discapacidad
                      <Input
                        maxLength={200}
                        value={String(d.otraDiscapacidad ?? '')}
                        onChange={(e) => editar('otraDiscapacidad', e.target.value)}
                      />
                    </label>
                  )}
                </div>
              )}
              <p className="text-sm">
                Pendientes: {datos.data.pendientes.map(nombreCampo).join(', ') || 'ninguno'}
              </p>
              <Button
                disabled={guardarDatos.isPending || !personal}
                onClick={() =>
                  guardarDatos.mutate(
                    {
                      ...d,
                      ...(d.correoPersonal === '' ? { correoPersonal: null } : {}),
                        ...(d.fechaNacimiento === '' ? { fechaNacimiento: undefined } : {}),
                    },
                    { onSuccess: () => setPersonal(null) },
                  )
                }
              >
                Guardar datos personales
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Contenido del PAT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contenido.isPending ? (
            <p>Cargando contenido…</p>
          ) : contenido.isError ? (
            <p>No se pudo cargar el contenido.</p>
          ) : (
            <>
              <label className="block text-sm">
                Modalidad académica
                <Input
                  maxLength={120}
                  value={String(c.modalidadAcademica ?? '')}
                  onChange={(e) => editarPlan('modalidadAcademica', e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Problemática
                <Textarea
                  maxLength={5000}
                  rows={7}
                  value={String(c.problematica ?? '')}
                  onChange={(e) =>
                    setPlan({ ...c, problematica: e.target.value, confirmaProblematica: false })
                  }
                />
              </label>
              <label className="block text-sm">
                <input
                  type="checkbox"
                  checked={c.confirmaProblematica === true}
                  onChange={(e) => editarPlan('confirmaProblematica', e.target.checked)}
                />{' '}
                Confirmo la problemática
              </label>
              <p>Articulación</p>
              {['INVESTIGACION', 'VINCULACION', 'DOCENCIA', 'NINGUNA'].map((x) => (
                <label key={x} className="block text-sm">
                  <input
                    type="checkbox"
                    checked={Array.isArray(c.articulaciones) && c.articulaciones.includes(x)}
                    onChange={(e) => {
                      const prev = Array.isArray(c.articulaciones)
                        ? (c.articulaciones as string[])
                        : []
                      editarPlan(
                        'articulaciones',
                        e.target.checked
                          ? x === 'NINGUNA'
                            ? [x]
                            : [...prev.filter((v) => v !== 'NINGUNA'), x]
                          : prev.filter((v) => v !== x),
                      )
                    }}
                  />{' '}
                  {x}
                </label>
              ))}
              <p className="text-sm">
                Pendientes: {contenido.data.pendientes.map(nombreCampo).join(', ') || 'ninguno'}
              </p>
              <Button
                disabled={guardarContenido.isPending || !plan}
                onClick={() => guardarContenido.mutate(c, { onSuccess: () => setPlan(null) })}
              >
                Guardar contenido
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Entrega({
  pid,
  aid,
  postulacionId,
  tieneTutor,
  habilitado,
}: {
  pid: string
  aid: string
  postulacionId: string
  tieneTutor: boolean
  habilitado: boolean
}) {
  const usuario = useUsuario()
  const clave = `pat.generacion.${usuario.id}.${pid}.${aid}`
  const [id, setId] = useState(() => sessionStorage.getItem(clave) ?? '')
  const [tutor, setTutor] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const postulaciones = useMisPostulaciones(pid)
  const generacion = useGeneracionPat(pid, aid, id)
  const solicitar = useSolicitarGeneracionPat(pid, aid)
  const subir = useSubirPat(aid)
  const documentos = useDocumentosPat(aid)
  const ultimo = documentos.data?.[0]
  const puede =
    habilitado &&
    !!documentos.data &&
    (!ultimo || ultimo.estado === 'OBSERVADO' || ultimo.estado === 'RECHAZADO')
  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle>Generación y entrega</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!habilitado && <p>El período debe estar con postulaciones cerradas o en curso.</p>}
        {!tieneTutor && (
          <label className="block">
            Tutor propuesto{' '}
            <select value={tutor} onChange={(e) => setTutor(e.target.value)}>
              <option value="">Seleccione</option>
              {postulaciones.data
                ?.find((p) => p.id === postulacionId)
                ?.tutoresPropuestos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.docente.nombres} {t.docente.apellidos}
                  </option>
                ))}
            </select>
          </label>
        )}
        <Button
          disabled={!habilitado || solicitar.isPending || (!tieneTutor && !tutor)}
          onClick={() =>
            solicitar.mutate(tieneTutor ? undefined : tutor, {
              onSuccess: (g) => {
                sessionStorage.setItem(clave, g.id)
                setId(g.id)
              },
            })
          }
        >
          Generar PDF
        </Button>
        {solicitar.error instanceof ApiError && !!solicitar.error.pendientes?.length && (
          <p role="alert">Faltan: {solicitar.error.pendientes.map(nombreCampo).join(', ')}.</p>
        )}
        {id && (
          <div className="space-y-2">
            <p>
              Generación:{' '}
              {generacion.data?.estado ?? (generacion.isError ? 'No disponible' : 'consultando…')}
            </p>
            {generacion.data?.estado === 'FALLIDO' && (
              <>
                <p>{generacion.data.error}</p>
                <Button
                  onClick={() =>
                    api
                      .post(
                        `${`/periodos/${pid}/asignaciones-tema/${aid}/pat/me/generaciones/${id}`}/reintentar`,
                        {},
                      )
                      .then(() => generacion.refetch())
                      .catch((e) => toast.error(mensajeError(e)))
                  }
                >
                  Reintentar
                </Button>
              </>
            )}
            {generacion.data?.estado === 'LISTO' && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    descargarGeneracionPat(pid, aid, id).catch((e) => toast.error(mensajeError(e)))
                  }
                >
                  Descargar PDF sin firma
                </Button>
                <p>Firma el documento y carga el PDF firmado.</p>
                {puede && (
                  <>
                    <FileUpload
                      reglas={{ tipos: { pdf: ['application/pdf'] }, maxBytes: MAX_TAMANO_PAT }}
                      archivo={archivo}
                      onChange={setArchivo}
                      etiqueta="Selecciona el PDF firmado"
                    />
                    <Button
                      disabled={!archivo || subir.isPending}
                      onClick={() =>
                        archivo &&
                        subir.mutate(
                          { archivo, generacionId: id },
                          { onSuccess: () => setArchivo(null) },
                        )
                      }
                    >
                      Entregar PAT firmado
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}
        <ConsultaEstado query={documentos}>
          {(docs) => <HistorialVersionesPat documentos={docs} />}
        </ConsultaEstado>
      </CardContent>
    </Card>
  )
}

export default function Pat() {
  const { periodoId, periodo } = usePeriodo()
  const asignacion = useMiAsignacion(periodoId)
  return (
    <>
      <PageHeader
        titulo="Plan de Trabajo (PAT)"
        descripcion="Completa tus datos, genera el PDF, fírmalo y entrega tu PAT individual."
      />
      <ConsultaEstado query={asignacion}>
        {(a) =>
          !a || !periodoId ? (
            <Vacio titulo="Sin tema asignado" />
          ) : (
            <div key={`${periodoId}-${a.id}`}>
              <p className="mb-4 font-medium">{a.tema.titulo}</p>
              <Formularios pid={periodoId} aid={a.id} />
              <Entrega
                pid={periodoId}
                aid={a.id}
                postulacionId={a.postulacionId}
                tieneTutor={!!a.tutorVigente}
                habilitado={
                  ['POSTULACION_CERRADA', 'EN_CURSO'].includes(periodo?.estado ?? '') &&
                  a.estado === 'VIGENTE'
                }
              />
            </div>
          )
        }
      </ConsultaEstado>
    </>
  )
}
