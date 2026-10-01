import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { Campo } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useGuardarLinea, useLineas } from '@/features/catalogos/api'
import type { LineaInvestigacion } from '@/types/dominio'

function FormLinea({
  linea,
  onClose,
}: {
  linea: Partial<LineaInvestigacion>
  onClose: () => void
}) {
  const [datos, setDatos] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    activa: true,
    ...linea,
  })
  const guardar = useGuardarLinea()
  const valido = datos.codigo.trim() && datos.nombre.trim()
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valido) guardar.mutate(datos, { onSuccess: onClose })
      }}
    >
      <Campo etiqueta="Código" requerido>
        {(p) => (
          <Input
            {...p}
            value={datos.codigo}
            maxLength={20}
            onChange={(e) => setDatos({ ...datos, codigo: e.target.value })}
          />
        )}
      </Campo>
      <Campo etiqueta="Nombre" requerido>
        {(p) => (
          <Input
            {...p}
            value={datos.nombre}
            maxLength={150}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
          />
        )}
      </Campo>
      <Campo etiqueta="Descripción">
        {(p) => (
          <Textarea
            {...p}
            value={datos.descripcion ?? ''}
            onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
          />
        )}
      </Campo>
      <div className="flex items-center gap-2">
        <Checkbox
          id="linea-activa"
          checked={datos.activa}
          onCheckedChange={(v) => setDatos({ ...datos, activa: v === true })}
        />
        <Label htmlFor="linea-activa">Activa</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valido || guardar.isPending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function Lineas() {
  const query = useLineas()
  const [editando, setEditando] = useState<Partial<LineaInvestigacion> | null>(null)
  const columnas: ColumnDef<LineaInvestigacion>[] = [
    { header: 'Código', accessorKey: 'codigo' },
    {
      header: 'Nombre',
      accessorKey: 'nombre',
      cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
    },
    {
      header: 'Descripción',
      accessorKey: 'descripcion',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.descripcion ?? '—'}</span>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'activa',
      cell: ({ row }) => (
        <Badge tono={row.original.activa ? 'success' : 'muted'}>
          {row.original.activa ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditando(row.original)}
          aria-label={`Editar ${row.original.nombre}`}
        >
          <PencilIcon />
        </Button>
      ),
    },
  ]
  return (
    <>
      <PageHeader
        titulo="Líneas de investigación"
        descripcion="Catálogo usado para clasificar los temas."
        acciones={
          <Button onClick={() => setEditando({})}>
            <PlusIcon /> Nueva línea
          </Button>
        }
      />
      <ConsultaEstado query={query}>
        {(l) => <DataTable columnas={columnas} datos={l} etiqueta="Líneas de investigación" />}
      </ConsultaEstado>
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando?.id ? 'Editar línea' : 'Nueva línea'}</DialogTitle>
          </DialogHeader>
          {editando && <FormLinea linea={editando} onClose={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
