import { z } from 'zod'

/** El servidor limita las observaciones de revisión a 5000 caracteres. */
export const MAX_OBSERVACIONES_PAT = 5000

/** RN-12: observar o rechazar exige observaciones. */
export const revisionSchema = z
  .object({
    resultado: z.enum(['APROBADO', 'OBSERVADO', 'RECHAZADO'], {
      message: 'Seleccione el resultado.',
    }),
    observaciones: z
      .string()
      .trim()
      .max(MAX_OBSERVACIONES_PAT, `Máximo ${MAX_OBSERVACIONES_PAT} caracteres.`)
      .optional(),
  })
  .refine((d) => d.resultado === 'APROBADO' || !!d.observaciones?.trim(), {
    path: ['observaciones'],
    message: 'Las observaciones son obligatorias al observar o rechazar el PAT (RN-12).',
  })

export type RevisionForm = z.infer<typeof revisionSchema>

export const DISCAPACIDADES_PAT = [
  'VISUAL',
  'FISICA',
  'AUDITIVA',
  'INTELECTUAL',
  'PSICOLOGICA',
  'LENGUAJE',
  'OTRA',
] as const
export const ARTICULACIONES_PAT = ['INVESTIGACION', 'VINCULACION', 'DOCENCIA', 'NINGUNA'] as const

const texto = (max: number) => z.string().max(max, `Máximo ${max} caracteres.`)
const hoyLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Datos que el estudiante aporta en el PAT. Todo es opcional al guardar (se puede avanzar por
 * partes); los obligatorios los decide el backend con `pendientes`.
 */
export const datosFaltantesSchema = z
  .object({
    fechaNacimiento: z
      .string()
      .refine((v) => !v || v <= hoyLocal(), 'La fecha de nacimiento no puede estar en el futuro.'),
    paralelo: texto(20),
    sexo: texto(40),
    nacionalidad: texto(80),
    estadoCivil: texto(40),
    provincia: texto(100),
    canton: texto(100),
    parroquia: texto(100),
    celular: texto(30),
    correoPersonal: texto(150),
    correoPersonalNoAplica: z.boolean(),
    telefonoConvencional: texto(30),
    telefonoConvencionalNoAplica: z.boolean(),
    certificadoVotacion: texto(100),
    certificadoVotacionNoAplica: z.boolean(),
    tieneDiscapacidad: z.enum(['', 'true', 'false']),
    discapacidades: z.array(z.enum(DISCAPACIDADES_PAT)),
    gradoDiscapacidad: texto(200),
    otraDiscapacidad: texto(200),
    problematica: texto(5000),
    confirmaProblematica: z.boolean(),
    articulaciones: z.array(z.enum(ARTICULACIONES_PAT)),
  })
  .refine(
    (d) =>
      d.correoPersonalNoAplica ||
      !d.correoPersonal.trim() ||
      z.email().safeParse(d.correoPersonal.trim()).success,
    { path: ['correoPersonal'], message: 'Ingresa un correo válido.' },
  )

export type DatosFaltantesForm = z.infer<typeof datosFaltantesSchema>
