import { useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckIcon, EyeIcon, ListChecksIcon, StarIcon, XIcon } from 'lucide-react'
import { Campo } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAsignarTema } from '@/features/asignaciones/api'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_POSTULACION, MODALIDAD } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { Postulacion } from '@/types/dominio'
import { useAceptarPostulacion, useRechazarPostulacion } from './api'

/** RF-26: tutores propuestos con su prioridad e indicando si es el proponente. */
export function TutoresPropuestos({ postulacion }: { postulacion: Postulacion }) {
  return (
    <Table aria-label="Tutores propuestos">
      <TableHeader>
        <TableRow>
          <TableHead>Prioridad</TableHead>
          <TableHead>Docente</TableHead>
          <TableHead>Proponente del tema</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {postulacion.tutoresPropuestos.map((t) => (
          <TableRow key={t.id}>
            <TableCell>{t.ordenPrioridad}</TableCell>
            <TableCell>{nombreCompleto(t.docente)}</TableCell>
            <TableCell>
              {t.esProponenteTema ? (
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <StarIcon className="size-3.5" aria-hidden /> Sí
                </span>
              ) : (
                'No'
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DetallePostulacion({ p, onClose }: { p: Postulacion; onClose: () => void }) {
  const aceptar = useAceptarPostulacion()
  const rechazar = useRechazarPostulacion()
  const asignar = useAsignarTema()
  const [rechazando, setRechazando] = useState(false)
  const [obs, setObs] = useState('')

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{p.tema.titulo}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <StatusBadge mapa={ESTADO_POSTULACION} valor={p.estado} />
            <StatusBadge mapa={MODALIDAD} valor={p.modalidad} />
            {formatFechaHora(p.fechaPostulacion)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">
              {p.grupo ? `Grupo ${p.grupo.nombre}` : 'Postulante'} ({p.numIntegrantes})
            </p>
            <ul className="text-muted-foreground">
              {p.integrantes.map((e) => (
                <li key={e.id}>
                  {nombreCompleto(e)} · {e.matricula}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">
              Rango del tema: {p.tema.minIntegrantes}–{p.tema.maxIntegrantes}
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium">Tutores propuestos</p>
            <TutoresPropuestos postulacion={p} />
          </div>
          {p.observacion && <p className="text-muted-foreground">Observación: {p.observacion}</p>}
          {p.estado === 'EN_CONFLICTO' && (
            <Alert variant="warning">
              <AlertDescription>
                Esta postulación compite con otras por el mismo tema.{' '}
                <Link to="/admin/conflictos" className="font-medium underline">
                  Resolver conflicto
                </Link>
              </AlertDescription>
            </Alert>
          )}
          {rechazando && (
            <Campo etiqueta="Motivo del rechazo" requerido>
              {(pp) => <Textarea {...pp} value={obs} onChange={(e) => setObs(e.target.value)} />}
            </Campo>
          )}
        </div>
        <DialogFooter>
          {p.estado === 'PENDIENTE' && !rechazando && (
            <Button
              onClick={() => aceptar.mutate(p.id, { onSuccess: onClose })}
              disabled={aceptar.isPending}
            >
              <CheckIcon /> Aceptar
            </Button>
          )}
          {p.estado === 'ACEPTADA' && !p.asignacionVigenteId && !rechazando && (
            <Button
              onClick={() => asignar.mutate({ postulacionId: p.id }, { onSuccess: onClose })}
              disabled={asignar.isPending}
            >
              <ListChecksIcon /> Asignar tema
            </Button>
          )}
          {p.asignacionVigenteId && (
            <Button asChild variant="outline">
              <Link to={`/admin/asignaciones/${p.asignacionVigenteId}`}>Ver asignación</Link>
            </Button>
          )}
          {['PENDIENTE', 'EN_CONFLICTO', 'ACEPTADA'].includes(p.estado) &&
            !p.asignacionVigenteId &&
            (rechazando ? (
              <Button
                variant="destructive"
                disabled={!obs.trim() || rechazar.isPending}
                onClick={() =>
                  rechazar.mutate({ id: p.id, observacion: obs }, { onSuccess: onClose })
                }
              >
                Confirmar rechazo
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setRechazando(true)}>
                <XIcon /> Rechazar
              </Button>
            ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** RF-22: tabla de postulaciones con acciones del responsable. */
export function TablaPostulaciones({
  datos,
  ocultarTema,
  filtros,
}: {
  datos: Postulacion[]
  ocultarTema?: boolean
  filtros?: React.ReactNode
}) {
  const [viendo, setViendo] = useState<Postulacion | null>(null)
  const columnas: ColumnDef<Postulacion>[] = [
    ...(ocultarTema
      ? []
      : [
          {
            header: 'Tema',
            accessorFn: (p: Postulacion) => p.tema.titulo,
            cell: ({ row }: { row: { original: Postulacion } }) => (
              <Link
                to={`/admin/temas/${row.original.tema.id}`}
                className="font-medium hover:underline"
              >
                {row.original.tema.titulo}
              </Link>
            ),
          } satisfies ColumnDef<Postulacion>,
        ]),
    {
      header: 'Postulante(s)',
      accessorFn: (p) => `${p.grupo?.nombre ?? ''} ${p.integrantes.map(nombreCompleto).join(', ')}`,
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
      header: 'Fecha',
      accessorKey: 'fechaPostulacion',
      cell: ({ row }) => formatFechaHora(row.original.fechaPostulacion),
    },
    {
      header: 'Tutor 1ª prioridad',
      accessorFn: (p) => nombreCompleto(p.tutoresPropuestos[0]?.docente),
      cell: ({ row }) => {
        const t = row.original.tutoresPropuestos[0]
        return t ? (
          <span>
            {nombreCompleto(t.docente)}
            {t.esProponenteTema && (
              <StarIcon className="ml-1 inline size-3 text-amber-600" aria-label="Proponente" />
            )}
          </span>
        ) : (
          '—'
        )
      },
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_POSTULACION} valor={row.original.estado} />,
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setViendo(row.original)}>
          <EyeIcon /> Detalle
        </Button>
      ),
    },
  ]
  return (
    <>
      <DataTable
        columnas={columnas}
        datos={datos}
        etiqueta="Postulaciones"
        placeholderBusqueda="Buscar por tema o estudiante…"
        filtros={filtros}
      />
      {viendo && <DetallePostulacion p={viendo} onClose={() => setViendo(null)} />}
    </>
  )
}
