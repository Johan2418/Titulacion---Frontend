import { UploadIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Botón visible para elegir un archivo; el input nativo queda oculto pero accesible por teclado. */
export function SelectorArchivo({
  id,
  accept,
  archivo,
  onChange,
  etiqueta = 'Elegir archivo',
}: {
  id: string
  accept: string
  archivo: File | null
  onChange: (archivo: File | null) => void
  etiqueta?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        id={id}
        type="file"
        accept={accept}
        className="peer sr-only"
        onChange={(evento) => onChange(evento.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
        )}
      >
        <UploadIcon /> {etiqueta}
      </label>
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {archivo?.name ?? 'Ningún archivo seleccionado'}
      </span>
    </div>
  )
}
