import { useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { SelectSimple } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAsignaciones } from '@/features/asignaciones/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { usePostulaciones } from '@/features/postulaciones/api'
import { TablaPostulaciones } from '@/features/postulaciones/TablaPostulaciones'
import { formatFecha } from '@/lib/fechas'
import { ESTADO_ASIGNACION_TEMA, ESTADO_PAT, MODALIDAD, opciones } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { AsignacionTema, EstadoAsignacionTema } from '@/types/dominio'

/** RF-24, RF-25, RF-27 */
export default function Asignaciones() {
  const { periodoId } = usePeriodo()
  const [estado, setEstado] = useState<EstadoAsignacionTema | ''>('VIGENTE')
  const query = useAsignaciones(periodoId, estado)
  const aceptadas = usePostulaciones({ periodoId, estado: 'ACEPTADA' })
  const porAsignar = (aceptadas.data ?? []).filter((p) => !p.asignacionVigenteId)

  const columnas: ColumnDef<AsignacionTema>[] = [
    {
      header: 'Tema',
      accessorFn: (a) => a.tema.titulo,
      cell: ({ row }) => (
        <Link to={`/admin/asignaciones/${row.original.id}`} className="font-medium hover:underline">
          {row.original.tema.titulo}
        </Link>
      ),
    },
    {
      header: 'Asignado a',
      accessorFn: (a) => `${a.grupo?.nombre ?? ''} ${a.integrantes.map(nombreCompleto).join(', ')}`,
      cell: ({ row }) => (
        <span>
          {row.original.grupo && (
            <span className="block text-xs text-muted-foreground">{row.original.grupo.nombre}</span>
          )}
          {(row.original.integrantes.length
            ? row.original.integrantes
            : row.original.estudiante
              ? [row.original.estudiante]
              : []
          )
            .map(nombreCompleto)
            .join(', ')}
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
      accessorKey: 'fechaAsignacion',
      cell: ({ row }) => formatFecha(row.original.fechaAsignacion),
    },
    {
      header: 'Tutor',
      accessorFn: (a) => nombreCompleto(a.tutorVigente?.docente),
      cell: ({ row }) =>
        row.original.tutorVigente ? (
          nombreCompleto(row.original.tutorVigente.docente)
        ) : row.original.estado === 'VIGENTE' ? (
          <Badge tono="warning">Sin tutor</Badge>
        ) : (
          '—'
        ),
    },
    {
      header: 'PAT',
      accessorKey: 'estadoPat',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_PAT} valor={row.original.estadoPat} />,
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_ASIGNACION_TEMA} valor={row.original.estado} />,
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/asignaciones/${row.original.id}`}>
            {row.original.tutorVigente || row.original.estado !== 'VIGENTE'
              ? 'Gestionar'
              : 'Asignar tutor'}
          </Link>
        </Button>
      ),
    },
  ]

  if (!periodoId) return <Vacio titulo="Seleccione un período" />
  return (
    <>
      <PageHeader
        titulo="Asignaciones y tutores"
        descripcion="Un tema solo puede tener una asignación vigente y un estudiante o grupo solo una (RN-07, RN-08)."
      />
      <Tabs defaultValue="asignaciones">
        <TabsList>
          <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
          <TabsTrigger value="por-asignar">
            Postulaciones aceptadas por asignar {porAsignar.length ? `(${porAsignar.length})` : ''}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="asignaciones">
          <ConsultaEstado query={query}>
            {(l) => (
              <DataTable
                columnas={columnas}
                datos={l}
                etiqueta="Asignaciones de tema"
                filtros={
                  <SelectSimple
                    aria-label="Filtrar por estado"
                    className="sm:w-40"
                    value={estado}
                    onChange={(v) => setEstado(v as EstadoAsignacionTema | '')}
                    todos="Todas"
                    opciones={opciones(ESTADO_ASIGNACION_TEMA)}
                  />
                }
              />
            )}
          </ConsultaEstado>
        </TabsContent>
        <TabsContent value="por-asignar">
          <ConsultaEstado query={aceptadas}>
            {() =>
              porAsignar.length ? (
                <TablaPostulaciones datos={porAsignar} />
              ) : (
                <Vacio titulo="No hay postulaciones aceptadas pendientes de asignación" />
              )
            }
          </ConsultaEstado>
        </TabsContent>
      </Tabs>
    </>
  )
}
