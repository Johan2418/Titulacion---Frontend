import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangleIcon, PencilIcon, PlusIcon, ScaleIcon, UploadIcon } from 'lucide-react'
import { Campo, SelectSimple } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  useActualizarHabilitado,
  useEstudiantes,
  useHabilitados,
  useHabilitar,
  useImportarHabilitados,
  useResolverIngreso,
} from '@/features/catalogos/api'
import { ImportarArchivo } from '@/features/catalogos/ImportarArchivo'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { formatFecha, formatFechaHora } from '@/lib/fechas'
import {
  CONDICION_INGRESO,
  ESTADO_HABILITACION,
  opciones,
  ORIGEN_HABILITACION,
  SITUACION_INGRESO,
} from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { CondicionIngreso, EstudianteHabilitado } from '@/types/dominio'

function HabilitarManual({ onClose }: { onClose: () => void }) {
  const { periodoId } = usePeriodo()
  const [texto, setTexto] = useState('')
  const [estudianteId, setEstudianteId] = useState('')
  const [condicion, setCondicion] = useState<CondicionIngreso>('REGULAR')
  const [requisito, setRequisito] = useState('')
  const estudiantes = useEstudiantes(texto)
  const habilitar = useHabilitar(periodoId)
  const valido = !!estudianteId && (condicion === 'REGULAR' || requisito.trim().length > 0)
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valido)
          habilitar.mutate(
            {
              estudianteId,
              condicionIngreso: condicion,
              requisitoPendiente: condicion === 'CONDICIONADO' ? requisito : undefined,
            },
            { onSuccess: onClose },
          )
      }}
    >
      <Campo etiqueta="Buscar estudiante" ayuda="Por nombre, cédula o matrícula.">
        {(p) => <Input {...p} value={texto} onChange={(e) => setTexto(e.target.value)} />}
      </Campo>
      <Campo etiqueta="Estudiante" requerido>
        {(p) => (
          <SelectSimple
            {...p}
            value={estudianteId}
            onChange={setEstudianteId}
            opciones={(estudiantes.data ?? [])
              .slice(0, 50)
              .map((e) => ({ value: e.id, label: `${nombreCompleto(e)} · ${e.cedula}` }))}
          />
        )}
      </Campo>
      <Campo etiqueta="Condición de ingreso" requerido>
        {(p) => (
          <SelectSimple
            {...p}
            value={condicion}
            onChange={(v) => setCondicion(v as CondicionIngreso)}
            opciones={opciones(CONDICION_INGRESO)}
          />
        )}
      </Campo>
      {condicion === 'CONDICIONADO' && (
        <Campo
          etiqueta="Requisito pendiente"
          requerido
          ayuda="Debe cumplirse antes del inicio de titulación (RN-02)."
        >
          {(p) => <Input {...p} value={requisito} onChange={(e) => setRequisito(e.target.value)} />}
        </Campo>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valido || habilitar.isPending}>
          Habilitar
        </Button>
      </DialogFooter>
    </form>
  )
}

