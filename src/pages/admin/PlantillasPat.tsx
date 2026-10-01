import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2Icon, DownloadIcon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Campo } from '@/components/Campo'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { FileUpload } from '@/components/FileUpload'
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
  descargarPlantilla,
  useActivarPlantilla,
  usePlantillas,
  useSubirPlantilla,
} from '@/features/pat/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { MAX_TAMANO_PAT, TIPOS_PAT } from '@/lib/archivos'
import { mensajeError } from '@/lib/errores'
import { formatFecha, formatFechaHora, inputLocalToIso } from '@/lib/fechas'
import { formatoBytes, nombreCompleto } from '@/lib/utils'
import type { PlantillaPat } from '@/types/dominio'

function SubirPlantilla({ onClose }: { onClose: () => void }) {
  const { periodoId } = usePeriodo()
  const subir = useSubirPlantilla(periodoId)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [version, setVersion] = useState('')
  const [activar, setActivar] = useState(true)
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const valido = !!archivo && !!version.trim() && (!inicio || !fin || fin >= inicio)
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!archivo || !valido) return
        subir.mutate(
          {
            archivo,
            version: version.trim(),
            activar,
            fechaVigenciaInicio: inicio ? inputLocalToIso(`${inicio}T00:00`) : undefined,
            fechaVigenciaFin: fin ? inputLocalToIso(`${fin}T23:59`) : undefined,
          },
          { onSuccess: onClose },
        )
      }}
    >
      <FileUpload
        reglas={{ tipos: TIPOS_PAT, maxBytes: MAX_TAMANO_PAT }}
        archivo={archivo}
        onChange={setArchivo}
      />
      <Campo etiqueta="Versión" requerido>
        {(p) => (
          <Input
            {...p}
            value={version}
            maxLength={20}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="2.0"
          />
        )}
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Vigencia desde">
          {(p) => (
            <Input {...p} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          )}
        </Campo>
        <Campo
          etiqueta="Vigencia hasta"
          error={inicio && fin && fin < inicio ? 'Debe ser posterior al inicio.' : undefined}
        >
          {(p) => <Input {...p} type="date" value={fin} onChange={(e) => setFin(e.target.value)} />}
        </Campo>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="activar-plantilla"
          checked={activar}
          onCheckedChange={(v) => setActivar(v === true)}
        />
        <Label htmlFor="activar-plantilla">
          Activar al publicar (desactiva la plantilla vigente)
        </Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valido || subir.isPending}>
          <UploadIcon /> Publicar
        </Button>
      </DialogFooter>
    </form>
  )
}

/** RF-33: una sola plantilla activa por período. */
export default function PlantillasPat() {
  const { periodoId } = usePeriodo()
  const query = usePlantillas(periodoId)
  const activar = useActivarPlantilla()
  const [subiendo, setSubiendo] = useState(false)

  const columnas: ColumnDef<PlantillaPat>[] = [
    {
      header: 'Versión',
      accessorKey: 'version',
      cell: ({ row }) => <span className="font-medium">{row.original.version}</span>,
    },
    {
      header: 'Archivo',
      accessorKey: 'nombreArchivo',
      cell: ({ row }) => (
        <span>
          {row.original.nombreArchivo}{' '}
          <span className="text-xs text-muted-foreground">
            ({formatoBytes(row.original.tamanoBytes)})
          </span>
        </span>
      ),
    },
    {
      header: 'Vigencia',
      accessorKey: 'fechaVigenciaInicio',
      cell: ({ row }) =>
        `${formatFecha(row.original.fechaVigenciaInicio)} – ${formatFecha(row.original.fechaVigenciaFin)}`,
    },
    {
      header: 'Publicada',
      accessorKey: 'creadoEn',
      cell: ({ row }) => (
        <span>
          {formatFechaHora(row.original.creadoEn)}
          <span className="block text-xs text-muted-foreground">
            {nombreCompleto(row.original.publicadaPor)}
          </span>
        </span>
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
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              descargarPlantilla(row.original.id).catch((e) => toast.error(mensajeError(e)))
            }
            aria-label={`Descargar versión ${row.original.version}`}
          >
            <DownloadIcon />
          </Button>
          {!row.original.activa && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <CheckCircle2Icon /> Activar
                </Button>
              }
              titulo={`Activar versión ${row.original.version}`}
              descripcion="Será la única plantilla vigente del período."
              onConfirm={() => activar.mutateAsync(row.original.id)}
            />
          )}
        </div>
      ),
    },
  ]

  if (!periodoId) return <Vacio titulo="Seleccione un período" />
  return (
    <>
      <PageHeader
        titulo="Plantillas PAT"
        descripcion="Publique y versione la plantilla del Plan de Trabajo del período."
        acciones={
          <Button onClick={() => setSubiendo(true)}>
            <UploadIcon /> Publicar plantilla
          </Button>
        }
      />
      <ConsultaEstado query={query}>
        {(l) => (
          <DataTable columnas={columnas} datos={l} etiqueta="Plantillas PAT" busqueda={false} />
        )}
      </ConsultaEstado>
      <Dialog open={subiendo} onOpenChange={setSubiendo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar plantilla PAT</DialogTitle>
          </DialogHeader>
          {subiendo && <SubirPlantilla onClose={() => setSubiendo(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
