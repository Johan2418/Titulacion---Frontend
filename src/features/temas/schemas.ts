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
})

export type TemaForm = z.infer<typeof temaSchema>
