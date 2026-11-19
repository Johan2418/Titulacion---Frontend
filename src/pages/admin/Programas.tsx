import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { useUsuario } from '@/auth/AuthProvider'
import { SelectSimple } from '@/components/Campo'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  opcionesCarrerasConFacultad,
  opcionesFacultades,
  useFacultades,
} from '@/features/academico/api'
import { ErrorCatalogo } from '@/features/academico/ErrorCatalogo'
import {
  carreraTrasCambiarFacultad,
  carrerasDeFacultadElegida,
} from '@/features/academico/facultadCarrera'
import { useProgramas, type FiltrosPrograma } from '@/features/programas/api'
import { FormPrograma } from '@/features/programas/FormPrograma'
import { opcionesResponsables, puedeEditarPrograma } from '@/features/programas/reglas'
import { nombreCompleto } from '@/lib/utils'
import type { Programa } from '@/types/dominio'

/** Bloque 4: programas de temas por carrera (ADMIN gestiona todos; COORDINADOR los propios). */
export default function Programas() {
  const usuario = useUsuario()
  const esCoordinador = usuario.rol === 'COORDINADOR'
  const facultades = useFacultades()
  const carreras = opcionesCarrerasConFacultad(facultades.data)
  const [facultadId, setFacultadId] = useState('')
  const [carreraId, setCarreraId] = useState('')
  const [responsable, setResponsable] = useState('')
  const [mios, setMios] = useState(esCoordinador)
  const [editando, setEditando] = useState<Programa | null | 'nuevo'>(null)

  const [tipoResp, idResp] = responsable.split(':')
  const filtros: FiltrosPrograma = {
    facultadId,
    carreraId,
    responsableDocenteId: tipoResp === 'DOCENTE' ? idResp : undefined,
    responsableUsuarioId: tipoResp === 'COORDINADOR' ? idResp : undefined,
    mios: mios || undefined,
  }
  const query = useProgramas(filtros)
  // las opciones de responsable salen de todos los programas visibles (sin filtros)
  const todos = useProgramas({})
  const responsables = useMemo(() => opcionesResponsables(todos.data ?? []), [todos.data])

  const columnas: ColumnDef<Programa>[] = [
    {
      header: 'Programa',
      accessorKey: 'nombre',
      cell: ({ row }) => (
        <span>
          <span className="block font-medium">{row.original.nombre}</span>
          {row.original.descripcion && (
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {row.original.descripcion}
            </span>
          )}
        </span>
      ),
    },
    { header: 'Carrera', accessorFn: (p) => p.carrera.nombre },
    {
      header: 'Responsable',
      accessorFn: (p) => nombreCompleto(p.responsable),
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2">
          {nombreCompleto(row.original.responsable)}
          <Badge tono={row.original.responsable.tipo === 'DOCENTE' ? 'info' : 'neutral'}>
            {row.original.responsable.tipo === 'DOCENTE' ? 'Docente' : 'Coordinador'}
          </Badge>
        </span>
      ),
    },
    {
      header: 'Temas',
      accessorKey: 'temasRegistrados',
      cell: ({ row }) => {
        const p = row.original
        const lleno = p.temasRegistrados >= p.maxTemas
        return (
          <span className={lleno ? 'font-medium text-destructive' : undefined}>
            {p.temasRegistrados} / {p.maxTemas}
            {lleno && <span className="sr-only"> (cupo completo)</span>}
          </span>
        )
      },
    },
    {
      header: 'Estado',
      accessorKey: 'activo',
      cell: ({ row }) => (
        <Badge tono={row.original.activo ? 'success' : 'muted'}>
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) =>
        puedeEditarPrograma(usuario, row.original) ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditando(row.original)}
              aria-label={`Editar ${row.original.nombre}`}
            >
              <PencilIcon />
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Programas"
        descripcion="Programas de temas por carrera, con su responsable y el máximo de temas que admiten."
        acciones={
          <Button onClick={() => setEditando('nuevo')}>
            <PlusIcon /> Nuevo programa
          </Button>
        }
      />
      <div className="mb-4 empty:hidden">
        <ErrorCatalogo consulta={facultades} />
      </div>
      <ConsultaEstado query={query}>
        {(lista) => (
          <DataTable
            columnas={columnas}
            datos={lista}
            etiqueta="Programas"
            placeholderBusqueda="Buscar por nombre o responsable…"
            filtros={
              <>
                <SelectSimple
                  aria-label="Filtrar por facultad"
                  className="sm:w-64"
                  value={facultadId}
                  onChange={(v) => {
                    setFacultadId(v)
                    setCarreraId(carreraTrasCambiarFacultad(carreras, carreraId, v))
                  }}
                  todos="Todas las facultades"
                  opciones={opcionesFacultades(facultades.data)}
                />
                <SelectSimple
                  aria-label="Filtrar por carrera"
                  className="sm:w-64"
                  value={carreraId}
                  onChange={setCarreraId}
                  todos="Todas las carreras"
                  opciones={carrerasDeFacultadElegida(carreras, facultadId)}
                />
                <SelectSimple
                  aria-label="Filtrar por responsable"
                  className="sm:w-60"
                  value={responsable}
                  onChange={setResponsable}
                  todos="Todos los responsables"
                  opciones={responsables}
                />
                {esCoordinador && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="programas-mios"
                      checked={mios}
                      onCheckedChange={(v) => setMios(v === true)}
                    />
                    <Label htmlFor="programas-mios">Solo mis programas</Label>
                  </div>
                )}
              </>
            }
          />
        )}
      </ConsultaEstado>
      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando === 'nuevo' ? 'Nuevo programa' : 'Editar programa'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormPrograma
              programa={editando === 'nuevo' ? null : editando}
              onClose={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
