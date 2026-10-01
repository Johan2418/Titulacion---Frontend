import { useState } from 'react'
import { UploadIcon } from 'lucide-react'
import { FileUpload } from '@/components/FileUpload'
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
import { Progress } from '@/components/ui/progress'
import { TIPOS_IMPORTACION } from '@/lib/archivos'
import { ESTADO_IMPORTACION } from '@/lib/estados'
import { formatFechaHora } from '@/lib/fechas'
import type { LoteImportacion, TipoImportacion } from '@/types/dominio'
import { useLotes } from './api'

/** Importación masiva: se encola y se procesa en segundo plano (RNF-10). */
export function ImportarArchivo({
  abierto,
  onClose,
  titulo,
  tipo,
  periodoId,
  columnas,
  importar,
}: {
  abierto: boolean
  onClose: () => void
  titulo: string
  tipo: TipoImportacion
  periodoId?: string
  columnas: string
  importar: (archivo: File) => Promise<LoteImportacion>
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const lotes = useLotes({ tipo, periodoId })

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Archivo CSV con encabezados: <code className="text-xs">{columnas}</code>
          </DialogDescription>
        </DialogHeader>
        <FileUpload
          reglas={{ tipos: TIPOS_IMPORTACION, maxBytes: 5 * 1024 * 1024 }}
          archivo={archivo}
          onChange={setArchivo}
        />
        <DialogFooter>
          <Button
            disabled={!archivo || enviando}
            onClick={async () => {
              if (!archivo) return
              setEnviando(true)
              try {
                await importar(archivo)
                setArchivo(null)
              } catch {
                // notificado por la mutación
              } finally {
                setEnviando(false)
              }
            }}
          >
            <UploadIcon /> Importar
          </Button>
        </DialogFooter>
        <div className="space-y-2">
          <p className="text-sm font-medium">Importaciones recientes</p>
          {(lotes.data ?? []).slice(0, 5).map((l) => (
            <div key={l.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{l.nombreArchivo}</span>
                <StatusBadge mapa={ESTADO_IMPORTACION} valor={l.estado} />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatFechaHora(l.fechaInicio)} · {l.totalFilas} filas · {l.filasOk} correctas ·{' '}
                {l.filasError} con error
              </p>
              {l.estado === 'EN_PROCESO' && (
                <Progress value={60} className="mt-2" aria-label="Procesando importación" />
              )}
              {l.estado !== 'EN_PROCESO' && !!l.errores?.length && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-destructive">
                    Ver errores ({l.errores.length})
                  </summary>
                  <ul className="mt-1 max-h-32 overflow-y-auto text-xs">
                    {l.errores.map((e, i) => (
                      <li key={i}>
                        Fila {e.fila}: {e.mensaje}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
          {!lotes.data?.length && (
            <p className="text-xs text-muted-foreground">Sin importaciones.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
