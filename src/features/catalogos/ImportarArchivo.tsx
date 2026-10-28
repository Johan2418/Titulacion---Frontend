import { useState, type ReactNode } from 'react'
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
import { nombreCompleto } from '@/lib/utils'
import type { LoteImportacion, TipoImportacion } from '@/types/dominio'
import { useLotes } from './api'

const MAX_ERRORES_VISIBLES = 20

/** Lista compacta de errores por fila de una importación rechazada. */
function ErroresImportacion({ errores }: { errores: { fila: number; mensaje: string }[] }) {
  const visibles = errores.slice(0, MAX_ERRORES_VISIBLES)
  const restantes = errores.length - visibles.length
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm"
    >
      <p className="font-medium text-destructive">
        El archivo no se importó: se encontraron {errores.length}{' '}
        {errores.length === 1 ? 'error' : 'errores'}. Corrija el archivo y vuelva a intentarlo.
      </p>
      <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto text-xs">
        {visibles.map((e, i) => (
          <li key={i}>
            Fila {e.fila}: {e.mensaje}
          </li>
        ))}
      </ul>
      {restantes > 0 && <p className="mt-1 text-xs text-muted-foreground">y {restantes} más</p>}
    </div>
  )
}

/** Importación masiva: se encola y se procesa en segundo plano (RNF-10). */
export function ImportarArchivo({
  abierto,
  onClose,
  titulo,
  tipo,
  periodoId,
  columnas,
  descripcion,
  tipos = TIPOS_IMPORTACION,
  importar,
}: {
  abierto: boolean
  onClose: () => void
  titulo: string
  tipo: TipoImportacion
  periodoId?: string
  columnas?: string
  /** Reemplaza la descripción por defecto (CSV con `columnas`). */
  descripcion?: ReactNode
  /** Formatos aceptados; por defecto CSV y XLSX. */
  tipos?: Record<string, string[]>
  importar: (archivo: File) => Promise<LoteImportacion>
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<LoteImportacion | null>(null)
  const lotes = useLotes({ tipo, periodoId })

  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        if (o) return
        setResultado(null)
        onClose()
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {descripcion ?? (
              <>
                Archivo CSV con encabezados: <code className="text-xs">{columnas}</code>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <FileUpload
          reglas={{ tipos, maxBytes: 5 * 1024 * 1024 }}
          archivo={archivo}
          onChange={(f) => {
            setArchivo(f)
            if (f) setResultado(null)
          }}
        />
        {resultado?.estado === 'FALLIDO' && !!resultado.errores?.length && (
          <ErroresImportacion errores={resultado.errores} />
        )}
        <DialogFooter>
          <Button
            disabled={!archivo || enviando}
            onClick={async () => {
              if (!archivo) return
              setEnviando(true)
              setResultado(null)
              try {
                setResultado(await importar(archivo))
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
                {l.solicitadaPor && ` · ${nombreCompleto(l.solicitadaPor)}`}
                {l.expirada && ' · vista previa vencida'}
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
