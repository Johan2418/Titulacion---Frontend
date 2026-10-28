/** Límites de la contraseña personal definidos por el backend (NewPasswordDto). */
export const CLAVE_MIN = 15
export const CLAVE_MAX = 128

/** Devuelve el mensaje de error o null si la nueva contraseña y su confirmación son válidas. */
export function validarClave(clave: string, confirmacion: string) {
  if (clave.length < CLAVE_MIN || clave.length > CLAVE_MAX)
    return `La contraseña debe tener entre ${CLAVE_MIN} y ${CLAVE_MAX} caracteres.`
  if (clave !== confirmacion) return 'Las contraseñas no coinciden.'
  return null
}
