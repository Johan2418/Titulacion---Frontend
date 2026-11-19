import { z } from 'zod'
import type { ProgramaInput } from './api'

export const MAX_TEMAS_PROGRAMA_DEFECTO = 15

export const TIPOS_RESPONSABLE = ['DOCENTE', 'COORDINADOR'] as const
export type TipoResponsable = (typeof TIPOS_RESPONSABLE)[number]

/** Espejo de `CreateProgramaDto` / `UpdateProgramaDto` y del CHECK de un único responsable. */
export const programaSchema = z
  .object({
    nombre: z.string().trim().min(1, 'Ingrese el nombre.').max(150, 'Máximo 150 caracteres.'),
    descripcion: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
    carreraId: z.string().min(1, 'Seleccione la carrera.'),
    tipoResponsable: z.enum(TIPOS_RESPONSABLE),
    responsableDocenteId: z.string(),
    responsableUsuarioId: z.string(),
    maxTemas: z.coerce
      .number({ message: 'Ingrese un número.' })
      .int('Debe ser un número entero.')
      .min(1, 'Debe ser al menos 1.')
      .max(50, 'Máximo 50.'),
    activo: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const docente = !!d.responsableDocenteId
    const coordinador = !!d.responsableUsuarioId
    if (docente === coordinador)
      ctx.addIssue({
        code: 'custom',
        path: [d.tipoResponsable === 'DOCENTE' ? 'responsableDocenteId' : 'responsableUsuarioId'],
        message: docente
          ? 'Indique un único responsable: un docente o un coordinador.'
          : d.tipoResponsable === 'DOCENTE'
            ? 'Seleccione el docente responsable.'
            : 'Seleccione el coordinador responsable.',
      })
  })

export type ProgramaForm = z.infer<typeof programaSchema>

/**
 * Cuerpo para el backend. ADMIN envía exactamente un responsable (asignar uno quita el otro);
 * un COORDINADOR no puede cambiarlo: al crear queda él mismo y al editar no se envía.
 */
export function cuerpoPrograma(
  d: ProgramaForm,
  opciones: { editando: boolean; coordinadorId?: string },
): ProgramaInput {
  const base: ProgramaInput = {
    nombre: d.nombre.trim(),
    descripcion: d.descripcion.trim() || null,
    carreraId: d.carreraId,
    maxTemas: d.maxTemas,
  }
  if (opciones.editando) base.activo = d.activo
  else if (!base.descripcion) delete base.descripcion
  if (opciones.coordinadorId) {
    if (!opciones.editando) base.responsableUsuarioId = opciones.coordinadorId
    return base
  }
  if (d.tipoResponsable === 'DOCENTE') base.responsableDocenteId = d.responsableDocenteId
  else base.responsableUsuarioId = d.responsableUsuarioId
  return base
}
