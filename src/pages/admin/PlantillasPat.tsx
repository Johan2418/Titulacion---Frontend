import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DownloadIcon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Campo } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { FileUpload } from '@/components/FileUpload'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { descargarPlantilla, usePlantillas, useSubirPlantilla } from '@/features/pat/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { MAX_TAMANO_PAT, TIPOS_PAT } from '@/lib/archivos'
import { mensajeError } from '@/lib/errores'
import { formatFecha } from '@/lib/fechas'
import { formatoBytes, nombreCompleto } from '@/lib/utils'
import type { PlantillaPat } from '@/types/dominio'

function SubirPlantilla({ onClose }: { onClose: () => void }) {
  const { periodoId } = usePeriodo()
  const subir = useSubirPlantilla(periodoId)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [version, setVersion] = useState('')
  const valido = !!archivo && !!version.trim()
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!archivo || !valido) return
        subir.mutate({ archivo, version: version.trim() }, { onSuccess: onClose })
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
      <p className="text-sm text-muted-foreground">
        Al publicar, esta versión pasa a ser la vigente desde hoy y la anterior deja de estarlo.
        Para cambiar la plantilla vigente, publique una nueva versión.
      </p>
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
          {formatFecha(row.original.creadoEn)}
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
              descargarPlantilla(periodoId!, row.original.id, row.original.nombreArchivo).catch(
                (e) => toast.error(mensajeError(e)),
              )
            }
            aria-label={`Descargar versión ${row.original.version}`}
          >
            <DownloadIcon />
          </Button>
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
