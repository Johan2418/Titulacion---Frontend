import { useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon, UploadIcon } from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { opcionesCarrerasConFacultad, useFacultades } from '@/features/academico/api'
import { ErrorCatalogo } from '@/features/academico/ErrorCatalogo'
import { useLineas } from '@/features/catalogos/api'
import { AccionesTema } from '@/features/temas/AccionesTema'
import { useTemas } from '@/features/temas/api'
import {
  FILTROS_BANCO_INICIALES,
  FiltrosBancoTemas,
  filtrosTemaDesdeBanco,
  type FiltrosBanco,
} from '@/features/temas/FiltrosBancoTemas'
import { FormTema } from '@/features/temas/FormTema'
import { ImportarTemas } from '@/features/temas/ImportarTemas'
import { etiquetaTipoTema } from '@/features/temas/integrantes'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { ESTADO_TEMA } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { Tema } from '@/types/dominio'

/** RF-20 / RF-21: banco de temas por carrera, común a todos los períodos. */
export default function Temas() {
  const [filtros, setFiltros] = useState<FiltrosBanco>(FILTROS_BANCO_INICIALES)
  const lineas = useLineas()
  const facultades = useFacultades()
  const query = useTemas(filtrosTemaDesdeBanco(filtros))
  const { periodo } = usePeriodo()
  const [editando, setEditando] = useState<Tema | null | 'nuevo'>(null)
  const [importando, setImportando] = useState(false)

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
    { header: 'Carrera', accessorFn: (t) => t.carrera.nombre },
    { header: 'Línea', accessorFn: (t) => t.linea.nombre },
    { header: 'Proponente', accessorFn: (t) => nombreCompleto(t.docenteProponente) },
    { header: 'Tipo', accessorFn: (t) => etiquetaTipoTema(t.tipo, periodo?.maxIntegrantesDefault) },
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
          {row.original.estado !== 'ASIGNADO' && (
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

  return (
    <>
      <PageHeader
        titulo="Banco de temas"
        descripcion="Temas por carrera, disponibles en todos los períodos mientras no tengan una asignación vigente."
        acciones={
          <>
            <Button variant="outline" onClick={() => setImportando(true)}>
              <UploadIcon /> Importar temas
            </Button>
            <Button onClick={() => setEditando('nuevo')}>
              <PlusIcon /> Registrar tema
            </Button>
          </>
        }
      />
      <div className="mb-4 empty:hidden">
        <ErrorCatalogo consulta={facultades} />
      </div>
      <ConsultaEstado query={query}>
        {(l) => (
          <DataTable
            columnas={columnas}
            datos={l}
            etiqueta="Temas"
            placeholderBusqueda="Buscar por título o docente…"
            filtros={
              <FiltrosBancoTemas
                valores={filtros}
                onChange={setFiltros}
                carreras={opcionesCarrerasConFacultad(facultades.data)}
                lineas={(lineas.data ?? []).map((x) => ({ value: x.id, label: x.nombre }))}
              />
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
              onClose={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <ImportarTemas abierto={importando} onClose={() => setImportando(false)} />
    </>
  )
}
