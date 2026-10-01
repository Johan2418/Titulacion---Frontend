import { z } from 'zod'

/** Espejo de los CHECK de periodo_titulacion en el DER. */
export const periodoSchema = z
  .object({
    codigo: z.string().trim().min(1, 'Ingrese el código.').max(20, 'Máximo 20 caracteres.'),
    nombre: z.string().trim().min(1, 'Ingrese el nombre.').max(120, 'Máximo 120 caracteres.'),
    fechaInicioPostulacion: z.string().min(1, 'Ingrese la fecha.'),
    fechaFinPostulacion: z.string().min(1, 'Ingrese la fecha.'),
    fechaInicioTitulacion: z.string().min(1, 'Ingrese la fecha.'),
    maxIntegrantesDefault: z.coerce
      .number()
      .int()
      .min(1, 'Debe ser al menos 1.')
      .max(10, 'Máximo 10.'),
  })
  .refine((d) => d.fechaFinPostulacion > d.fechaInicioPostulacion, {
    path: ['fechaFinPostulacion'],
    message: 'El fin de postulación debe ser posterior al inicio.',
  })
  .refine((d) => d.fechaInicioTitulacion >= d.fechaFinPostulacion, {
    path: ['fechaInicioTitulacion'],
    message: 'El inicio de titulación debe ser igual o posterior al fin de postulación.',
  })

export type PeriodoForm = z.infer<typeof periodoSchema>
