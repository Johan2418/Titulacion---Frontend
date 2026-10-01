import { z } from 'zod'

/** RN-12: observar o rechazar exige observaciones. */
export const revisionSchema = z
  .object({
    resultado: z.enum(['APROBADO', 'OBSERVADO', 'RECHAZADO'], {
      message: 'Seleccione el resultado.',
    }),
    observaciones: z.string().trim().max(4000, 'Máximo 4000 caracteres.').optional(),
  })
  .refine((d) => d.resultado === 'APROBADO' || !!d.observaciones?.trim(), {
    path: ['observaciones'],
    message: 'Las observaciones son obligatorias al observar o rechazar el PAT (RN-12).',
  })

export type RevisionForm = z.infer<typeof revisionSchema>
