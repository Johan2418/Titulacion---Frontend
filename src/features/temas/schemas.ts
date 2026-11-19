import { z } from 'zod'
import { TIPOS_TEMA } from '@/types/dominio'

/** The member range derives from the type (INDIVIDUAL 1, PAREJA 2, GRUPO 3..period max). */
export const temaSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(5, 'El título debe tener al menos 5 caracteres.')
    .max(250, 'Máximo 250 caracteres.'),
  descripcion: z.string().trim().min(10, 'Describa el tema (mínimo 10 caracteres).'),
  carreraId: z.string().min(1, 'Seleccione la carrera.'),
  lineaId: z.string().min(1, 'Seleccione la línea de investigación.'),
  docenteProponenteId: z.string().min(1, 'Seleccione el docente proponente.'),
  tipo: z.enum(TIPOS_TEMA, { message: 'Seleccione el tipo de tema.' }),
  /** Bloque 4: opcional ('' = sin programa); obligatorio para COORDINADOR (ver `temaSchemaPara`). */
  programaId: z.string().default(''),
  categoria: z.string().trim().max(120, 'Máximo 120 caracteres.').default(''),
})

/** El COORDINADOR solo registra temas dentro de uno de sus programas. */
export const temaSchemaPara = (programaObligatorio: boolean) =>
  programaObligatorio
    ? temaSchema.refine((d) => !!d.programaId, {
        path: ['programaId'],
        message: 'Seleccione el programa del tema.',
      })
    : temaSchema

/**
 * Programa y categoría para el backend: al crear se omiten si están vacíos; al editar solo se
 * envían si cambiaron (vacío los quita con null), para no revalidar un programa que no cambia.
 */
export function camposProgramaTema(
  d: Pick<TemaForm, 'programaId' | 'categoria'>,
  original?: { programaId?: string | null; categoria?: string | null } | null,
): { programaId?: string | null; categoria?: string | null } {
  const categoria = d.categoria.trim()
  if (!original)
    return {
      ...(d.programaId ? { programaId: d.programaId } : {}),
      ...(categoria ? { categoria } : {}),
    }
  const campos: { programaId?: string | null; categoria?: string | null } = {}
  if ((original.programaId ?? '') !== d.programaId) campos.programaId = d.programaId || null
  if ((original.categoria ?? '') !== categoria) campos.categoria = categoria || null
  return campos
}

export type TemaForm = z.infer<typeof temaSchema>
