import { z } from 'zod'

/** El servidor rechaza con 400 más de 5 tutores propuestos por postulación. */
export const MAX_TUTORES_PROPUESTOS = 5

export const tutoresPropuestosSchema = z
  .array(z.string())
  .min(1, 'Debes proponer al menos un docente.')
  .max(MAX_TUTORES_PROPUESTOS, `Se pueden proponer como máximo ${MAX_TUTORES_PROPUESTOS} tutores.`)
