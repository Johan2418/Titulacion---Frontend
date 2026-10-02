import { useId, useRef, useState } from 'react'
import { FileIcon, UploadCloudIcon, XIcon } from 'lucide-react'
import { validarArchivo, type ReglasArchivo } from '@/lib/archivos'
import { cn, formatoBytes } from '@/lib/utils'
import { Button } from './ui/button'

/** Selector de archivos con arrastrar/soltar y validación previa (RNF-09, RNF-14). */
export function FileUpload({
  reglas,
  archivo,
  onChange,
  etiqueta = 'Seleccione o arrastre un archivo',
  error,
}: {
  reglas: ReglasArchivo
  archivo: File | null
  onChange: (archivo: File | null) => void
  etiqueta?: string
  error?: string | null
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const mensaje = error ?? errorLocal

  const aceptar = (f: File | null) => {
    if (!f) return
    const e = validarArchivo(f, reglas)
    setErrorLocal(e)
    onChange(e ? null : f)
  }

  const extensiones = Object.keys(reglas.tipos)
  return (
    <div className="space-y-2">
      {archivo ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <FileIcon className="size-5 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{archivo.name}</p>
            <p className="text-xs text-muted-foreground">{formatoBytes(archivo.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            aria-label="Quitar archivo"
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastrando(false)
            aceptar(e.dataTransfer.files?.[0] ?? null)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring',
            arrastrando && 'border-primary bg-primary/5',
            mensaje && 'border-destructive',
          )}
        >
          <UploadCloudIcon className="size-8 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">{etiqueta}</span>
          <span className="text-xs text-muted-foreground">
            Formatos: {extensiones.map((e) => e.toUpperCase()).join(', ')} · Máximo{' '}
            {formatoBytes(reglas.maxBytes)}
          </span>
          <input
            ref={inputRef}
            id={id}
            type="file"
            className="sr-only"
            accept={extensiones.map((e) => `.${e}`).join(',')}
            aria-invalid={!!mensaje}
            aria-describedby={mensaje ? `${id}-error` : undefined}
            onChange={(e) => {
              aceptar(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
        </label>
      )}
      {mensaje && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {mensaje}
        </p>
      )}
    </div>
  )
}
