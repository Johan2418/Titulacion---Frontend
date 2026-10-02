import { env } from './env'

/** RNF-30: todas las fechas se muestran en la hora local de la institución. */
const fmtFecha = new Intl.DateTimeFormat('es-EC', {
  timeZone: env.timezone,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const fmtFechaHora = new Intl.DateTimeFormat('es-EC', {
  timeZone: env.timezone,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatFecha(iso?: string | null) {
  return iso ? fmtFecha.format(new Date(iso)) : '—'
}

export function formatFechaHora(iso?: string | null) {
  return iso ? fmtFechaHora.format(new Date(iso)) : '—'
}

/** Convierte un ISO a valor para <input type="datetime-local"> en la zona institucional. */
export function isoToInputLocal(iso?: string | null) {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** Offset (minutos) de la zona institucional para un instante dado. */
function offsetMinutos(fecha: Date) {
  const local = new Date(fecha.toLocaleString('en-US', { timeZone: env.timezone }))
  const utc = new Date(fecha.toLocaleString('en-US', { timeZone: 'UTC' }))
  return (local.getTime() - utc.getTime()) / 60000
}

/** Interpreta un valor de <input type="datetime-local"> como hora institucional y devuelve ISO UTC. */
export function inputLocalToIso(valor: string) {
  if (!valor) return ''
  const comoUtc = new Date(`${valor}:00Z`)
  return new Date(comoUtc.getTime() - offsetMinutos(comoUtc) * 60000).toISOString()
}

export function dentroDeRango(inicio: string, fin: string, ahora = new Date()) {
  return ahora >= new Date(inicio) && ahora <= new Date(fin)
}
