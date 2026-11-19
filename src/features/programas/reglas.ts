import { nombreCompleto } from '@/lib/utils'
import type { Programa, Rol, Tema } from '@/types/dominio'

/** ADMIN edita cualquier programa; COORDINADOR solo aquellos de los que es responsable. */
export function puedeEditarPrograma(
  usuario: { id: string; rol: Rol },
  programa: Pick<Programa, 'responsableUsuarioId'>,
): boolean {
  if (usuario.rol === 'ADMIN') return true
  return usuario.rol === 'COORDINADOR' && programa.responsableUsuarioId === usuario.id
}

/** Opciones únicas de responsable (`TIPO:id`) a partir de los programas, ordenadas por nombre. */
export function opcionesResponsables(programas: Programa[]) {
  const porClave = new Map<string, string>()
  for (const p of programas) {
    const etiqueta = `${nombreCompleto(p.responsable)} (${p.responsable.tipo === 'DOCENTE' ? 'docente' : 'coordinador'})`
    porClave.set(`${p.responsable.tipo}:${p.responsable.id}`, etiqueta)
  }
  return [...porClave]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export interface GrupoPrograma {
  /** null: temas sin programa */
  programa: { id: string; nombre: string } | null
  temas: Tema[]
}

/** Agrupa temas por programa (alfabético) y deja al final los temas sin programa. */
export function agruparPorPrograma(temas: Tema[]): GrupoPrograma[] {
  const grupos = new Map<string, GrupoPrograma>()
  const sinPrograma: Tema[] = []
  for (const t of temas) {
    if (!t.programa) {
      sinPrograma.push(t)
      continue
    }
    const g = grupos.get(t.programa.id) ?? { programa: t.programa, temas: [] }
    g.temas.push(t)
    grupos.set(t.programa.id, g)
  }
  const ordenados = [...grupos.values()].sort((a, b) =>
    a.programa!.nombre.localeCompare(b.programa!.nombre),
  )
  return sinPrograma.length ? [...ordenados, { programa: null, temas: sinPrograma }] : ordenados
}
