import { useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon, UploadIcon } from 'lucide-react'
import { useUsuario } from '@/auth/AuthProvider'
import { DataTable } from '@/components/DataTable'
import { ConsultaEstado } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  opcionesCarrerasConFacultad,
  opcionesFacultades,
  useFacultades,
} from '@/features/academico/api'
import { ErrorCatalogo } from '@/features/academico/ErrorCatalogo'
import { useLineas } from '@/features/catalogos/api'
import { AccionesTema } from '@/features/temas/AccionesTema'
import { useTemas } from '@/features/temas/api'
import {
  FILTROS_BANCO_INICIALES,
  FiltrosBancoTemas,
  filtrosTemaDesdeBanco,
  type FiltrosBanco,
} from '@/features/temas/FiltrosBancoTemas'
import { FormTema } from '@/features/temas/FormTema'
import { TemasPorPrograma } from '@/features/temas/TemasPorPrograma'
import { useProgramas } from '@/features/programas/api'
import { ImportarTemas } from '@/features/temas/ImportarTemas'
import { etiquetaTipoTema } from '@/features/temas/integrantes'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { ESTADO_TEMA } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { Tema } from '@/types/dominio'

/** RF-20 / RF-21: banco de temas por carrera, común a todos los períodos. */
export default function Temas() {
  const usuario = useUsuario()
  // bloque 4: el COORDINADOR registra, edita y publica solo temas de sus programas
  const esAdmin = usuario.rol === 'ADMIN'
  const programas = useProgramas({})
  const misProgramas = useProgramas({ mios: true }, !esAdmin)
  const propios = new Set((misProgramas.data ?? []).map((p) => p.id))
  const gestionable = (t: Tema) => esAdmin || (!!t.programaId && propios.has(t.programaId))
  const [agrupar, setAgrupar] = useState(false)
  const [filtros, setFiltros] = useState<FiltrosBanco>(FILTROS_BANCO_INICIALES)
  const lineas = useLineas()
  const facultades = useFacultades()
  const query = useTemas(filtrosTemaDesdeBanco(filtros))
  const { periodo } = usePeriodo()
  const [editando, setEditando] = useState<Tema | null | 'nuevo'>(null)
  const [importando, setImportando] = useState(false)

  const columnas: ColumnDef<Tema>[] = [
    {
      header: 'Tema',
      accessorKey: 'titulo',
      cell: ({ row }) =>
        esAdmin ? (
          <Link to={`/admin/temas/${row.original.id}`} className="font-medium hover:underline">
            {row.original.titulo}
          </Link>
        ) : (
          <span className="font-medium">{row.original.titulo}</span>
        ),
    },
    {
      header: 'Programa',
      accessorFn: (t) => t.programa?.nombre ?? '',
      cell: ({ row }) =>
        row.original.programa ? (
          <span className="flex flex-col items-start gap-1">
            {row.original.programa.nombre}
            {row.original.categoria && <Badge tono="neutral">{row.original.categoria}</Badge>}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { header: 'Carrera', accessorFn: (t) => t.carrera.nombre },
    { header: 'Línea', accessorFn: (t) => t.linea.nombre },
    { header: 'Proponente', accessorFn: (t) => nombreCompleto(t.docenteProponente) },
    { header: 'Tipo', accessorFn: (t) => etiquetaTipoTema(t.tipo, periodo?.maxIntegrantesDefault) },
    { header: 'Postul. abiertas', accessorKey: 'postulacionesAbiertas' },
    {
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ row }) => <StatusBadge mapa={ESTADO_TEMA} valor={row.original.estado} />,
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) =>
        gestionable(row.original) ? (
          <div className="flex items-center justify-end gap-1">
            <AccionesTema tema={row.original} soloPublicar={!esAdmin} />
            {row.original.estado !== 'ASIGNADO' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditando(row.original)}
                aria-label={`Editar ${row.original.titulo}`}
              >
                <PencilIcon />
              </Button>
            )}
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Banco de temas"
        descripcion="Temas por carrera, disponibles en todos los períodos mientras no tengan una asignación vigente."
        acciones={
          <>
            {esAdmin && (
              <Button variant="outline" onClick={() => setImportando(true)}>
                <UploadIcon /> Importar temas
              </Button>
            )}
            <Button onClick={() => setEditando('nuevo')}>
              <PlusIcon /> Registrar tema
            </Button>
          </>
        }
      />
      <div className="mb-4 empty:hidden">
        <ErrorCatalogo consulta={facultades} />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <Checkbox
          id="banco-agrupar"
          checked={agrupar}
          onCheckedChange={(v) => setAgrupar(v === true)}
        />
        <Label htmlFor="banco-agrupar">Agrupar por programa</Label>
      </div>
      <ConsultaEstado query={query}>
        {(l) =>
          agrupar ? (
            <TemasPorPrograma temas={l} />
          ) : (
            <DataTable
              columnas={columnas}
              datos={l}
              etiqueta="Temas"
              placeholderBusqueda="Buscar por título o docente…"
              filtros={
                <FiltrosBancoTemas
                  valores={filtros}
                  onChange={setFiltros}
                  facultades={opcionesFacultades(facultades.data)}
                  carreras={opcionesCarrerasConFacultad(facultades.data)}
                  lineas={(lineas.data ?? []).map((x) => ({ value: x.id, label: x.nombre }))}
                  programas={(programas.data ?? []).map((p) => ({
                    value: p.id,
                    label: `${p.nombre} — ${p.carrera.nombre}`,
                  }))}
                />
              }
            />
          )
        }
      </ConsultaEstado>
      <Dialog open={editando !== null} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando === 'nuevo' ? 'Registrar tema' : 'Editar tema'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormTema
              tema={editando === 'nuevo' ? null : editando}
              onClose={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      {esAdmin && <ImportarTemas abierto={importando} onClose={() => setImportando(false)} />}
    </>
  )
}
