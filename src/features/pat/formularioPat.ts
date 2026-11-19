import type { ResumenPatB } from './api'
import { ARTICULACIONES_PAT, DISCAPACIDADES_PAT, type DatosFaltantesForm } from './schemas'

export const CAMPOS_TEXTO_PERSONALES = [
  'paralelo',
  'sexo',
  'nacionalidad',
  'estadoCivil',
  'provincia',
  'canton',
  'parroquia',
  'celular',
] as const
export const CAMPOS_NO_APLICA = [
  'correoPersonal',
  'telefonoConvencional',
  'certificadoVotacion',
] as const
const CAMPOS_CONTENIDO = ['problematica', 'confirmaProblematica', 'articulaciones'] as const

const cadena = (v: unknown) => (typeof v === 'string' ? v : '')
const enLista = <T extends string>(v: unknown, permitidos: readonly T[]): T[] =>
  Array.isArray(v) ? v.filter((x): x is T => permitidos.includes(x as T)) : []

/** Valores iniciales del paso «Datos faltantes» a partir de `editables` del resumen. */
export function valoresIniciales(resumen: ResumenPatB): DatosFaltantesForm {
  const p = resumen.editables.personal
  const c = resumen.editables.contenido
  return {
    fechaNacimiento: cadena(p.fechaNacimiento),
    paralelo: cadena(p.paralelo),
    sexo: cadena(p.sexo),
    nacionalidad: cadena(p.nacionalidad),
    estadoCivil: cadena(p.estadoCivil),
    provincia: cadena(p.provincia),
    canton: cadena(p.canton),
    parroquia: cadena(p.parroquia),
    celular: cadena(p.celular),
    correoPersonal: cadena(p.correoPersonal),
    correoPersonalNoAplica: p.correoPersonalNoAplica === true,
    telefonoConvencional: cadena(p.telefonoConvencional),
    telefonoConvencionalNoAplica: p.telefonoConvencionalNoAplica === true,
    certificadoVotacion: cadena(p.certificadoVotacion),
    certificadoVotacionNoAplica: p.certificadoVotacionNoAplica === true,
    tieneDiscapacidad:
      typeof p.tieneDiscapacidad === 'boolean' ? (String(p.tieneDiscapacidad) as 'true') : '',
    discapacidades: enLista(p.discapacidades, DISCAPACIDADES_PAT),
    gradoDiscapacidad: cadena(p.gradoDiscapacidad),
    otraDiscapacidad: cadena(p.otraDiscapacidad),
    problematica: c.problematica ?? '',
    confirmaProblematica: c.confirmaProblematica === true,
    articulaciones: enLista(c.articulaciones, ARTICULACIONES_PAT),
  }
}

const textoONulo = (v: string) => (v.trim() ? v.trim() : null)

/**
 * Cuerpo de `PATCH /estudiantes/me/datos-pat` (camelCase; el cliente lo pasa a snake_case).
 * Vacío → null (la fecha vacía se omite: el backend la validaría como fecha), «No aplica» → null,
 * y sin discapacidad no se envían sus detalles.
 */
export function cuerpoPersonal(d: DatosFaltantesForm): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {}
  if (d.fechaNacimiento) cuerpo.fechaNacimiento = d.fechaNacimiento
  for (const k of CAMPOS_TEXTO_PERSONALES) cuerpo[k] = textoONulo(d[k])
  for (const k of CAMPOS_NO_APLICA) {
    const noAplica = d[`${k}NoAplica` as const]
    cuerpo[`${k}NoAplica`] = noAplica
    cuerpo[k] = noAplica ? null : textoONulo(d[k])
  }
  if (d.tieneDiscapacidad) {
    const tiene = d.tieneDiscapacidad === 'true'
    cuerpo.tieneDiscapacidad = tiene
    if (tiene) {
      cuerpo.discapacidades = d.discapacidades
      cuerpo.gradoDiscapacidad = textoONulo(d.gradoDiscapacidad)
      cuerpo.otraDiscapacidad = d.discapacidades.includes('OTRA')
        ? textoONulo(d.otraDiscapacidad)
        : null
    }
  }
  return cuerpo
}

export const cuerpoContenido = (d: DatosFaltantesForm) => ({
  problematica: d.problematica,
  confirmaProblematica: d.confirmaProblematica,
  articulaciones: d.articulaciones,
})

/** Qué partes del formulario cambiaron (para no enviar PATCH innecesarios). */
export function partesModificadas(sucios: Partial<Record<keyof DatosFaltantesForm, unknown>>) {
  const claves = Object.keys(sucios) as (keyof DatosFaltantesForm)[]
  const contenido = claves.some((k) => (CAMPOS_CONTENIDO as readonly string[]).includes(k))
  const personal = claves.some((k) => !(CAMPOS_CONTENIDO as readonly string[]).includes(k))
  return { personal, contenido }
}
