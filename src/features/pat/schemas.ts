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
