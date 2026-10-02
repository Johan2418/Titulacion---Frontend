import { useId, type ReactNode } from 'react'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

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

/** Select simple a partir de una lista de opciones. */
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
  return (
    <Select
      value={todos && !value ? TODOS : value || undefined}
      onValueChange={(v) => onChange(v === TODOS ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className} {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {todos && <SelectItem value={TODOS}>{todos}</SelectItem>}
        {opciones.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
