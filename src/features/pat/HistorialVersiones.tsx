import { DownloadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Vacio } from '@/components/Estados'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_PAT } from '@/lib/estados'
import { mensajeError } from '@/lib/errores'
import { formatoBytes, nombreCompleto } from '@/lib/utils'
import type { DocumentoPat } from '@/types/dominio'
import { descargarDocumentoPat } from './api'

/** Línea de tiempo de versiones del PAT con su revisión (RF-14, RF-32). */
export function HistorialVersionesPat({ documentos }: { documentos: DocumentoPat[] }) {
  if (!documentos.length) return <Vacio titulo="Aún no hay versiones cargadas" />
  return (
    <ol className="relative space-y-4 border-l pl-6">
      {documentos.map((d) => (
        <li key={d.id} className="relative">
          <span
            className="absolute top-1.5 -left-[1.95rem] size-3 rounded-full border-2 border-card bg-primary"
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">Versión {d.version}</p>
            <StatusBadge mapa={ESTADO_PAT} valor={d.estado} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => descargarDocumentoPat(d.id).catch((e) => toast.error(mensajeError(e)))}
              aria-label={`Descargar versión ${d.version}`}
            >
              <DownloadIcon /> {d.nombreArchivo}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {d.formato} · {formatoBytes(d.tamanoBytes)} · cargado el {formatFechaHora(d.fechaCarga)}{' '}
            por {nombreCompleto(d.cargadoPor)}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground" title={d.hashSha256}>
            SHA-256: {d.hashSha256}
          </p>
          {d.revision && (
            <div className="mt-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                Revisado por {nombreCompleto(d.revision.revisor)} el{' '}
                {formatFechaHora(d.revision.fechaRevision)}
              </p>
              {d.revision.observaciones && (
                <p className="mt-1 whitespace-pre-line">{d.revision.observaciones}</p>
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
