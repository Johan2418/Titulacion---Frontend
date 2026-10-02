import { http } from 'msw'
import { ahora, db, reiniciarDb } from '../db'
import { sesion } from '../dto'
import { API, ruta, usuarioDe } from '../util'

/** Usuarios sugeridos en el login simulado, con el escenario que permiten probar. */
const DEMO: { id: string; escenario: string }[] = [
  { id: 'usr-admin', escenario: 'Responsable de titulación: configura, asigna y revisa.' },
  { id: 'usr-doc-1', escenario: 'Docente proponente de varios temas.' },
  { id: 'usr-doc-6', escenario: 'Docente tutora con un trabajo asignado.' },
  { id: 'usr-est-1', escenario: 'Representante de grupo con postulación pendiente.' },
  { id: 'usr-est-3', escenario: 'Tiene una invitación pendiente a un grupo.' },
  { id: 'usr-est-4', escenario: 'Sin grupo ni postulación: puede postular.' },
  { id: 'usr-est-6', escenario: 'Postulación individual en conflicto.' },
  { id: 'usr-est-9', escenario: 'Tema asignado, tutor y PAT en revisión.' },
  { id: 'usr-est-14', escenario: 'Estudiante condicionado con ingreso pendiente.' },
]

export const authHandlers = [
  http.get(
    `${API}/auth/usuarios-demo`,
    ruta(
      () =>
        DEMO.map(({ id, escenario }) => {
          const u = db.usuarios.find((x) => x.id === id)!
          return { ...sesion(u), escenario }
        }),
      { publica: true },
    ),
  ),
  http.get(
    `${API}/auth/me`,
    ruta(
      ({ req }) => {
        // etapa 3 del backend: solo identidad verificada, sin usuario ni rol
        if (req.headers.get('Authorization') === 'Bearer mock:solo-identidad')
          return {
            subject: 'a1b2c3d4-sub',
            issuer: 'https://login.microsoftonline.com/<tenant>/v2.0',
          }
        const u = usuarioDe(req)
        u.ultimoAcceso = ahora()
        return sesion(u)
      },
      { publica: true },
    ),
  ),
  http.post(
    `${API}/mock/reiniciar`,
    ruta(
      () => {
        reiniciarDb()
      },
      { publica: true },
    ),
  ),
]