function EditarHabilitado({ h, onClose }: { h: EstudianteHabilitado; onClose: () => void }) {
  const [estado, setEstado] = useState(h.estado)
  const [condicion, setCondicion] = useState(h.condicionIngreso)
  const [requisito, setRequisito] = useState(h.requisitoPendiente ?? '')
  const actualizar = useActualizarHabilitado()
  const bloqueado = h.situacionIngreso === 'NO_ADMITIDO'
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        actualizar.mutate(
          {
            id: h.id,
            estado,
            condicionIngreso: condicion,
            requisitoPendiente: condicion === 'CONDICIONADO' ? requisito : null,
          },
          { onSuccess: onClose },
        )
      }}
    >
      <Campo etiqueta="Estado de habilitación">
        {(p) => (
          <SelectSimple
            {...p}
            value={estado}
            onChange={(v) => setEstado(v as typeof estado)}
            opciones={opciones(ESTADO_HABILITACION)}
          />
        )}
      </Campo>
      <Campo
        etiqueta="Condición de ingreso"
        ayuda={bloqueado ? 'El ingreso ya fue resuelto como no admitido.' : undefined}
      >
        {(p) => (
          <SelectSimple
            {...p}
            disabled={bloqueado}
            value={condicion}
            onChange={(v) => setCondicion(v as CondicionIngreso)}
            opciones={opciones(CONDICION_INGRESO)}
          />
        )}
      </Campo>
      {condicion === 'CONDICIONADO' && !bloqueado && (
        <Campo etiqueta="Requisito pendiente" requerido>
          {(p) => <Input {...p} value={requisito} onChange={(e) => setRequisito(e.target.value)} />}
        </Campo>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={actualizar.isPending || (condicion === 'CONDICIONADO' && !requisito.trim())}
        >
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}

function ResolverIngreso({ h, onClose }: { h: EstudianteHabilitado; onClose: () => void }) {
  const [situacion, setSituacion] = useState<'ADMITIDO' | 'NO_ADMITIDO'>('ADMITIDO')
  const [observacion, setObservacion] = useState('')
  const resolver = useResolverIngreso()
  const requiereObs = situacion === 'NO_ADMITIDO'
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (requiereObs && !observacion.trim()) return
        resolver.mutate(
          { id: h.id, situacionIngreso: situacion, observacion: observacion || undefined },
          { onSuccess: onClose },
        )
      }}
    >
      <div className="rounded-md bg-muted/50 p-3 text-sm">
        <p className="font-medium">{nombreCompleto(h.estudiante)}</p>
        <p className="text-muted-foreground">Requisito pendiente: {h.requisitoPendiente}</p>
      </div>
      <Campo etiqueta="Resolución" requerido>
        {(p) => (
          <SelectSimple
            {...p}
            value={situacion}
            onChange={(v) => setSituacion(v as typeof situacion)}
            opciones={[
              { value: 'ADMITIDO', label: 'Admitido: cumplió el requisito' },
              { value: 'NO_ADMITIDO', label: 'No admitido: no cumplió el requisito' },
            ]}
          />
        )}
      </Campo>
      {situacion === 'NO_ADMITIDO' && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Regla institucional (RN-03)</AlertTitle>
          <AlertDescription>
            Se anulará su participación: si postuló de forma individual se anula su postulación y
            asignación; si pertenece a un grupo, se le retira y, si el grupo deja de cumplir el
            mínimo del tema, se anula la asignación del grupo. El historial se conserva.
          </AlertDescription>
        </Alert>
      )}
      <Campo
        etiqueta="Observación"
        requerido={requiereObs}
        error={requiereObs && !observacion.trim() ? 'Indique el motivo.' : undefined}
      >
        {(p) => (
          <Textarea {...p} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        )}
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={requiereObs ? 'destructive' : 'default'}
          disabled={resolver.isPending || (requiereObs && !observacion.trim())}
        >
          Registrar resolución
        </Button>
      </DialogFooter>
    </form>
  )
}

type Dialogo =
  | { tipo: 'nuevo' }
  | { tipo: 'editar' | 'resolver'; h: EstudianteHabilitado }
  | { tipo: 'importar' }
  | null

