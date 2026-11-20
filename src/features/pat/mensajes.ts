import { ApiError } from '@/api/client'
import { mensajeError } from '@/lib/errores'

/**
 * Nombre visible de cada clave de `pendientes` (contrato PAT automático, §3). Las claves llegan
 * con el nombre del backend: `correo_personal`, `extension_pat`, etc.
 */
export const ETIQUETAS_PENDIENTE: Record<string, string> = {
  fecha_nacimiento: 'Fecha de nacimiento',
  paralelo: 'Paralelo',
  sexo: 'Sexo',
  nacionalidad: 'Nacionalidad',
  estado_civil: 'Estado civil',
  provincia: 'Provincia',
  canton: 'Cantón',
  parroquia: 'Parroquia',
  celular: 'Celular',
  tiene_discapacidad: '¿Tiene discapacidad?',
  correo_personal: 'Correo personal (o marcar «No aplica»)',
  telefono_convencional: 'Teléfono convencional (o marcar «No aplica»)',
  certificado_votacion: 'Certificado de votación (o marcar «No aplica»)',
  discapacidades: 'Tipo de discapacidad',
  grado_discapacidad: 'Grado de discapacidad',
  otra_discapacidad: 'Otra discapacidad',
  problematica: 'Problemática',
  confirma_problematica: 'Confirmación de la problemática',
  articulaciones: 'Articulación',
  articulaciones_excluyentes: 'Articulación («Ninguna» no se combina con otras)',
  tutor_propuesto_id:
    'Tutor (la postulación no tiene tutores propuestos; contacta al administrador)',
  extension_pat: 'Sede o extensión del período (debe configurarla un administrador)',
}

const ARTICULACION: Record<string, string> = {
  INVESTIGACION: 'Investigación',
  VINCULACION: 'Vinculación',
  DOCENCIA: 'Docencia',
  NINGUNA: 'Ninguna',
}
export const etiquetaArticulacion = (a: string) => ARTICULACION[a] ?? a

/** Pendientes que el estudiante no puede resolver en el formulario. */
export const PENDIENTES_ADMIN = ['extension_pat', 'tutor_propuesto_id']

export const etiquetaPendiente = (clave: string) =>
  ETIQUETAS_PENDIENTE[clave] ?? clave.replace(/_/g, ' ')

export const describirPendientes = (pendientes: string[]) =>
  pendientes.map(etiquetaPendiente).join(', ')

/** Clave del backend (`estado_civil`) → nombre del campo en el formulario (`estadoCivil`). */
export const campoDePendiente = (clave: string) =>
  clave.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())

/** Traduce mensajes de validación de class-validator (en inglés) que nombran un campo. */
const VALIDACIONES: [RegExp, (campo: string, n?: string) => string][] = [
  [/^(\w+) must be an email$/, (c) => `${c}: ingresa un correo válido.`],
  [
    /^(\w+) must be shorter than or equal to (\d+) characters$/,
    (c, n) => `${c}: máximo ${n} caracteres.`,
  ],
  [/^(\w+) must be a UUID$/, (c) => `${c}: valor no válido.`],
  [/^property (\w+) should not exist$/, (c) => `${c}: campo no admitido.`],
]

function traducirParte(parte: string) {
  for (const [re, f] of VALIDACIONES) {
    const m = re.exec(parte.trim())
    if (m) return f(etiquetaPendiente(m[1]), m[2])
  }
  return parte.trim().replace(/\b(fecha_nacimiento)\b/, etiquetaPendiente('fecha_nacimiento'))
}

/** Mensaje en español para errores del flujo PAT (400 con `pendientes`, validaciones, 409). */
export function mensajeErrorPat(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.pendientes?.length)
      return `Completa los datos obligatorios antes de generar el PAT. Falta: ${describirPendientes(
        error.pendientes,
      )}.`
    if (error.status === 400 && error.message)
      return error.message
        .split('. ')
        .map(traducirParte)
        .map((t) => (/[.!?]$/.test(t) ? t : `${t}.`))
        .join(' ')
  }
  return mensajeError(error)
}
