import { asignacionHandlers } from './handlers/asignaciones'
import { authHandlers } from './handlers/auth'
import { catalogoHandlers } from './handlers/catalogos'
import { grupoHandlers } from './handlers/grupos'
import { patHandlers } from './handlers/pat'
import { postulacionHandlers } from './handlers/postulaciones'
import { sistemaHandlers } from './handlers/sistema'
import { temaHandlers } from './handlers/temas'

// El orden importa: rutas específicas antes que las genéricas (p. ej. /periodos/actual antes de /periodos/:id).
export const handlers = [
  ...authHandlers,
  ...catalogoHandlers,
  ...temaHandlers,
  ...grupoHandlers,
  ...postulacionHandlers,
  ...asignacionHandlers,
  ...patHandlers,
  ...sistemaHandlers,
]
