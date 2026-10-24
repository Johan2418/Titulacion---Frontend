# Sistema de Titulación: Frontend

Frontend del **Sistema de Gestión del Proceso de Titulación**: asignación de temas, tutores y PAT. Este repositorio contiene **solo el frontend**; el backend (NestJS + PostgreSQL) se desarrolla en otro repositorio con la misma especificación y el mismo DER.

- Plan de implementación: [`docs/PLAN-IMPLEMENTACION.md`](docs/PLAN-IMPLEMENTACION.md)
- Contrato de API esperado del backend: [`docs/API-CONTRATO.md`](docs/API-CONTRATO.md)

## Stack

React 19 + TypeScript (Vite) · React Router · TanStack Query y Table · React Hook Form + Zod · Tailwind CSS 4 + componentes estilo shadcn/ui (Radix) · Vitest + Testing Library.

## Puesta en marcha

El frontend consume directamente la API del backend ([`MarlonX-a/Titulacion_backend`](https://github.com/MarlonX-a/Titulacion_backend)); no hay datos simulados.

1. Levante el backend según su README (PostgreSQL, Redis, `npm run auth:keys`, `npm run db:prepare-auth`, `npm run usuario:bootstrap-admin` y `npm run start:dev`). Debe responder en `http://127.0.0.1:3000`.
2. Inicie el frontend:

```bash
npm install
npm run dev          # http://localhost:5173
```

En desarrollo, Vite redirige `/api/v1/*` al backend (`VITE_BACKEND_URL`, por defecto `http://127.0.0.1:3000`) quitando el prefijo, y reescribe la ruta de la cookie de sesión (`Path=/auth` → `/api/v1/auth`). Así front y API comparten origen y no hace falta CORS. El backend valida el `Origin` en la renovación de sesión: `http://localhost:5173` ya figura en su `AUTH_ORIGINS` de ejemplo.

### Autenticación

Se usa la autenticación propia del backend (correo y contraseña, JWT RS256):

- `POST /auth/login` devuelve un token de acceso de 15 minutos, que el front guarda **solo en memoria**, y una cookie `HttpOnly` de renovación.
- Antes de que el token venza, o ante un `401`, el front llama a `GET /auth/csrf` y `POST /auth/refresh` con la cabecera `X-CSRF-Token`. Al recargar la página la sesión se recupera de la misma forma.
- Si la cuenta tiene una clave temporal (`requiere_cambio_clave`), la pantalla de ingreso pide definir la contraseña personal (`POST /auth/change-initial-password`, 15 a 128 caracteres) e ingresa con ella.
- "¿Olvidó su contraseña?" usa `POST /auth/forgot-password` y `POST /auth/reset-password`.
- El perfil se arma con `GET /usuarios/me` más `GET /estudiantes/me` o `GET /docentes/me` según el rol.

### Capa de adaptación

Las pantallas trabajan con los tipos de `src/types/dominio.ts` (camelCase). La traducción al backend vive en la capa de datos:

- `src/api/client.ts`: convierte claves `snake_case` ↔ `camelCase`, recorre listados paginados (`{ data, total, page, limit }`) y renueva la sesión ante un `401`.
- `src/api/adaptadores.ts`: transforma las respuestas del backend en los tipos de dominio.
- `src/features/*/api.ts`: usan las rutas reales, casi todas anidadas por período (`/periodos/:id/temas`, `/periodos/:id/postulaciones`…). El período activo se toma del selector de período.

El detalle de la correspondencia y de las funciones que el backend aún no ofrece está en [`docs/API-CONTRATO.md`](docs/API-CONTRATO.md).

## Variables de entorno

| Variable           | Descripción                                             | Por defecto             |
| ------------------ | ------------------------------------------------------- | ----------------------- |
| `VITE_API_URL`     | URL base de la API REST que usa el navegador            | `/api/v1`               |
| `VITE_BACKEND_URL` | Solo desarrollo: backend al que Vite redirige `/api/v1` | `http://127.0.0.1:3000` |
| `VITE_TIMEZONE`    | Zona horaria institucional para mostrar fechas (RNF-30) | `America/Guayaquil`     |

## Scripts

| Script                            | Acción                                      |
| --------------------------------- | ------------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo                      |
| `npm run build`                   | Typecheck + build de producción en `dist/`  |
| `npm run lint` / `npm run format` | ESLint / Prettier                           |
| `npm run typecheck`               | TypeScript estricto                         |
| `npm test`                        | Pruebas unitarias y de integración (Vitest) |

## Estructura

```
src/
  api/          cliente HTTP (JWT, snake/camelCase, paginación), adaptadores del backend, claves de query
  app/          providers, router (carga diferida por pantalla), layout y navegación por rol
  auth/         sesión con el backend (login, renovación, primer acceso), guardas por rol
  components/   DataTable, StatusBadge, FileUpload, ConfirmDialog, Campo… y ui/ (shadcn)
  features/     hooks de datos, esquemas Zod y componentes por dominio
  lib/          fechas en zona institucional, estados → etiqueta/color, validación de archivos, errores
  pages/        pantallas por rol: estudiante/, docente/, admin/, comun/
  types/        tipos de dominio alineados con el DER
```

## Cobertura de requisitos

| Módulo        | Pantallas                                                                                                                                                                                                                  | Requisitos    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Estudiante    | Seguimiento, catálogo y detalle de temas, asistente de postulación, mi grupo e invitaciones, mis postulaciones, PAT                                                                                                        | RF-01 a RF-16 |
| Administrador | Panel, períodos, habilitados (importación y resolución de ingreso), docentes, líneas, carga tutorial, temas e historial, postulaciones, conflictos, asignaciones y tutores, revisión y plantillas PAT, auditoría, reportes | RF-17 a RF-36 |
| Docente       | Mis temas, mis tutorías, mi carga                                                                                                                                                                                          | RF-37 a RF-39 |

En el frontend también se abordan:

- **Accesibilidad:** componentes accesibles (Radix) y formularios etiquetados, orientados a WCAG 2.1 AA (RNF-15).
- **Usabilidad:** interfaz en español, adaptable a móvil y con mensajes que citan la regla incumplida (RNF-16).
- **Fechas:** se muestran en la hora institucional (RNF-30).
- **Archivos:** validación de formato y tamaño antes de enviar (RNF-09, RNF-14); descarga mediante URL prefirmada (RNF-12).
- **Autorización:** guardas por rol en las rutas (RNF-03).
- **Despliegue:** contenedor con Nginx (RNF-26).

Las reglas de negocio las aplica el backend. El frontend las valida antes de enviar y muestra los mensajes del backend.

## Contenedor

```bash
docker build -t titulacion-frontend .
docker run -p 8080:8080 -e BACKEND_URL=http://backend:3000 titulacion-frontend
```

Nginx sirve la SPA con _fallback_ a `index.html`, cabeceras de seguridad y caché inmutable para `/assets`, y redirige `/api/v1/` al backend indicado en `BACKEND_URL` (mismo origen, sin CORS). En producción, agregue el origen público del frontend a `AUTH_ORIGINS` del backend.
