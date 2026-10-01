import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMisTutorias } from '@/features/asignaciones/api'
import { useDocumentosPat } from '@/features/pat/api'
import { HistorialVersionesPat } from '@/features/pat/HistorialVersiones'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { formatFecha } from '@/lib/fechas'
import { ESTADO_PAT, MODALIDAD } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { AsignacionTema } from '@/types/dominio'

function VersionesPat({
  asignacion,
  onClose,
}: {
  asignacion: AsignacionTema
  onClose: () => void
}) {
  const docs = useDocumentosPat(asignacion.id)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>PAT · {asignacion.tema.titulo}</DialogTitle>
        </DialogHeader>
        <ConsultaEstado query={docs}>
          {(d) => <HistorialVersionesPat documentos={d} />}
        </ConsultaEstado>
      </DialogContent>
    </Dialog>
  )
}

/** RF-38: estudiantes o grupos asignados al docente como tutor. */
export default function MisTutorias() {
  const { periodoId } = usePeriodo()
  const query = useMisTutorias(periodoId)
  const [viendo, setViendo] = useState<AsignacionTema | null>(null)

  const columnas: ColumnDef<AsignacionTema>[] = [
    {
      header: 'Tema',
      accessorFn: (a) => a.tema.titulo,
      cell: ({ row }) => <span className="font-medium">{row.original.tema.titulo}</span>,
    },
    {
      header: 'Estudiante(s)',
      accessorFn: (a) => a.integrantes.map(nombreCompleto).join(', '),
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
      header: 'Tutor desde',
      accessorFn: (a) => a.tutorVigente?.fechaAsignacion,
      cell: ({ row }) => formatFecha(row.original.tutorVigente?.fechaAsignacion),
    },
    {
      header: 'PAT',
      accessorKey: 'estadoPat',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_PAT} valor={row.original.estadoPat} />,
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setViendo(row.original)}>
          Ver PAT
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Mis tutorías"
        descripcion="Trabajos de titulación que diriges como tutor(a) en el período."
      />
      <ConsultaEstado query={query}>
        {(lista) => (
          <DataTable
            columnas={columnas}
            datos={lista}
            etiqueta="Tutorías asignadas"
            placeholderBusqueda="Buscar por tema o estudiante…"
          />
        )}
      </ConsultaEstado>
      {viendo && <VersionesPat asignacion={viendo} onClose={() => setViendo(null)} />}
    </>
  )
}
