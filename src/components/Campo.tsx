import { useId, useState, type ReactNode } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from './ui/label'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command'

/** Envoltorio accesible para campos de formulario: etiqueta, ayuda y error. */
export function Campo({
  etiqueta,
  error,
  ayuda,
  requerido,
  children,
  className,
}: {
  etiqueta: string
  error?: string
  ayuda?: ReactNode
  requerido?: boolean
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => ReactNode
  className?: string
}) {
  const id = useId()
  const descId = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined
  return (
    <div className={className ?? 'space-y-1.5'}>
      <Label htmlFor={id}>
        {etiqueta}
        {requerido && (
          <span className="text-destructive" aria-hidden>
            {' '}
            *
          </span>
        )}
      </Label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': descId })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}

export const TODOS = '__todos__'

/** Minúsculas y sin diacríticos: "ingenieria" coincide con "Ingeniería". */
export function normalizarBusqueda(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Select con búsqueda (combobox) a partir de una lista de opciones. */
export function SelectSimple({
  id,
  value,
  onChange,
  opciones,
  placeholder = 'Seleccione…',
  todos,
  disabled,
  className,
  ...aria
}: {
  id?: string
  value: string | undefined
  onChange: (v: string) => void
  opciones: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
  /** Si se indica, agrega una opción para "todos" con esta etiqueta y devuelve '' */
  todos?: string
  disabled?: boolean
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-label'?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const actual = todos && !value ? TODOS : value || undefined
  const items: { value: string; label: string; disabled?: boolean }[] = [
    ...(todos ? [{ value: TODOS, label: todos }] : []),
    ...opciones,
  ]
  const seleccionada = items.find((o) => o.value === actual)

  const elegir = (v: string) => {
    onChange(v === TODOS ? '' : v)
    setAbierto(false)
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={abierto}
          aria-haspopup="listbox"
          disabled={disabled}
          data-placeholder={seleccionada ? undefined : ''}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground aria-invalid:border-destructive',
            className,
          )}
          {...aria}
        >
          <span className="truncate">{seleccionada?.label ?? placeholder}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[8rem]">
        <Command
          label="Buscar"
          filter={(_valor, busqueda, keywords) =>
            normalizarBusqueda(keywords?.[0] ?? '').includes(normalizarBusqueda(busqueda)) ? 1 : 0
          }
        >
          <CommandInput placeholder="Buscar…" />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            {items.map((o) => (
              <CommandItem
                key={o.value}
                value={o.value}
                keywords={[o.label]}
                disabled={o.disabled}
                onSelect={() => elegir(o.value)}
              >
                <span className="flex-1 truncate">{o.label}</span>
                {o.value === actual && <CheckIcon className="size-4" aria-hidden />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
