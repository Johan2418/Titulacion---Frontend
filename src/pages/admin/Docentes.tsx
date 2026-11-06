import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DownloadIcon, MailIcon, PencilIcon, PlusIcon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Campo, SelectSimple } from '@/components/Campo'
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
import { mensajeError } from '@/lib/errores'
import {
  descargarPlantillaDocentes,
  useDocentes,
  useGuardarDocente,
  useImportarDocentes,
  useReenviarAcceso,
  type DocenteInput,
} from '@/features/catalogos/api'
import { opcionesCarrerasConFacultad, useFacultades } from '@/features/academico/api'
import { ErrorCatalogo } from '@/features/academico/ErrorCatalogo'
import { ImportarArchivo } from '@/features/catalogos/ImportarArchivo'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TIPOS_IMPORTACION } from '@/lib/archivos'
import { nombreCompleto } from '@/lib/utils'
import type { Docente, EstadoUsuario } from '@/types/dominio'

const TIPOS_XLSX = { xlsx: TIPOS_IMPORTACION.xlsx }
const COLUMNAS_IMPORTACION = 'DOCENTES (Apellidos Nombres), Tipo (Nombramiento/Contratos)'
const vacio = (v?: string | null) => v || '—'

function FormDocente({ docente, onClose }: { docente: Docente | null; onClose: () => void }) {
  const [d, setD] = useState<DocenteInput>({
    cedula: docente?.cedula ?? '',
    nombres: docente?.nombres ?? '',
    apellidos: docente?.apellidos ?? '',
    email: docente?.email ?? '',
    tituloAcademico: docente?.tituloAcademico ?? '',
    carreraId: docente?.carrera.id ?? '',
    habilitadoTutoria: docente?.habilitadoTutoria ?? true,
  })
  const [estado, setEstado] = useState<EstadoUsuario>(docente?.estado ?? 'ACTIVO')
  const guardar = useGuardarDocente()
  const facultades = useFacultades()
  const errores = {
    cedula:
      d.cedula?.trim() && !/^\d{10}$/.test(d.cedula.trim())
        ? 'La cédula debe tener 10 dígitos.'
        : undefined,
    email: !/^\S+@\S+\.\S+$/.test(d.email) ? 'Correo inválido.' : undefined,
    carrera: !d.carreraId ? 'Seleccione la carrera.' : undefined,
  }
  const [intentado, setIntentado] = useState(false)
  const valido =
    !errores.cedula && !errores.email && !errores.carrera && d.nombres.trim() && d.apellidos.trim()
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
        guardar.mutate(docente ? { id: docente.id, ...d, estado } : d, { onSuccess: onClose })
      }}
    >
      <Campo etiqueta="Cédula" error={intentado ? errores.cedula : undefined}>
        {(p) => <Input {...p} value={d.cedula} onChange={set('cedula')} inputMode="numeric" />}
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
      {docente && (
        <p className="text-xs text-muted-foreground sm:col-span-2 -mt-2">
          El correo es el usuario de acceso y no se puede modificar.
        </p>
      )}
      <Campo etiqueta="Nombres" requerido>
        {(p) => <Input {...p} value={d.nombres} onChange={set('nombres')} />}
      </Campo>
      <Campo etiqueta="Apellidos" requerido>
        {(p) => <Input {...p} value={d.apellidos} onChange={set('apellidos')} />}
      </Campo>
      <Campo etiqueta="Título académico">
        {(p) => <Input {...p} value={d.tituloAcademico} onChange={set('tituloAcademico')} />}
      </Campo>
      <Campo etiqueta="Carrera" requerido error={intentado ? errores.carrera : undefined}>
        {(p) => (
          <>
            <SelectSimple
              {...p}
              value={d.carreraId}
              onChange={(v) => setD({ ...d, carreraId: v })}
              placeholder={facultades.isLoading ? 'Cargando carreras…' : 'Seleccione…'}
              opciones={opcionesCarrerasConFacultad(facultades.data)}
            />
            <ErrorCatalogo consulta={facultades} />
          </>
        )}
      </Campo>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox
          id="hab-tutoria"
          checked={d.habilitadoTutoria}
          onCheckedChange={(v) => setD({ ...d, habilitadoTutoria: v === true })}
        />
        <Label htmlFor="hab-tutoria">Habilitado para tutoría</Label>
      </div>
      {docente && (
        <Campo etiqueta="Estado de la cuenta" className="space-y-1.5 sm:col-span-2">
          {(p) => (
            <>
              <SelectSimple
                {...p}
                value={estado}
                onChange={(v) => setEstado(v as EstadoUsuario)}
                opciones={[
                  { value: 'ACTIVO', label: 'Activa' },
                  { value: 'INACTIVO', label: 'Inactiva' },
                ]}
              />
              {estado === 'INACTIVO' && docente.estado === 'ACTIVO' && (
                <p className="text-xs text-muted-foreground">
                  El docente no podrá ingresar y se cerrarán sus sesiones. Sus tutorías y
                  asignaciones vigentes no cambian.
                </p>
              )}
            </>
          )}
        </Campo>
      )}
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
  const reenviar = useReenviarAcceso()
  const facultades = useFacultades()
  const carreras = opcionesCarrerasConFacultad(facultades.data)
  const [carreraId, setCarreraId] = useState('')
  const [editando, setEditando] = useState<Docente | null | 'nuevo'>(null)
  const [importando, setImportando] = useState(false)

  const columnas: ColumnDef<Docente>[] = [
    { header: 'Cédula', accessorFn: (d) => vacio(d.cedula) },
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
    { header: 'Título', accessorFn: (d) => vacio(d.tituloAcademico) },
    { header: 'Carrera', accessorFn: (d) => d.carrera.nombre },
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
        <div className="flex justify-end gap-1">
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Reenviar acceso a ${nombreCompleto(row.original)}`}
                title="Reenviar acceso"
              >
                <MailIcon />
              </Button>
            }
            titulo="Reenviar acceso"
            descripcion={`Se generará una nueva clave temporal y se enviará a ${row.original.email}. Solo aplica a cuentas que todavía no establecieron su contraseña personal.`}
            confirmar="Reenviar"
            onConfirm={() => reenviar.mutateAsync(row.original.usuarioId)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditando(row.original)}
            aria-label={`Editar ${nombreCompleto(row.original)}`}
          >
            <PencilIcon />
          </Button>
        </div>
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
      <div className="mb-4 empty:hidden">
        <ErrorCatalogo consulta={facultades} />
      </div>
      <ConsultaEstado query={query}>
        {(l) => (
          <DataTable
            columnas={columnas}
            datos={l.filter((d) => !carreraId || d.carrera.id === carreraId)}
            etiqueta="Docentes"
            placeholderBusqueda="Buscar por nombre, cédula…"
            filtros={
              <SelectSimple
                aria-label="Filtrar por carrera"
                className="sm:w-72"
                value={carreraId}
                onChange={setCarreraId}
                todos="Todas las carreras"
                opciones={carreras}
              />
            }
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
        tipos={TIPOS_XLSX}
        descripcion={
          <>
            Archivo Excel (.xlsx), hoja Tutores, con las columnas:{' '}
            <code className="text-xs">{COLUMNAS_IMPORTACION}</code>; las demás se ignoran. Elija la
            carrera de los docentes antes de subir el archivo. El correo se genera como
            nombre.apellido@live.uleam.edu.ec, Nombramiento habilita la tutoría y cada docente
            recibe por correo una clave temporal.{' '}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() =>
                descargarPlantillaDocentes().catch((e) => toast.error(mensajeError(e)))
              }
            >
              <DownloadIcon /> Descargar plantilla
            </Button>
          </>
        }
        carreras={carreras}
        catalogo={facultades}
        importar={(archivo, carrera) => importar.mutateAsync({ archivo, carreraId: carrera })}
      />
    </>
  )
}
