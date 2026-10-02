import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { Campo } from '@/components/Campo'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  useActualizarPeriodo,
  useCambiarEstadoPeriodo,
  useCrearPeriodo,
  usePeriodos,
} from '@/features/periodos/api'
import { periodoSchema, type PeriodoForm } from '@/features/periodos/schemas'
import { formatFecha, inputLocalToIso, isoToInputLocal } from '@/lib/fechas'
import { ESTADO_PERIODO } from '@/lib/estados'
import type { EstadoPeriodo, PeriodoTitulacion } from '@/types/dominio'

/** Transiciones permitidas del período (el backend las valida). */
const SIGUIENTE: Partial<Record<EstadoPeriodo, { estado: EstadoPeriodo; label: string }[]>> = {
  BORRADOR: [{ estado: 'POSTULACION_ABIERTA', label: 'Abrir postulación' }],
  POSTULACION_ABIERTA: [{ estado: 'POSTULACION_CERRADA', label: 'Cerrar postulación' }],
  POSTULACION_CERRADA: [
    { estado: 'POSTULACION_ABIERTA', label: 'Reabrir postulación' },
    { estado: 'EN_CURSO', label: 'Iniciar titulación' },
  ],
  EN_CURSO: [{ estado: 'ARCHIVADO', label: 'Archivar' }],
}

function FormPeriodo({
  periodo,
  onClose,
}: {
  periodo: PeriodoTitulacion | null
  onClose: () => void
}) {
  const crear = useCrearPeriodo()
  const actualizar = useActualizarPeriodo()
  const { register, handleSubmit, formState } = useForm<PeriodoForm>({
    resolver: zodResolver(periodoSchema) as never,
    defaultValues: periodo
      ? {
          codigo: periodo.codigo,
          nombre: periodo.nombre,
          fechaInicioPostulacion: isoToInputLocal(periodo.fechaInicioPostulacion),
          fechaFinPostulacion: isoToInputLocal(periodo.fechaFinPostulacion),
          fechaInicioTitulacion: isoToInputLocal(periodo.fechaInicioTitulacion),
          maxIntegrantesDefault: periodo.maxIntegrantesDefault,
        }
      : { maxIntegrantesDefault: 3 },
  })
  const e = formState.errors
  const enviar = handleSubmit((d) => {
    const cuerpo = {
      ...d,
      fechaInicioPostulacion: inputLocalToIso(d.fechaInicioPostulacion),
      fechaFinPostulacion: inputLocalToIso(d.fechaFinPostulacion),
      fechaInicioTitulacion: inputLocalToIso(d.fechaInicioTitulacion),
    }
    if (periodo) actualizar.mutate({ id: periodo.id, ...cuerpo }, { onSuccess: onClose })
    else crear.mutate(cuerpo, { onSuccess: onClose })
  })
  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Campo etiqueta="Código" requerido error={e.codigo?.message}>
        {(p) => <Input {...p} {...register('codigo')} placeholder="2027-1" />}
      </Campo>
      <Campo
        etiqueta="Máx. integrantes por defecto"
        requerido
        error={e.maxIntegrantesDefault?.message}
      >
        {(p) => <Input {...p} type="number" min={1} {...register('maxIntegrantesDefault')} />}
      </Campo>
      <Campo
        etiqueta="Nombre"
        requerido
        error={e.nombre?.message}
        className="space-y-1.5 sm:col-span-2"
      >
        {(p) => <Input {...p} {...register('nombre')} />}
      </Campo>
      <Campo etiqueta="Inicio de postulación" requerido error={e.fechaInicioPostulacion?.message}>
        {(p) => <Input {...p} type="datetime-local" {...register('fechaInicioPostulacion')} />}
      </Campo>
      <Campo etiqueta="Fin de postulación" requerido error={e.fechaFinPostulacion?.message}>
        {(p) => <Input {...p} type="datetime-local" {...register('fechaFinPostulacion')} />}
      </Campo>
      <Campo
        etiqueta="Inicio de titulación"
        requerido
        error={e.fechaInicioTitulacion?.message}
        ayuda="Fecha límite para resolver a los condicionados."
      >
        {(p) => <Input {...p} type="datetime-local" {...register('fechaInicioTitulacion')} />}
      </Campo>
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending || actualizar.isPending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}

/** RF-17 */
export default function Periodos() {
  const query = usePeriodos()
  const cambiar = useCambiarEstadoPeriodo()
  const [editando, setEditando] = useState<PeriodoTitulacion | null | 'nuevo'>(null)

  const columnas: ColumnDef<PeriodoTitulacion>[] = [
    {
      header: 'Código',
      accessorKey: 'codigo',
      cell: ({ row }) => <span className="font-medium">{row.original.codigo}</span>,
    },
    { header: 'Nombre', accessorKey: 'nombre' },
    {
      header: 'Postulación',
      accessorKey: 'fechaInicioPostulacion',
      cell: ({ row }) =>
        `${formatFecha(row.original.fechaInicioPostulacion)} – ${formatFecha(row.original.fechaFinPostulacion)}`,
    },
    {
      header: 'Inicio titulación',
      accessorKey: 'fechaInicioTitulacion',
      cell: ({ row }) => formatFecha(row.original.fechaInicioTitulacion),
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge mapa={ESTADO_PERIODO} valor={row.original.estado} />
          {!!row.original.condicionadosPendientes && (
            <span className="text-xs text-amber-700 dark:text-amber-300">
              {row.original.condicionadosPendientes} condicionado(s) pendiente(s)
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex flex-wrap justify-end gap-1">
            {(SIGUIENTE[p.estado] ?? []).map((s) => {
              const bloqueado = s.estado === 'EN_CURSO' && !!p.condicionadosPendientes
              return (
                <ConfirmDialog
                  key={s.estado}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bloqueado}
                      title={bloqueado ? 'Hay condicionados sin resolver (RN-02)' : undefined}
                    >
                      {s.label}
                    </Button>
                  }
                  titulo={`${s.label}: ${p.codigo}`}
                  descripcion={`El período pasará a «${ESTADO_PERIODO[s.estado].label}».`}
                  onConfirm={() => cambiar.mutateAsync({ id: p.id, estado: s.estado })}
                />
              )
            })}
            {p.estado !== 'ARCHIVADO' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditando(p)}
                aria-label={`Editar ${p.codigo}`}
              >
                <PencilIcon />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Períodos de titulación"
        descripcion="Fechas de postulación, inicio de titulación y estado de cada período."
        acciones={
          <Button onClick={() => setEditando('nuevo')}>
            <PlusIcon /> Nuevo período
          </Button>
        }
      />
      <ConsultaEstado query={query}>
        {(lista) => <DataTable columnas={columnas} datos={lista} etiqueta="Períodos" />}
      </ConsultaEstado>
      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando === 'nuevo' ? 'Nuevo período' : 'Editar período'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormPeriodo
              periodo={editando === 'nuevo' ? null : editando}
              onClose={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
