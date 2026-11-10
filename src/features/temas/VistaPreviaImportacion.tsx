import { CheckIcon, UserCheckIcon } from 'lucide-react'
import { SelectSimple } from '@/components/Campo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { resolucionesCompletas, type EstadoFilaTema, type ImportacionTemas } from './importacion'

const ESTADO_FILA: Record<
  EstadoFilaTema,
  { label: string; tono: 'success' | 'warning' | 'muted' | 'danger' }
> = {
  LISTA: { label: 'Lista', tono: 'success' },
  PENDIENTE_DOCENTE: { label: 'Docente pendiente', tono: 'warning' },
  DUPLICADA: { label: 'Duplicada (se omite)', tono: 'muted' },
  ERROR: { label: 'Error', tono: 'danger' },
}

type Opcion = { value: string; label: string }

/** Preview of the topics workbook: linked teacher or selector, topic and row messages. */
export function VistaPreviaImportacion({
  preview,
  docentes,
  seleccion,
  onSeleccionar,
  onAplicar,
  onConfirmar,
  procesando,
}: {
  preview: ImportacionTemas
  /** Active teachers of the career, offered when a pending row has no candidates. */
  docentes: Opcion[]
  seleccion: Record<string, string>
  onSeleccionar: (nombreExcel: string, docenteId: string) => void
  onAplicar: () => void
  onConfirmar: () => void
  procesando: boolean
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {preview.totalFilas} fila(s): {preview.listas} lista(s), {preview.pendientes} con docente
        pendiente, {preview.duplicadas} duplicada(s), {preview.conErrores} con errores.
      </p>
      <div className="max-h-96 overflow-y-auto rounded-md border">
        <Table aria-label="Vista previa de la importación de temas">
          <TableHeader>
            <TableRow>
              <TableHead>Nro.</TableHead>
              <TableHead>Docente</TableHead>
              <TableHead>Tema</TableHead>
              <TableHead>Estado y avisos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.filas.map((f) => (
              <TableRow key={f.fila}>
                <TableCell>{f.nro ?? f.fila}</TableCell>
                <TableCell className="min-w-56">
                  {f.docente ? (
                    `${f.docente.nombres} ${f.docente.apellidos}`
                  ) : f.estado === 'PENDIENTE_DOCENTE' ? (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">{f.docenteExcel}</span>
                      <SelectSimple
                        aria-label={`Docente para «${f.docenteExcel}»`}
                        value={seleccion[f.docenteExcel] ?? ''}
                        onChange={(v) => onSeleccionar(f.docenteExcel, v)}
                        opciones={
                          f.candidatos.length
                            ? f.candidatos.map((c) => ({
                                value: c.id,
                                label: `${c.nombres} ${c.apellidos}`,
                              }))
                            : docentes
                        }
                      />
                    </div>
                  ) : (
                    f.docenteExcel
                  )}
                </TableCell>
                <TableCell>{f.titulo}</TableCell>
                <TableCell className="space-y-1">
                  <Badge tono={ESTADO_FILA[f.estado].tono}>{ESTADO_FILA[f.estado].label}</Badge>
                  {f.errores.map((m, i) => (
                    <p key={`e${i}`} className="text-xs text-destructive">
                      {m}
                    </p>
                  ))}
                  {f.advertencias.map((m, i) => (
                    <p key={`a${i}`} className="text-xs text-muted-foreground">
                      {m}
                    </p>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={
            procesando || preview.conErrores > 0 || !resolucionesCompletas(preview.filas, seleccion)
          }
          onClick={onAplicar}
        >
          <UserCheckIcon /> Aplicar docentes
        </Button>
        <Button
          type="button"
          disabled={procesando || !preview.puedeConfirmar}
          onClick={onConfirmar}
        >
          <CheckIcon /> Confirmar importación
        </Button>
      </div>
    </div>
  )
}
