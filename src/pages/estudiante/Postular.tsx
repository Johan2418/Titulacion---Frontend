import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  PlusIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react'
import { useUsuario } from '@/auth/AuthProvider'
import { SelectSimple } from '@/components/Campo'
import { CargandoBloque, ErrorBloque } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocentes } from '@/features/catalogos/api'
import { useMiGrupo } from '@/features/grupos/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useMisPostulaciones, usePostular } from '@/features/postulaciones/api'
import {
  esRepresentante,
  integrantesActivos,
  moverElemento,
  ordenarSugeridos,
  verificarPostulacion,
} from '@/features/postulaciones/reglas'
import { useSeguimiento } from '@/features/seguimiento/api'
import { useTema } from '@/features/temas/api'
import { cn, nombreCompleto } from '@/lib/utils'
import type { Modalidad } from '@/types/dominio'

const PASOS = ['Modalidad', 'Verificación', 'Tutores propuestos', 'Confirmación']

/** Asistente de postulación: RF-04, RF-08, RF-09, RF-10, RF-11. */
export default function Postular() {
  const { id } = useParams()
  const navigate = useNavigate()
  const usuario = useUsuario()
  const { periodo, periodoId } = usePeriodo()
  const tema = useTema(id)
  const grupo = useMiGrupo(periodoId)
  const seguimiento = useSeguimiento(periodoId)
  const mias = useMisPostulaciones(periodoId)
  const docentes = useDocentes({ habilitadoTutoria: true })
  const postular = usePostular()

  const [paso, setPaso] = useState(0)
  const [modalidad, setModalidad] = useState<Modalidad | null>(null)
  const [tutores, setTutores] = useState<string[]>([])
  const [agregar, setAgregar] = useState('')

  const t = tema.data
  const g = grupo.data ?? null
  const estudianteId = usuario.estudianteId ?? ''
  const admiteIndividual = !!t && t.minIntegrantes <= 1
  const puedeGrupal = esRepresentante(g, estudianteId)

  useEffect(() => {
    if (t && modalidad === null) {
      if (puedeGrupal && t.maxIntegrantes >= 2) setModalidad('GRUPAL')
      else if (admiteIndividual) setModalidad('INDIVIDUAL')
    }
  }, [t, modalidad, puedeGrupal, admiteIndividual])

  // RF-11: el docente proponente se sugiere primero
  useEffect(() => {
    if (t && docentes.data && tutores.length === 0) {
      const sugerido = docentes.data.find((d) => d.id === t.docenteProponente.id)
      if (sugerido) setTutores([sugerido.id])
    }
  }, [t, docentes.data, tutores.length])

  const postulacionActiva =
    mias.data?.find((p) => ['PENDIENTE', 'EN_CONFLICTO', 'ACEPTADA'].includes(p.estado)) ?? null
  const verificaciones = useMemo(
    () =>
      t && modalidad
        ? verificarPostulacion({
            tema: t,
            modalidad,
            periodo,
            habilitacion: seguimiento.data?.habilitacion ?? null,
            grupo: g,
            estudianteId,
            postulacionActiva,
          })
        : [],
    [t, modalidad, periodo, seguimiento.data, g, estudianteId, postulacionActiva],
  )
  const todoOk = verificaciones.every((v) => v.ok)

  if (
    tema.isPending ||
    grupo.isPending ||
    seguimiento.isPending ||
    mias.isPending ||
    docentes.isPending
  )
    return <CargandoBloque filas={6} />
  if (tema.isError) return <ErrorBloque error={tema.error} />
  if (!t) return null

  const docentesPorId = new Map((docentes.data ?? []).map((d) => [d.id, d]))
  const disponibles = ordenarSugeridos(
    (docentes.data ?? []).filter((d) => !tutores.includes(d.id)),
    t.docenteProponente.id,
  )
  const integrantes = modalidad === 'GRUPAL' ? integrantesActivos(g) : []

  const enviar = () => {
    if (!modalidad) return
    postular.mutate(
      { temaId: t.id, modalidad, tutores },
      { onSuccess: () => navigate('/estudiante/postulaciones') },
    )
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link to={`/estudiante/temas/${t.id}`}>
          <ArrowLeftIcon /> Volver al tema
        </Link>
      </Button>
      <PageHeader titulo="Postular a tema" descripcion={t.titulo} />

      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Pasos de la postulación">
        {PASOS.map((nombre, i) => (
          <li
            key={nombre}
            aria-current={i === paso ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
              i === paso && 'border-primary bg-primary text-primary-foreground',
              i < paso &&
                'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
            )}
          >
            <span className="font-semibold">{i + 1}</span> {nombre}
          </li>
        ))}
      </ol>

      <Card>
        {paso === 0 && (
          <>
            <CardHeader>
              <CardTitle>¿Cómo vas a postular?</CardTitle>
              <CardDescription>
                Una postulación es individual o grupal, nunca ambas (RN-04). Este tema admite entre{' '}
                {t.minIntegrantes} y {t.maxIntegrantes} integrante(s).
              </CardDescription>
            </CardHeader>
            <CardContent
              className="grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Modalidad"
            >
              {[
                {
                  valor: 'INDIVIDUAL' as const,
                  icono: UserIcon,
                  titulo: 'Individual',
                  habilitado: admiteIndividual,
                  nota: admiteIndividual ? 'Postulas solo tú.' : 'El tema no admite 1 integrante.',
                },
                {
                  valor: 'GRUPAL' as const,
                  icono: UsersIcon,
                  titulo: 'Grupal',
                  habilitado: puedeGrupal,
                  nota: puedeGrupal
                    ? `Con tu grupo "${g?.nombre}" (${integrantesActivos(g).length} integrantes).`
                    : g
                      ? 'Solo el representante del grupo puede postular.'
                      : 'Necesitas conformar un grupo y ser su representante.',
                },
              ].map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  role="radio"
                  aria-checked={modalidad === o.valor}
                  disabled={!o.habilitado}
                  onClick={() => setModalidad(o.valor)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                    modalidad === o.valor && 'border-primary ring-1 ring-primary',
                  )}
                >
                  <o.icono className="mt-0.5 size-5 text-primary" aria-hidden />
                  <span>
                    <span className="block font-medium">{o.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{o.nota}</span>
                  </span>
                </button>
              ))}
              {!admiteIndividual && !puedeGrupal && (
                <Alert variant="warning" className="sm:col-span-2">
                  <AlertDescription>
                    No cumples las condiciones para postular a este tema.{' '}
                    <Link to="/estudiante/grupo" className="font-medium underline">
                      Conforma un grupo
                    </Link>{' '}
                    o elige un tema que admita postulación individual.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </>
        )}

        {paso === 1 && (
          <>
            <CardHeader>
              <CardTitle>Verificación de requisitos</CardTitle>
              <CardDescription>
                El sistema rechaza postulaciones que no cumplan estas reglas (RF-09).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {verificaciones.map((v) => (
                  <li key={v.id} className="flex items-start gap-2 text-sm">
                    {v.ok ? (
                      <CheckCircle2Icon
                        className="size-5 shrink-0 text-emerald-600"
                        aria-label="Cumple"
                      />
                    ) : (
                      <XCircleIcon
                        className="size-5 shrink-0 text-destructive"
                        aria-label="No cumple"
                      />
                    )}
                    <span>
                      {v.mensaje}{' '}
                      {v.regla && (
                        <span className="text-xs text-muted-foreground">({v.regla})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {modalidad === 'GRUPAL' && (
                <div>
                  <p className="mb-1 text-sm font-medium">Integrantes que postulan</p>
                  <ul className="flex flex-wrap gap-2">
                    {integrantes.map((i) => (
                      <li key={i.id}>
                        <Badge tono={i.rolEnGrupo === 'REPRESENTANTE' ? 'info' : 'neutral'}>
                          {nombreCompleto(i.estudiante)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tras postular, la composición del grupo queda cerrada (RF-03).
                  </p>
                </div>
              )}
            </CardContent>
          </>
        )}

        {paso === 2 && (
          <>
            <CardHeader>
              <CardTitle>Tutores propuestos</CardTitle>
              <CardDescription>
                Indica uno o varios docentes en orden de prioridad. Es una preferencia: la
                asignación definitiva la realiza el responsable de titulación (RN-10).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-2" aria-label="Tutores en orden de prioridad">
                {tutores.map((dId, i) => {
                  const d = docentesPorId.get(dId)
                  return (
                    <li key={dId} className="flex items-center gap-3 rounded-lg border p-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{nombreCompleto(d)}</span>
                        {dId === t.docenteProponente.id && (
                          <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                            <StarIcon className="size-3" aria-hidden /> Docente proponente del tema
                            (sugerido)
                          </span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={i === 0}
                        onClick={() => setTutores(moverElemento(tutores, i, i - 1))}
                        aria-label={`Subir prioridad de ${nombreCompleto(d)}`}
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={i === tutores.length - 1}
                        onClick={() => setTutores(moverElemento(tutores, i, i + 1))}
                        aria-label={`Bajar prioridad de ${nombreCompleto(d)}`}
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTutores(tutores.filter((x) => x !== dId))}
                        aria-label={`Quitar a ${nombreCompleto(d)}`}
                      >
                        <XIcon />
                      </Button>
                    </li>
                  )
                })}
              </ol>
              {tutores.length === 0 && (
                <p className="text-sm text-destructive">Debes proponer al menos un docente.</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <SelectSimple
                  aria-label="Docente a agregar"
                  className="sm:w-80"
                  value={agregar}
                  onChange={setAgregar}
                  placeholder="Seleccione un docente habilitado…"
                  opciones={disponibles.map((d) => ({
                    value: d.id,
                    label: `${nombreCompleto(d)}${d.id === t.docenteProponente.id ? ' (proponente)' : ''}`,
                  }))}
                />
                <Button
                  variant="outline"
                  disabled={!agregar}
                  onClick={() => {
                    setTutores([...tutores, agregar])
                    setAgregar('')
                  }}
                >
                  <PlusIcon /> Agregar
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {paso === 3 && (
          <>
            <CardHeader>
              <CardTitle>Confirmar postulación</CardTitle>
              <CardDescription>Revisa los datos antes de enviar.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Tema</dt>
                  <dd className="font-medium">{t.titulo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Modalidad</dt>
                  <dd className="font-medium">
                    {modalidad === 'GRUPAL'
                      ? `Grupal · ${g?.nombre} (${integrantes.length} integrantes)`
                      : 'Individual'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Tutores propuestos (en orden)</dt>
                  <dd className="font-medium">
                    {tutores
                      .map((d, i) => `${i + 1}. ${nombreCompleto(docentesPorId.get(d))}`)
                      .join(' · ')}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </>
        )}

        <div className="flex justify-between gap-2 border-t p-4">
          <Button variant="outline" onClick={() => setPaso(paso - 1)} disabled={paso === 0}>
            Anterior
          </Button>
          {paso < PASOS.length - 1 ? (
            <Button
              onClick={() => setPaso(paso + 1)}
              disabled={
                (paso === 0 && !modalidad) ||
                (paso === 1 && !todoOk) ||
                (paso === 2 && tutores.length === 0)
              }
            >
              Siguiente
            </Button>
          ) : (
            <Button onClick={enviar} disabled={postular.isPending}>
              {postular.isPending ? 'Enviando…' : 'Confirmar postulación'}
            </Button>
          )}
        </div>
      </Card>
    </>
  )
}
