import { z } from 'zod'

/** CHECK (min_integrantes >= 1) y CHECK (max_integrantes >= min_integrantes). */
export const temaSchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(5, 'El título debe tener al menos 5 caracteres.')
      .max(250, 'Máximo 250 caracteres.'),
    descripcion: z.string().trim().min(10, 'Describa el tema (mínimo 10 caracteres).'),
    lineaId: z.string().min(1, 'Seleccione la línea de investigación.'),
    docenteProponenteId: z.string().min(1, 'Seleccione el docente proponente.'),
    minIntegrantes: z.coerce.number().int().min(1, 'El mínimo debe ser al menos 1.'),
    maxIntegrantes: z.coerce.number().int().min(1, 'El máximo debe ser al menos 1.'),
  })
  .refine((d) => d.maxIntegrantes >= d.minIntegrantes, {
    path: ['maxIntegrantes'],
    message: 'El máximo debe ser mayor o igual al mínimo.',
  })

export type TemaForm = z.infer<typeof temaSchema>
