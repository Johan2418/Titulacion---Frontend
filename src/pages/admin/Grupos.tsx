import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CrownIcon, Trash2Icon, UserMinusIcon } from 'lucide-react'
import { Campo, SelectSimple } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado } from '@/components/Estados'
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
  useCambiarRepresentanteAdmin,
  useDisolverGrupoAdmin,
  useGrupos,
  useRetirarIntegranteAdmin,
} from '@/features/grupos/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_GRUPO, ROL_EN_GRUPO } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { Grupo } from '@/types/dominio'

type Accion =
  | { tipo: 'representante'; g: Grupo }
  | { tipo: 'retirar'; g: Grupo; estudianteId: string }
  | { tipo: 'disolver'; g: Grupo }
  | null

const activos = (g: Grupo) => g.integrantes.filter((i) => i.estado === 'ACTIVO')

/** Diálogo único para las acciones administrativas; el motivo es obligatorio en todas. */
function DialogoAccion({ accion, onClose }: { accion: NonNullable<Accion>; onClose: () => void }) {
  const cambiar = useCambiarRepresentanteAdmin()
  const retirar = useRetirarIntegranteAdmin()
  const disolver = useDisolverGrupoAdmin()
  const [motivo, setMotivo] = useState('')
  const [elegido, setElegido] = useState('')
  const g = accion.g
  const miembros = activos(g)
  const representante = miembros.find((i) => i.rolEnGrupo === 'REPRESENTANTE')
  const retirado =
    accion.tipo === 'retirar' ? miembros.find((i) => i.estudiante.id === accion.estudianteId) : null
  // al retirar al representante con otros integrantes, el backend exige designar reemplazo
  const requiereReemplazo =
    accion.tipo === 'retirar' && retirado?.rolEnGrupo === 'REPRESENTANTE' && miembros.length > 1
  const candidatos = miembros.filter((i) =>
    accion.tipo === 'representante'
      ? i.rolEnGrupo !== 'REPRESENTANTE'
      : i.estudiante.id !== retirado?.estudiante.id,
  )
  const pendiente = cambiar.isPending || retirar.isPending || disolver.isPending
  const listo =
    !!motivo.trim() &&
    (accion.tipo !== 'representante' || !!elegido) &&
    (!requiereReemplazo || !!elegido)

  const confirmar = () => {
    const opciones = { onSuccess: onClose }
    if (accion.tipo === 'representante')
      cambiar.mutate({ grupoId: g.id, estudianteId: elegido, motivo }, opciones)
    else if (accion.tipo === 'retirar')
      retirar.mutate(
        {
          grupoId: g.id,
          estudianteId: accion.estudianteId,
          motivo,
          nuevoRepresentanteId: requiereReemplazo ? elegido : undefined,
        },
        opciones,
      )
    else disolver.mutate({ grupoId: g.id, motivo }, opciones)
  }

  const titulo = {
    representante: `Cambiar representante de ${g.nombre}`,
    retirar: `Retirar a ${nombreCompleto(retirado?.estudiante)}`,
    disolver: `Disolver ${g.nombre}`,
  }[accion.tipo]
  const descripcion = {
    representante: `Representante actual: ${nombreCompleto(representante?.estudiante)}.`,
    retirar: 'La pertenencia queda como retirada en el historial del grupo.',
    disolver: 'Todos los integrantes activos quedarán retirados y el grupo, disuelto.',
  }[accion.tipo]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {(accion.tipo === 'representante' || requiereReemplazo) && (
          <Campo etiqueta="Nuevo representante" requerido>
            {(p) => (
              <SelectSimple
                {...p}
                value={elegido}
                onChange={setElegido}
                opciones={candidatos.map((i) => ({
                  value: i.estudiante.id,
                  label: nombreCompleto(i.estudiante),
                }))}
              />
            )}
          </Campo>
        )}
        <Campo etiqueta="Motivo" requerido>
          {(p) => (
            <Textarea
              {...p}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={1000}
            />
          )}
        </Campo>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={accion.tipo === 'representante' ? 'default' : 'destructive'}
            disabled={!listo || pendiente}
            onClick={confirmar}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Administración de grupos del período (ADMIN). */
export default function Grupos() {
  const { periodoId } = usePeriodo()
  const query = useGrupos(periodoId)
  const [accion, setAccion] = useState<Accion>(null)

  const columnas: ColumnDef<Grupo>[] = [
    {
      header: 'Grupo',
      accessorFn: (g) =>
        `${g.nombre} ${g.integrantes.map((i) => nombreCompleto(i.estudiante)).join(' ')}`,
      cell: ({ row }) => (
        <span>
          <span className="block font-medium">{row.original.nombre}</span>
          <span className="text-xs text-muted-foreground">
            Creado el {formatFechaHora(row.original.creadoEn)}
            {row.original.composicionCerrada && ' · composición cerrada'}
          </span>
        </span>
      ),
    },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_GRUPO} valor={row.original.estado} />,
    },
    {
      header: 'Integrantes activos',
      id: 'integrantes',
      cell: ({ row }) => {
        const g = row.original
        const editable = !g.composicionCerrada && g.estado !== 'DISUELTO' && g.estado !== 'ANULADO'
        return (
          <ul className="space-y-1">
            {activos(g).map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-sm">
                <span>{nombreCompleto(i.estudiante)}</span>
                <StatusBadge mapa={ROL_EN_GRUPO} valor={i.rolEnGrupo} />
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setAccion({ tipo: 'retirar', g, estudianteId: i.estudiante.id })}
                    aria-label={`Retirar a ${nombreCompleto(i.estudiante)}`}
                    title="Retirar integrante"
                  >
                    <UserMinusIcon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )
      },
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const g = row.original
        if (g.estado === 'DISUELTO' || g.estado === 'ANULADO') return null
        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={activos(g).length < 2}
              onClick={() => setAccion({ tipo: 'representante', g })}
            >
              <CrownIcon /> Representante
            </Button>
            {!g.composicionCerrada && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAccion({ tipo: 'disolver', g })}
              >
                <Trash2Icon /> Disolver
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
        titulo="Grupos"
        descripcion="Grupos del período. La reorganización administrativa solo es posible antes del inicio de titulación y mientras el grupo no tenga postulaciones."
      />
      <ConsultaEstado query={query}>
        {(l) => (
          <DataTable
            columnas={columnas}
            datos={l}
            etiqueta="Grupos"
            placeholderBusqueda="Buscar por grupo o integrante…"
          />
        )}
      </ConsultaEstado>
      {accion && (
        <DialogoAccion
          key={`${accion.tipo}-${accion.g.id}`}
          accion={accion}
          onClose={() => setAccion(null)}
        />
      )}
    </>
  )
}
