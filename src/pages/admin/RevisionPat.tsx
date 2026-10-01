import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { DownloadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Campo, SelectSimple } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  descargarDocumentoPat,
  useBandejaPat,
  useDocumentosPat,
  useRevisarPat,
} from '@/features/pat/api'
import { HistorialVersionesPat } from '@/features/pat/HistorialVersiones'
import { revisionSchema, type RevisionForm } from '@/features/pat/schemas'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { mensajeError } from '@/lib/errores'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_PAT, opciones } from '@/lib/estados'
import { formatoBytes, nombreCompleto } from '@/lib/utils'
import type { DocumentoPat, EstadoDocumentoPat } from '@/types/dominio'

function Revisar({ doc, onClose }: { doc: DocumentoPat; onClose: () => void }) {
  const revisar = useRevisarPat()
  const anteriores = useDocumentosPat(doc.asignacionTemaId)
  const { control, register, handleSubmit, watch, formState } = useForm<RevisionForm>({
    resolver: zodResolver(revisionSchema),
    defaultValues: { resultado: undefined, observaciones: '' },
  })
  const resultado = watch('resultado')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Revisar PAT · versión {doc.version}</DialogTitle>
          <DialogDescription>
            {doc.tema?.titulo} · {doc.integrantes?.map(nombreCompleto).join(', ')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <form
            className="space-y-4"
            noValidate
            onSubmit={handleSubmit((d) =>
              revisar.mutate({ id: doc.id, ...d }, { onSuccess: onClose }),
            )}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                descargarDocumentoPat(doc.id).catch((e) => toast.error(mensajeError(e)))
              }
            >
              <DownloadIcon /> Descargar {doc.nombreArchivo} ({formatoBytes(doc.tamanoBytes)})
            </Button>
            <Campo etiqueta="Resultado" requerido error={formState.errors.resultado?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="resultado"
                  render={({ field }) => (
                    <SelectSimple
                      {...p}
                      value={field.value}
                      onChange={field.onChange}
                      opciones={opciones(ESTADO_PAT).filter((o) => o.value !== 'PENDIENTE')}
                    />
                  )}
                />
              )}
            </Campo>
            <Campo
              etiqueta="Observaciones"
              requerido={!!resultado && resultado !== 'APROBADO'}
              error={formState.errors.observaciones?.message}
              ayuda="Visibles para el estudiante. Obligatorias al observar o rechazar (RN-12)."
            >
              {(p) => <Textarea {...p} rows={6} {...register('observaciones')} />}
            </Campo>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={revisar.isPending}>
                Registrar revisión
              </Button>
            </DialogFooter>
          </form>
          <div>
            <p className="mb-2 text-sm font-medium">Historial de versiones</p>
            <ConsultaEstado query={anteriores}>
              {(d) => <HistorialVersionesPat documentos={d} />}
            </ConsultaEstado>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** RF-31 / RF-32 */
export default function RevisionPat() {
  const { periodoId } = usePeriodo()
  const [estado, setEstado] = useState<EstadoDocumentoPat | ''>('PENDIENTE')
  const query = useBandejaPat(periodoId, estado)
  const [revisando, setRevisando] = useState<DocumentoPat | null>(null)

  const columnas: ColumnDef<DocumentoPat>[] = [
    {
      header: 'Tema',
      accessorFn: (d) => d.tema?.titulo,
      cell: ({ row }) => <span className="font-medium">{row.original.tema?.titulo}</span>,
    },
    { header: 'Estudiante(s)', accessorFn: (d) => d.integrantes?.map(nombreCompleto).join(', ') },
    { header: 'Versión', accessorKey: 'version' },
    {
      header: 'Cargado',
      accessorKey: 'fechaCarga',
      cell: ({ row }) => formatFechaHora(row.original.fechaCarga),
    },
    { header: 'Formato', accessorKey: 'formato' },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_PAT} valor={row.original.estado} />,
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) =>
        row.original.estado === 'PENDIENTE' ? (
          <Button size="sm" onClick={() => setRevisando(row.original)}>
            Revisar
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setRevisando(row.original)} disabled>
            Revisado
          </Button>
        ),
    },
  ]

  if (!periodoId) return <Vacio titulo="Seleccione un período" />
  return (
    <>
      <PageHeader
        titulo="Revisión de PAT"
        descripcion="Cada versión del PAT recibe una revisión: aprobado, observado o rechazado."
      />
      <ConsultaEstado query={query}>
        {(l) => (
          <DataTable
            columnas={columnas}
            datos={l}
            etiqueta="Documentos PAT"
            filtros={
              <SelectSimple
                aria-label="Filtrar por estado"
                className="sm:w-52"
                value={estado}
                onChange={(v) => setEstado(v as EstadoDocumentoPat | '')}
                todos="Todos"
                opciones={opciones(ESTADO_PAT)}
              />
            }
            vacio={
              <Vacio
                titulo={
                  estado === 'PENDIENTE' ? 'No hay PAT pendientes de revisión' : 'Sin documentos'
                }
              />
            }
          />
        )}
      </ConsultaEstado>
      {revisando && <Revisar doc={revisando} onClose={() => setRevisando(null)} />}
    </>
  )
}
