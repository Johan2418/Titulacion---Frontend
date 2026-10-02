import { useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Vacio } from './Estados'

interface Props<T> {
  columnas: ColumnDef<T, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any
  datos: T[]
  busqueda?: boolean
  placeholderBusqueda?: string
  filtros?: ReactNode
  tamanoPagina?: number
  vacio?: ReactNode
  etiqueta?: string
}

export function DataTable<T>({
  columnas,
  datos,
  busqueda = true,
  placeholderBusqueda = 'Buscar…',
  filtros,
  tamanoPagina = 10,
  vacio,
  etiqueta,
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const tabla = useReactTable({
    data: datos,
    columns: columnas,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: tamanoPagina } },
  })

  const filas = tabla.getRowModel().rows
  const total = tabla.getFilteredRowModel().rows.length
  const { pageIndex, pageSize } = tabla.getState().pagination

  return (
    <div className="space-y-3">
      {(busqueda || filtros) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {busqueda && (
            <div className="relative sm:w-72">
              <SearchIcon
                className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={placeholderBusqueda}
                aria-label={placeholderBusqueda}
                className="pl-8"
              />
            </div>
          )}
          {filtros}
        </div>
      )}
      <div className="rounded-lg border bg-card">
        <Table aria-label={etiqueta}>
          <TableHeader>
            {tabla.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => {
                  const ordenable =
                    h.column.getCanSort() && h.column.columnDef.enableSorting !== false
                  const dir = h.column.getIsSorted()
                  return (
                    <TableHead
                      key={h.id}
                      aria-sort={
                        dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined
                      }
                    >
                      {h.isPlaceholder ? null : ordenable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === 'asc' ? (
                            <ArrowUpIcon className="size-3.5" aria-hidden />
                          ) : dir === 'desc' ? (
                            <ArrowDownIcon className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 opacity-40" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filas.length ? (
              filas.map((fila) => (
                <TableRow key={fila.id}>
                  {fila.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnas.length} className="p-4">
                  {vacio ?? <Vacio />}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {pageIndex * pageSize + 1}–{Math.min(total, (pageIndex + 1) * pageSize)} de {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => tabla.previousPage()}
              disabled={!tabla.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tabla.nextPage()}
              disabled={!tabla.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
