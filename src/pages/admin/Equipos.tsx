import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpIcon, CrownIcon, UsersIcon, XIcon } from 'lucide-react'
import { Campo, SelectSimple, normalizarBusqueda } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCargaTutorial, useDocentes, useHabilitados } from '@/features/catalogos/api'
import { useCrearEquipo, useEquipos, type EquipoResumen } from '@/features/equipos/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useTemas } from '@/features/temas/api'
import { formatFecha } from '@/lib/fechas'
import { ESTADO_ASIGNACION_TEMA, ESTADO_PERIODO, MODALIDAD } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { EstudianteHabilitado } from '@/types/dominio'

/** Estados del período en que el backend admite conformar equipos (POSTULACION_CERRADA o EN_CURSO). */
const ESTADOS_OPERABLES = ['POSTULACION_CERRADA', 'EN_CURSO']
const MAX_CANDIDATOS = 10

const mover = <T,>(lista: T[], desde: number, hasta: number) => {
  const copia = [...lista]
  const [item] = copia.splice(desde, 1)
  copia.splice(hasta, 0, item!)
  return copia
}

/** Conformación de un equipo: estudiantes → tema → candidatos a tutor en orden de prioridad. */
function ConformarEquipo({ periodoId }: { periodoId: string }) {
  const navigate = useNavigate()
  const habilitados = useHabilitados(periodoId)
  const temas = useTemas({ periodoId, estado: 'PUBLICADO', disponible: true })
  const docentes = useDocentes({ habilitadoTutoria: true })
  const carga = useCargaTutorial(periodoId)
  const crear = useCrearEquipo()
  const [busqueda, setBusqueda] = useState('')
  const [estudiantes, setEstudiantes] = useState<string[]>([])
  const [temaId, setTemaId] = useState('')
  const [candidatos, setCandidatos] = useState<string[]>([])
  const [nombreGrupo, setNombreGrupo] = useState('')
  const [motivo, setMotivo] = useState('')

  // Solo habilitaciones que permiten asignación: HABILITADO y situación PENDIENTE o ADMITIDO.
  const elegibles = useMemo(
    () =>
      (habilitados.data ?? []).filter(
        (h) => h.estado === 'HABILITADO' && h.situacionIngreso !== 'NO_ADMITIDO',
      ),
    [habilitados.data],
  )
  const porId = new Map<string, EstudianteHabilitado>(elegibles.map((h) => [h.estudiante.id, h]))
  const seleccionados = estudiantes.map((id) => porId.get(id)).filter((h) => !!h)
  const carrera = seleccionados[0]?.estudiante.carrera
  const visibles = elegibles.filter(
    (h) =>
      !estudiantes.includes(h.estudiante.id) &&
      (!carrera || h.estudiante.carrera.id === carrera.id) &&
      normalizarBusqueda(
        `${h.estudiante.apellidos} ${h.estudiante.nombres} ${h.estudiante.cedula} ${h.estudiante.matricula ?? ''}`,
      ).includes(normalizarBusqueda(busqueda)),
  )

  const temasCarrera = (temas.data ?? []).filter((t) => !carrera || t.carrera.id === carrera.id)
  const tema = temasCarrera.find((t) => t.id === temaId)
  const cantidad = seleccionados.length
  const rangoTema = tema
    ? tema.minIntegrantes === (tema.maxIntegrantes ?? tema.minIntegrantes)
      ? `${tema.minIntegrantes}`
      : `entre ${tema.minIntegrantes} y ${tema.maxIntegrantes ?? '…'}`
    : ''
  const composicionValida =
    !!tema && cantidad >= tema.minIntegrantes && cantidad <= (tema.maxIntegrantes ?? Infinity)

  const cargaPorDocente = new Map((carga.data ?? []).map((c) => [c.docente.id, c]))
  const docentePorId = new Map((docentes.data ?? []).map((d) => [d.id, d]))
  const docentesDisponibles = (docentes.data ?? []).filter(
    (d) => d.estado === 'ACTIVO' && !candidatos.includes(d.id),
  )

  const listo =
    cantidad > 0 &&
    composicionValida &&
    candidatos.length > 0 &&
    !!motivo.trim() &&
    !crear.isPending

  const conformar = () =>
    crear.mutate(
      {
        periodoId,
        estudianteIds: estudiantes,
        temaId,
        docenteIds: candidatos,
        nombreGrupo: cantidad > 1 ? nombreGrupo : undefined,
        motivo,
      },
      { onSuccess: (r) => navigate(`/admin/equipos/${r.equipo.id}`) },
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conformar equipo</CardTitle>
        <CardDescription>
          Un estudiante forma un trabajo individual; dos o más, un grupo cuyo representante es el
          primero de la lista. Con un solo candidato a tutor, queda asignado de inmediato; con
          varios, se confirma después entre ellos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3" aria-labelledby="paso-estudiantes">
          <h2 id="paso-estudiantes" className="text-sm font-semibold">
            1. Estudiantes habilitados
          </h2>
          {seleccionados.length > 0 && (
            <ol className="space-y-1" aria-label="Estudiantes seleccionados">
              {seleccionados.map((h, i) => (
                <li
                  key={h.estudiante.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{nombreCompleto(h.estudiante)}</span>
                  {i === 0 && cantidad > 1 && (
                    <Badge tono="info">
                      <CrownIcon className="size-3" /> Representante
                    </Badge>
                  )}
                  {h.situacionIngreso === 'PENDIENTE' && <Badge tono="warning">Condicionado</Badge>}
                  <span className="ml-auto flex gap-1">
                    {i > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEstudiantes((l) => mover(l, i, 0))}
                      >
                        Hacer representante
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Quitar a ${nombreCompleto(h.estudiante)}`}
                      onClick={() =>
                        setEstudiantes((l) => l.filter((id) => id !== h.estudiante.id))
                      }
                    >
                      <XIcon />
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Campo
            etiqueta="Buscar estudiante"
            ayuda={
              carrera
                ? `Se muestran solo estudiantes de ${carrera.nombre}, la carrera del equipo.`
                : 'Por nombre, cédula o matrícula.'
            }
          >
            {(p) => (
              <Input
                {...p}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar…"
              />
            )}
          </Campo>
          <ConsultaEstado query={habilitados}>
            {() =>
              visibles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay estudiantes para mostrar.</p>
              ) : (
                <ul
                  className="max-h-56 divide-y overflow-y-auto rounded-md border"
                  aria-label="Estudiantes disponibles"
                >
                  {visibles.slice(0, 50).map((h) => (
                    <li
                      key={h.estudiante.id}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm"
                    >
                      <span>
                        {nombreCompleto(h.estudiante)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {h.estudiante.matricula ?? h.estudiante.cedula}
                        </span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => setEstudiantes((l) => [...l, h.estudiante.id])}
                      >
                        Agregar
                      </Button>
                    </li>
                  ))}
                </ul>
              )
            }
          </ConsultaEstado>
        </section>

        <section className="space-y-3" aria-labelledby="paso-tema">
          <h2 id="paso-tema" className="text-sm font-semibold">
            2. Tema disponible
          </h2>
          <Campo
            etiqueta="Tema"
            requerido
            error={
              tema && cantidad > 0 && !composicionValida
                ? `El tema ${tema.tipo} admite ${rangoTema} integrante(s); seleccionó ${cantidad}.`
                : undefined
            }
            ayuda={tema ? `Tipo ${tema.tipo}: ${rangoTema} integrante(s).` : undefined}
          >
            {(p) => (
              <SelectSimple
                {...p}
                value={temaId}
                onChange={setTemaId}
                placeholder={temas.isPending ? 'Cargando temas…' : 'Seleccione un tema publicado'}
                opciones={temasCarrera.map((t) => ({
                  value: t.id,
                  label: `${t.titulo} (${t.tipo})`,
                }))}
              />
            )}
          </Campo>
        </section>

        <section className="space-y-3" aria-labelledby="paso-tutores">
          <h2 id="paso-tutores" className="text-sm font-semibold">
            3. Candidatos a tutor (en orden de prioridad)
          </h2>
          {candidatos.length > 0 && (
            <ol className="space-y-1" aria-label="Candidatos a tutor">
              {candidatos.map((id, i) => {
                const d = docentePorId.get(id)
                const c = cargaPorDocente.get(id)
                return (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                  >
                    <span className="w-5 text-muted-foreground">{i + 1}.</span>
                    <span className="font-medium">{nombreCompleto(d)}</span>
                    {c && (
                      <span className="text-xs text-muted-foreground">
                        Carga {c.actual}
                        {c.limite !== null ? ` de ${c.limite}` : ' (sin límite configurado)'}
                      </span>
                    )}
                    <span className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={i === 0}
                        aria-label={`Subir prioridad de ${nombreCompleto(d)}`}
                        onClick={() => setCandidatos((l) => mover(l, i, i - 1))}
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={i === candidatos.length - 1}
                        aria-label={`Bajar prioridad de ${nombreCompleto(d)}`}
                        onClick={() => setCandidatos((l) => mover(l, i, i + 1))}
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Quitar a ${nombreCompleto(d)}`}
                        onClick={() => setCandidatos((l) => l.filter((x) => x !== id))}
                      >
                        <XIcon />
                      </Button>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          <Campo
            etiqueta="Agregar candidato"
            ayuda={`Docentes activos y habilitados para tutoría (máximo ${MAX_CANDIDATOS}).`}
          >
            {(p) => (
              <SelectSimple
                {...p}
                value=""
                disabled={candidatos.length >= MAX_CANDIDATOS}
                onChange={(id) => id && setCandidatos((l) => [...l, id])}
                placeholder="Seleccione un docente"
                opciones={docentesDisponibles.map((d) => ({
                  value: d.id,
                  label: nombreCompleto(d),
                }))}
              />
            )}
          </Campo>
        </section>

        <section className="space-y-3" aria-labelledby="paso-registro">
          <h2 id="paso-registro" className="text-sm font-semibold">
            4. Registro
          </h2>
          {cantidad > 1 && (
            <Campo etiqueta="Nombre del grupo" ayuda="Si lo deja vacío se usa el título del tema.">
              {(p) => (
                <Input
                  {...p}
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                  maxLength={120}
                />
              )}
            </Campo>
          )}
          <Campo etiqueta="Motivo" requerido ayuda="Queda en la auditoría de la asignación.">
            {(p) => (
              <Textarea
                {...p}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={1000}
              />
            )}
          </Campo>
          <div className="flex justify-end">
            <Button disabled={!listo} onClick={conformar}>
              <UsersIcon /> Conformar equipo
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

/** Equipos conformados por la administración: grupos o trabajos individuales sin postulación. */
export default function Equipos() {
  const { periodo, periodoId } = usePeriodo()
  const equipos = useEquipos(periodoId)

  const columnas: ColumnDef<EquipoResumen>[] = [
    {
      header: 'Tema',
      accessorFn: (e) => e.tema.titulo,
      cell: ({ row }) => (
        <Link to={`/admin/equipos/${row.original.id}`} className="font-medium hover:underline">
          {row.original.tema.titulo}
        </Link>
      ),
    },
    {
      header: 'Integrantes',
      accessorFn: (e) => `${e.grupo?.nombre ?? ''} ${e.integrantes.map(nombreCompleto).join(', ')}`,
      cell: ({ row }) => (
        <span>
          {row.original.grupo && (
            <span className="block text-xs text-muted-foreground">{row.original.grupo.nombre}</span>
          )}
          {row.original.integrantes.map(nombreCompleto).join(', ')}
        </span>
      ),
    },
    {
      header: 'Modalidad',
      accessorKey: 'modalidad',
      cell: ({ row }) => <StatusBadge mapa={MODALIDAD} valor={row.original.modalidad} />,
    },
    {
      header: 'Tutor',
      accessorFn: (e) => nombreCompleto(e.tutorVigente),
      cell: ({ row }) =>
        row.original.tutorVigente ? (
          nombreCompleto(row.original.tutorVigente)
        ) : row.original.estado === 'VIGENTE' ? (
          <Badge tono="warning">Por confirmar ({row.original.totalCandidatos} candidatos)</Badge>
        ) : (
          '—'
        ),
    },
    {
      header: 'Fecha',
      accessorKey: 'fechaAsignacion',
      cell: ({ row }) => formatFecha(row.original.fechaAsignacion),
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_ASIGNACION_TEMA} valor={row.original.estado} />,
    },
  ]

  if (!periodoId || !periodo) return <Vacio titulo="Seleccione un período" />
  const operable = ESTADOS_OPERABLES.includes(periodo.estado)
  return (
    <>
      <PageHeader
        titulo="Equipos"
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            Conformación administrativa de equipos con tema y tutor, sin postulación. Período{' '}
            {periodo.nombre}
            <StatusBadge mapa={ESTADO_PERIODO} valor={periodo.estado} />
          </span>
        }
      />
      <div className="space-y-6">
        {operable ? (
          <ConformarEquipo key={periodoId} periodoId={periodoId} />
        ) : (
          <Alert>
            <AlertTitle>El período no admite conformar equipos</AlertTitle>
            <AlertDescription>
              Los equipos se conforman con la postulación cerrada o durante la titulación. Cambie el
              estado del período o seleccione otro.
            </AlertDescription>
          </Alert>
        )}
        <ConsultaEstado query={equipos}>
          {(l) =>
            l.length === 0 ? (
              <Vacio titulo="Aún no hay equipos conformados por la administración" />
            ) : (
              <DataTable
                columnas={columnas}
                datos={l}
                etiqueta="Equipos conformados"
                placeholderBusqueda="Buscar por tema o integrante…"
              />
            )
          }
        </ConsultaEstado>
      </div>
    </>
  )
}
