import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DownloadIcon, FileSpreadsheetIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Campo, SelectSimple } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import {
  descargarExportacion,
  useExportaciones,
  useSolicitarExportacion,
} from '@/features/reportes/api'
import { mensajeError } from '@/lib/errores'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_EXPORTACION, TIPO_REPORTE } from '@/lib/estados'
import { formatoBytes } from '@/lib/utils'
import {
  FORMATOS_EXPORTACION,
  TIPOS_REPORTE,
  type FormatoExportacion,
  type SolicitudExportacion,
  type TipoReporte,
} from '@/types/dominio'

/** RF-35 / RF-36: reportes exportables en PDF, XLSX o CSV procesados en segundo plano. */
export default function Reportes() {
  const { periodo, periodoId } = usePeriodo()
  const [tipo, setTipo] = useState<TipoReporte>('ESTUDIANTES')
  const [formato, setFormato] = useState<FormatoExportacion>('XLSX')
  const query = useExportaciones()
  const solicitar = useSolicitarExportacion()

  const columnas: ColumnDef<SolicitudExportacion>[] = [
    {
      header: 'Reporte',
      accessorKey: 'tipoReporte',
      cell: ({ row }) => (
        <span className="font-medium">{TIPO_REPORTE[row.original.tipoReporte]}</span>
      ),
    },
    { header: 'Formato', accessorKey: 'formato' },
    {
      header: 'Solicitado',
      accessorKey: 'fechaSolicitud',
      cell: ({ row }) => formatFechaHora(row.original.fechaSolicitud),
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_EXPORTACION} valor={row.original.estado} />,
    },
    {
      header: 'Tamaño',
      accessorKey: 'tamanoBytes',
      cell: ({ row }) => formatoBytes(row.original.tamanoBytes),
    },
    {
      header: 'Expira',
      accessorKey: 'expiraEn',
      cell: ({ row }) => formatFechaHora(row.original.expiraEn),
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const expirado = !!row.original.expiraEn && new Date(row.original.expiraEn) < new Date()
        return row.original.estado === 'LISTO' ? (
          <Button
            size="sm"
            variant="outline"
            disabled={expirado}
            onClick={() =>
              descargarExportacion(row.original.id).catch((e) => toast.error(mensajeError(e)))
            }
          >
            <DownloadIcon /> {expirado ? 'Expirado' : 'Descargar'}
          </Button>
        ) : null
      },
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Reportes y exportación"
        descripcion="Los reportes se generan en segundo plano; descárguelos cuando estén listos."
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nuevo reporte</CardTitle>
          <CardDescription>
            Período: {periodo ? `${periodo.codigo} · ${periodo.nombre}` : '—'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              solicitar.mutate({ tipoReporte: tipo, formato, periodoId })
            }}
          >
            <Campo etiqueta="Tipo de reporte" className="space-y-1.5 sm:w-72">
              {(p) => (
                <SelectSimple
                  {...p}
                  value={tipo}
                  onChange={(v) => setTipo(v as TipoReporte)}
                  opciones={TIPOS_REPORTE.map((t) => ({ value: t, label: TIPO_REPORTE[t] }))}
                />
              )}
            </Campo>
            <Campo etiqueta="Formato" className="space-y-1.5 sm:w-32">
              {(p) => (
                <SelectSimple
                  {...p}
                  value={formato}
                  onChange={(v) => setFormato(v as FormatoExportacion)}
                  opciones={FORMATOS_EXPORTACION.map((f) => ({ value: f, label: f }))}
                />
              )}
            </Campo>
            <Button type="submit" disabled={solicitar.isPending}>
              <FileSpreadsheetIcon /> Generar
            </Button>
          </form>
        </CardContent>
      </Card>
      <h2 className="mb-3 text-lg font-semibold">Solicitudes</h2>
      <ConsultaEstado query={query}>
        {(l) => (
          <DataTable
            columnas={columnas}
            datos={l}
            etiqueta="Solicitudes de exportación"
            busqueda={false}
          />
        )}
      </ConsultaEstado>
    </>
  )
}
