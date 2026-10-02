import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon, UploadIcon } from 'lucide-react'
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
import {
  useDocentes,
  useGuardarDocente,
  useImportarDocentes,
  type DocenteInput,
} from '@/features/catalogos/api'
import { ImportarArchivo } from '@/features/catalogos/ImportarArchivo'
import { nombreCompleto } from '@/lib/utils'
import type { Docente } from '@/types/dominio'

function FormDocente({ docente, onClose }: { docente: Docente | null; onClose: () => void }) {
  const [d, setD] = useState<DocenteInput>({
    cedula: docente?.cedula ?? '',
    nombres: docente?.nombres ?? '',
    apellidos: docente?.apellidos ?? '',
    email: docente?.email ?? '',
    tituloAcademico: docente?.tituloAcademico ?? '',
    departamento: docente?.departamento ?? '',
    habilitadoTutoria: docente?.habilitadoTutoria ?? true,
  })
  const guardar = useGuardarDocente()
  const errores = {
    cedula: !/^\d{10}$/.test(d.cedula) ? 'La cédula debe tener 10 dígitos.' : undefined,
    email: !/^\S+@\S+\.\S+$/.test(d.email) ? 'Correo inválido.' : undefined,
  }
  const [intentado, setIntentado] = useState(false)
  const valido = !errores.cedula && !errores.email && d.nombres.trim() && d.apellidos.trim()
  const set = (k: keyof DocenteInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setD({ ...d, [k]: e.target.value })

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setIntentado(true)
        if (!valido) return
        guardar.mutate(docente ? { id: docente.id, ...d } : d, { onSuccess: onClose })
      }}
    >
      <Campo etiqueta="Cédula" requerido error={intentado ? errores.cedula : undefined}>
        {(p) => (
          <Input
            {...p}
            value={d.cedula}
            onChange={set('cedula')}
            disabled={!!docente}
            inputMode="numeric"
          />
        )}
      </Campo>
      <Campo
        etiqueta="Correo institucional"
        requerido
        error={intentado ? errores.email : undefined}
      >
        {(p) => (
          <Input {...p} type="email" value={d.email} onChange={set('email')} disabled={!!docente} />
        )}
      </Campo>
      <Campo etiqueta="Nombres" requerido>
        {(p) => <Input {...p} value={d.nombres} onChange={set('nombres')} />}
      </Campo>
      <Campo etiqueta="Apellidos" requerido>
        {(p) => <Input {...p} value={d.apellidos} onChange={set('apellidos')} />}
      </Campo>
      <Campo etiqueta="Título académico">
        {(p) => <Input {...p} value={d.tituloAcademico} onChange={set('tituloAcademico')} />}
      </Campo>
      <Campo etiqueta="Departamento">
        {(p) => <Input {...p} value={d.departamento} onChange={set('departamento')} />}
      </Campo>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox
          id="hab-tutoria"
          checked={d.habilitadoTutoria}
          onCheckedChange={(v) => setD({ ...d, habilitadoTutoria: v === true })}
        />
        <Label htmlFor="hab-tutoria">Habilitado para tutoría</Label>
      </div>
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}

/** RF-19 */
export default function Docentes() {
  const query = useDocentes()
  const guardar = useGuardarDocente()
  const importar = useImportarDocentes()
  const [editando, setEditando] = useState<Docente | null | 'nuevo'>(null)
  const [importando, setImportando] = useState(false)

  const columnas: ColumnDef<Docente>[] = [
    { header: 'Cédula', accessorKey: 'cedula' },
    {
      header: 'Docente',
      accessorFn: (d) => nombreCompleto(d),
      cell: ({ row }) => (
        <span>
          <span className="block font-medium">{nombreCompleto(row.original)}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </span>
      ),
    },
    { header: 'Título', accessorKey: 'tituloAcademico' },
    { header: 'Departamento', accessorKey: 'departamento' },
    {
      header: 'Tutoría',
      accessorKey: 'habilitadoTutoria',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={row.original.habilitadoTutoria}
            aria-label={`Habilitado para tutoría: ${nombreCompleto(row.original)}`}
            onCheckedChange={(v) =>
              guardar.mutate({ id: row.original.id, habilitadoTutoria: v === true })
            }
          />
          <Badge tono={row.original.habilitadoTutoria ? 'success' : 'muted'}>
            {row.original.habilitadoTutoria ? 'Habilitado' : 'No habilitado'}
          </Badge>
        </div>
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
          aria-label={`Editar ${nombreCompleto(row.original)}`}
        >
          <PencilIcon />
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Docentes"
        descripcion="Registro de docentes y habilitación para tutoría."
        acciones={
          <>
            <Button variant="outline" onClick={() => setImportando(true)}>
              <UploadIcon /> Importar
            </Button>
            <Button onClick={() => setEditando('nuevo')}>
              <PlusIcon /> Nuevo docente
            </Button>
          </>
        }
      />
      <ConsultaEstado query={query}>
        {(l) => (
          <DataTable
            columnas={columnas}
            datos={l}
            etiqueta="Docentes"
            placeholderBusqueda="Buscar por nombre, cédula…"
          />
        )}
      </ConsultaEstado>
      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando === 'nuevo' ? 'Nuevo docente' : 'Editar docente'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormDocente
              docente={editando === 'nuevo' ? null : editando}
              onClose={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <ImportarArchivo
        abierto={importando}
        onClose={() => setImportando(false)}
        titulo="Importar docentes"
        tipo="DOCENTES"
        columnas="cedula, nombres, apellidos, email, titulo, departamento, habilitado (si/no)"
        importar={(f) => importar.mutateAsync(f)}
      />
    </>
  )
}
