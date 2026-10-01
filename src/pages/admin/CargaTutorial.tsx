import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Campo, SelectSimple } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MedidorCarga } from '@/features/asignaciones/MedidorCarga'
import {
  useCargaTutorial,
  useConfigCarga,
  useDocentes,
  useEliminarConfigCarga,
  useGuardarConfigCarga,
} from '@/features/catalogos/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { nombreCompleto } from '@/lib/utils'
import type { CargaDocente } from '@/types/dominio'

function FormLimite({
  inicial,
  onGuardar,
  pendiente,
  docenteSelector,
}: {
  inicial: { maxTrabajos: number; bloquearAlSuperar: boolean }
  onGuardar: (v: { maxTrabajos: number; bloquearAlSuperar: boolean }) => void
  pendiente: boolean
  docenteSelector?: React.ReactNode
}) {
  const [max, setMax] = useState(inicial.maxTrabajos)
  const [bloquear, setBloquear] = useState(inicial.bloquearAlSuperar)
  useEffect(() => {
    setMax(inicial.maxTrabajos)
    setBloquear(inicial.bloquearAlSuperar)
  }, [inicial.maxTrabajos, inicial.bloquearAlSuperar])
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        if (max >= 1) onGuardar({ maxTrabajos: max, bloquearAlSuperar: bloquear })
      }}
    >
      {docenteSelector}
      <Campo
        etiqueta="Máximo de trabajos"
        error={max < 1 ? 'Debe ser al menos 1.' : undefined}
        className="space-y-1.5 sm:w-40"
      >
        {(p) => (
          <Input
            {...p}
            type="number"
            min={1}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        )}
      </Campo>
      <div className="flex h-9 items-center gap-2">
        <Checkbox
          id={`bloq-${docenteSelector ? 'esp' : 'glob'}`}
          checked={bloquear}
          onCheckedChange={(v) => setBloquear(v === true)}
        />
        <Label htmlFor={`bloq-${docenteSelector ? 'esp' : 'glob'}`}>
          Bloquear al superar (si no, solo advierte)
        </Label>
      </div>
      <Button type="submit" disabled={pendiente || max < 1}>
        {docenteSelector ? (
          <>
            <PlusIcon /> Agregar
          </>
        ) : (
          'Guardar'
        )}
      </Button>
    </form>
  )
}

/** RF-29 / RF-30 / RN-11 */
export default function CargaTutorial() {
  const { periodoId } = usePeriodo()
  const config = useConfigCarga(periodoId)
  const carga = useCargaTutorial(periodoId)
  const docentes = useDocentes({ habilitadoTutoria: true })
  const guardar = useGuardarConfigCarga(periodoId)
  const eliminar = useEliminarConfigCarga()
  const [docenteId, setDocenteId] = useState('')

  if (!periodoId) return <Vacio titulo="Seleccione un período" />
  const global = config.data?.find((c) => !c.docente)
  const especificos = config.data?.filter((c) => c.docente) ?? []

  const columnas: ColumnDef<CargaDocente>[] = [
    {
      header: 'Docente',
      accessorFn: (c) => nombreCompleto(c.docente),
      cell: ({ row }) => (
        <span className="font-medium">{nombreCompleto(row.original.docente)}</span>
      ),
    },
    {
      header: 'Tutoría',
      accessorKey: 'habilitadoTutoria',
      cell: ({ row }) => (
        <Badge tono={row.original.habilitadoTutoria ? 'success' : 'muted'}>
          {row.original.habilitadoTutoria ? 'Habilitado' : 'No habilitado'}
        </Badge>
      ),
    },
    {
      header: 'Carga',
      accessorKey: 'actual',
      cell: ({ row }) => <MedidorCarga carga={row.original} compacto />,
    },
    {
      header: 'Límite aplicado',
      accessorKey: 'origenLimite',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.origenLimite === 'SIN_LIMITE'
            ? 'Sin límite'
            : `${row.original.limite} (${row.original.origenLimite === 'GLOBAL' ? 'global' : 'específico'})`}
          {row.original.limite !== null && (
            <span className="block text-xs text-muted-foreground">
              {row.original.bloquear ? 'Bloquea' : 'Advierte'}
            </span>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Carga tutorial"
        descripcion="Número máximo de trabajos por docente: límite global del período y límites específicos."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Límite global del período</CardTitle>
            <CardDescription>Se aplica a los docentes sin límite específico.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsultaEstado query={config}>
              {() => (
                <FormLimite
                  inicial={{
                    maxTrabajos: global?.maxTrabajos ?? 3,
                    bloquearAlSuperar: global?.bloquearAlSuperar ?? false,
                  }}
                  pendiente={guardar.isPending}
                  onGuardar={(v) => guardar.mutate({ docenteId: null, ...v })}
                />
              )}
            </ConsultaEstado>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Límites específicos por docente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormLimite
              inicial={{ maxTrabajos: 1, bloquearAlSuperar: true }}
              pendiente={guardar.isPending}
              onGuardar={(v) =>
                docenteId &&
                guardar.mutate({ docenteId, ...v }, { onSuccess: () => setDocenteId('') })
              }
              docenteSelector={
                <Campo etiqueta="Docente" className="flex-1 space-y-1.5">
                  {(p) => (
                    <SelectSimple
                      {...p}
                      value={docenteId}
                      onChange={setDocenteId}
                      opciones={(docentes.data ?? []).map((d) => ({
                        value: d.id,
                        label: nombreCompleto(d),
                      }))}
                    />
                  )}
                </Campo>
              }
            />
            {especificos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay límites específicos.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {especificos.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 p-3 text-sm">
                    <span className="flex-1 font-medium">{nombreCompleto(c.docente)}</span>
                    <span>Máx. {c.maxTrabajos}</span>
                    <Badge tono={c.bloquearAlSuperar ? 'danger' : 'warning'}>
                      {c.bloquearAlSuperar ? 'Bloquea' : 'Advierte'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminar.mutate(c.id)}
                      aria-label={`Quitar límite de ${nombreCompleto(c.docente)}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <h2 className="mt-8 mb-3 text-lg font-semibold">Carga actual por docente</h2>
      <ConsultaEstado query={carga}>
        {(l) => <DataTable columnas={columnas} datos={l} etiqueta="Carga por docente" />}
      </ConsultaEstado>
    </>
  )
}