/** RF-18 */
export default function Habilitados() {
  const { periodo, periodoId } = usePeriodo()
  const query = useHabilitados(periodoId)
  const importar = useImportarHabilitados(periodoId)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [condicion, setCondicion] = useState('')
  const [situacion, setSituacion] = useState('')

  const columnas: ColumnDef<EstudianteHabilitado>[] = [
    {
      header: 'Estudiante',
      accessorFn: (h) =>
        `${nombreCompleto(h.estudiante)} ${h.estudiante.cedula} ${h.estudiante.matricula}`,
      cell: ({ row }) => (
        <span>
          <span className="block font-medium">{nombreCompleto(row.original.estudiante)}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.estudiante.cedula} · {row.original.estudiante.carrera}
          </span>
        </span>
      ),
    },
    {
      header: 'Origen',
      accessorKey: 'origen',
      cell: ({ row }) => <StatusBadge mapa={ORIGEN_HABILITACION} valor={row.original.origen} />,
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_HABILITACION} valor={row.original.estado} />,
    },
    {
      header: 'Condición',
      accessorKey: 'condicionIngreso',
      cell: ({ row }) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge mapa={CONDICION_INGRESO} valor={row.original.condicionIngreso} />
          {row.original.requisitoPendiente && (
            <span className="max-w-56 text-xs text-muted-foreground">
              {row.original.requisitoPendiente}
            </span>
          )}
        </span>
      ),
    },
    {
      header: 'Situación de ingreso',
      accessorKey: 'situacionIngreso',
      cell: ({ row }) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge mapa={SITUACION_INGRESO} valor={row.original.situacionIngreso} />
          {row.original.fechaResolucionIngreso &&
            row.original.condicionIngreso === 'CONDICIONADO' && (
              <span
                className="text-xs text-muted-foreground"
                title={row.original.observacionIngreso ?? undefined}
              >
                {formatFechaHora(row.original.fechaResolucionIngreso)} ·{' '}
                {nombreCompleto(row.original.resueltoPor)}
              </span>
            )}
        </span>
      ),
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {row.original.condicionIngreso === 'CONDICIONADO' &&
            row.original.situacionIngreso === 'PENDIENTE' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogo({ tipo: 'resolver', h: row.original })}
              >
                <ScaleIcon /> Resolver ingreso
              </Button>
            )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDialogo({ tipo: 'editar', h: row.original })}
            aria-label={`Editar ${nombreCompleto(row.original.estudiante)}`}
          >
            <PencilIcon />
          </Button>
        </div>
      ),
    },
  ]

  if (!periodoId) return <Vacio titulo="Seleccione un período" />
  const cerrar = () => setDialogo(null)

  return (
    <>
      <PageHeader
        titulo="Estudiantes habilitados"
        descripcion={`Habilitación por período (${periodo?.codigo}). Los condicionados deben resolverse antes del ${formatFecha(periodo?.fechaInicioTitulacion)}.`}
        acciones={
          <>
            <Button variant="outline" onClick={() => setDialogo({ tipo: 'importar' })}>
              <UploadIcon /> Importar
            </Button>
            <Button onClick={() => setDialogo({ tipo: 'nuevo' })}>
              <PlusIcon /> Habilitar estudiante
            </Button>
          </>
        }
      />
      <ConsultaEstado query={query}>
        {(lista) => (
          <DataTable
            columnas={columnas}
            datos={lista.filter(
              (h) =>
                (!condicion || h.condicionIngreso === condicion) &&
                (!situacion || h.situacionIngreso === situacion),
            )}
            etiqueta="Estudiantes habilitados"
            placeholderBusqueda="Buscar por nombre, cédula, matrícula…"
            filtros={
              <>
                <SelectSimple
                  aria-label="Filtrar por condición"
                  className="sm:w-48"
                  value={condicion}
                  onChange={setCondicion}
                  todos="Toda condición"
                  opciones={opciones(CONDICION_INGRESO)}
                />
                <SelectSimple
                  aria-label="Filtrar por situación"
                  className="sm:w-48"
                  value={situacion}
                  onChange={setSituacion}
                  todos="Toda situación"
                  opciones={opciones(SITUACION_INGRESO)}
                />
              </>
            }
          />
        )}
      </ConsultaEstado>

      <Dialog open={!!dialogo && dialogo.tipo !== 'importar'} onOpenChange={(o) => !o && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogo?.tipo === 'nuevo'
                ? 'Habilitar estudiante'
                : dialogo?.tipo === 'resolver'
                  ? 'Resolver ingreso'
                  : 'Editar habilitación'}
            </DialogTitle>
            {dialogo?.tipo === 'resolver' && (
              <DialogDescription>
                Registre si el estudiante condicionado cumplió el requisito.
              </DialogDescription>
            )}
          </DialogHeader>
          {dialogo?.tipo === 'nuevo' && <HabilitarManual onClose={cerrar} />}
          {dialogo?.tipo === 'editar' && <EditarHabilitado h={dialogo.h} onClose={cerrar} />}
          {dialogo?.tipo === 'resolver' && <ResolverIngreso h={dialogo.h} onClose={cerrar} />}
        </DialogContent>
      </Dialog>
      <ImportarArchivo
        abierto={dialogo?.tipo === 'importar'}
        onClose={cerrar}
        titulo="Importar estudiantes habilitados"
        tipo="ESTUDIANTES"
        periodoId={periodoId}
        columnas="cedula, nombres, apellidos, email, matricula, carrera, nivel, condicion (REGULAR/CONDICIONADO), requisito"
        importar={(f) => importar.mutateAsync(f)}
      />
    </>
  )
}
