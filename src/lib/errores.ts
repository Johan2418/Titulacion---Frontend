import { ApiError } from '@/api/client'

/** Descripción breve de cada regla de negocio, para mensajes claros (RNF-16). */
export const REGLAS: Record<string, string> = {
  'RN-01': 'El administrador es un rol dentro de usuario.',
  'RN-02':
    'El ingreso efectivo de un condicionado depende de cumplir el requisito antes del inicio de titulación.',
  'RN-03': 'Un condicionado que no cumple queda NO ADMITIDO y su asignación se anula.',
  'RN-04': 'Una postulación es individual o grupal, nunca ambas.',
  'RN-05':
    'El número de integrantes debe estar dentro del rango del tema; un grupo tiene al menos 2 integrantes.',
  'RN-06': 'Un estudiante pertenece como máximo a un grupo activo por período.',
  'RN-07': 'Un tema solo puede tener una asignación vigente.',
  'RN-08':
    'Un estudiante o grupo tiene como máximo una postulación activa y una asignación vigente.',
  'RN-09': 'El docente proponente y el tutor son responsabilidades distintas.',
  'RN-10': 'La propuesta de tutor es una preferencia; la asignación la realiza el administrador.',
  'RN-11': 'La carga tutorial se controla con un límite global o específico por docente.',
  'RN-12': 'Observar o rechazar un PAT exige observaciones.',
  'RN-13': 'Ningún registro histórico se elimina.',
}

export function mensajeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión expiró o no es válida. Vuelve a ingresar.'
    if (error.status === 403) return 'No tiene permisos para realizar esta acción.'
    if (error.status === 503)
      return 'El servicio no está disponible en este momento. Intente nuevamente en unos minutos.'
    if (error.status === 404 && error.code === 'HTTP_404') return 'El recurso solicitado no existe.'
    return error.regla ? `${error.message} (${error.regla})` : error.message
  }
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}
