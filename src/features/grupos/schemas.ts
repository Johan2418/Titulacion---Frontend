import { z } from 'zod'

// Espejo de la regla del servidor (que sigue siendo la autoridad): ver NOMBRE_GRUPO_PATRON.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u
const ENLACE = /:\/\/|\bwww\./iu
const PATRON = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} \-_,'()&#]*$/u

export const MENSAJE_NOMBRE_GRUPO_ENLACE =
  'El nombre no puede incluir enlaces ni caracteres de control, invisibles o de dirección de escritura.'
export const MENSAJE_NOMBRE_GRUPO_PATRON =
  "El nombre debe empezar con una letra o un número y solo admite letras, números, espacios y los signos - _ , ' ( ) & #."

export const nombreGrupoSchema = z
  .string()
  .trim()
  .min(1, 'El nombre del grupo es obligatorio.')
  .max(120, 'El nombre del grupo admite como máximo 120 caracteres.')
  .refine((v) => !CONTROL.test(v) && !INVISIBLE.test(v) && !ENLACE.test(v), {
    message: MENSAJE_NOMBRE_GRUPO_ENLACE,
  })
  .refine((v) => PATRON.test(v), { message: MENSAJE_NOMBRE_GRUPO_PATRON })

/** Primer mensaje de error del nombre, o null si es válido. */
export const errorNombreGrupo = (nombre: string): string | null => {
  const r = nombreGrupoSchema.safeParse(nombre)
  return r.success ? null : (r.error.issues[0]?.message ?? null)
}
