import { useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { SelectSimple } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLineas } from '@/features/catalogos/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { AccionesTema } from '@/features/temas/AccionesTema'
import { useTemas } from '@/features/temas/api'
import { FormTema } from '@/features/temas/FormTema'
import { ESTADO_TEMA, opciones } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { EstadoTema, Tema } from '@/types/dominio'

/** RF-20 / RF-21 */
export default function Temas() {
  const { periodo, periodoId } = usePeriodo()
  const [estado, setEstado] = useState<EstadoTema | ''>('')
  const [lineaId, setLineaId] = useState('')
  const lineas = useLineas()
  const query = useTemas({ periodoId, estado, lineaId })
  const [editando, setEditando] = useState<Tema | null | 'nuevo'>(null)

  const columnas: ColumnDef<Tema>[] = [
    {
      header: 'Tema',
      accessorKey: 'titulo',
      cell: ({ row }) => (
        <Link to={`/admin/temas/${row.original.id}`} className="font-medium hover:underline">
          {row.original.titulo}
        </Link>
      ),
    },
    { header: 'Línea', accessorFn: (t) => t.linea.nombre },
    { header: 'Proponente', accessorFn: (t) => nombreCompleto(t.docenteProponente) },
    {
      header: 'Integrantes',
      accessorFn: (t) => `${t.minIntegrantes}–${t.maxIntegrantes}`,
      enableSorting: false,
    },
    { header: 'Postul. abiertas', accessorKey: 'postulacionesAbiertas' },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_TEMA} valor={row.original.estado} />,
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <AccionesTema tema={row.original} />
          {row.original.estado !== 'ASIGNADO' && row.original.estado !== 'RETIRADO' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditando(row.original)}
              aria-label={`Editar ${row.original.titulo}`}
            >
              <PencilIcon />
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (!periodoId) return <Vacio titulo="Seleccione un período" />
  return (
    <>
      <PageHeader
        titulo="Temas"
        descripcion="Registro, publicación, cierre y retiro de temas del período."
        acciones={
          <Button onClick={() => setEditando('nuevo')}>
            <PlusIcon /> Registrar tema
          </Button>
        }
      />
      <ConsultaEstado query={query}>
        {(l) => (
          <DataTable
            columnas={columnas}
            datos={l}
            etiqueta="Temas"
            placeholderBusqueda="Buscar por título o docente…"
            filtros={
              <>
                <SelectSimple
                  aria-label="Filtrar por estado"
                  className="sm:w-44"
                  value={estado}
                  onChange={(v) => setEstado(v as EstadoTema | '')}
                  todos="Todos los estados"
                  opciones={opciones(ESTADO_TEMA)}
                />
                <SelectSimple
                  aria-label="Filtrar por línea"
                  className="sm:w-56"
                  value={lineaId}
                  onChange={setLineaId}
                  todos="Todas las líneas"
                  opciones={(lineas.data ?? []).map((x) => ({ value: x.id, label: x.nombre }))}
                />
              </>
            }
          />
        )}
      </ConsultaEstado>
      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando === 'nuevo' ? 'Registrar tema' : 'Editar tema'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormTema
              tema={editando === 'nuevo' ? null : editando}
              periodoId={periodoId}
              maxDefault={periodo?.maxIntegrantesDefault ?? 3}
              onClose={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
