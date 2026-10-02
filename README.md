# Sistema de Titulación: Frontend

Frontend del **Sistema de Gestión del Proceso de Titulación**: asignación de temas, tutores y PAT. Este repositorio contiene **solo el frontend**; el backend (NestJS + PostgreSQL) se desarrolla en otro repositorio con la misma especificación y el mismo DER.

- Plan de implementación: [`docs/PLAN-IMPLEMENTACION.md`](docs/PLAN-IMPLEMENTACION.md)
- Contrato de API esperado del backend: [`docs/API-CONTRATO.md`](docs/API-CONTRATO.md)

## Stack

React 19 + TypeScript (Vite) · React Router · TanStack Query y Table · React Hook Form + Zod · Tailwind CSS 4 + componentes estilo shadcn/ui (Radix) · `oidc-client-ts` · MSW para simular la API · Vitest + Testing Library · Playwright + axe-core.

## Puesta en marcha

```bash
npm install
npm run dev          # http://localhost:5173, con datos simulados (MSW)
```

`.env.development` activa los mocks (`VITE_USE_MOCKS=true`). En la pantalla de ingreso se elige un usuario de demostración. Cada uno representa un escenario:

| Usuario          | Rol           | Escenario                                        |
| ---------------- | ------------- | ------------------------------------------------ |
| Ana Rodríguez    | Administrador | Configura, resuelve conflictos, asigna y revisa  |
| Carlos Mejía     | Docente       | Proponente de varios temas                       |
| Elena Cordero    | Docente       | Tutora de un trabajo con PAT en revisión         |
| Valeria Andrade  | Estudiante    | Representante de grupo con postulación pendiente |
| Camila Paredes   | Estudiante    | Tiene una invitación pendiente                   |
| Sebastián Torres | Estudiante    | Sin grupo ni postulación: puede postular         |
| Andrés Salazar   | Estudiante    | Postulación individual en conflicto              |
| Isabella Castro  | Estudiante    | Tema asignado, tutor y PAT observado/en revisión |
| Emilio Guerrero  | Estudiante    | Condicionado con ingreso pendiente               |

Los datos simulados se guardan en `localStorage`. El botón **Restablecer datos simulados** de la pantalla de ingreso vuelve al estado inicial.

En **Escenarios de autenticación**, en la misma pantalla, se pueden simular las respuestas de `GET /auth/me` acordadas con el backend: cuenta no registrada (`403`), identidad sin perfil (etapa actual del backend) y autenticación no disponible (`503`). El detalle está en [`docs/API-CONTRATO.md`](docs/API-CONTRATO.md#autenticación-coordinación-con-el-backend).

### Conectar con el backend real

Cree un archivo `.env.local` (no se versiona):

```bash
VITE_USE_MOCKS=false
VITE_API_URL=https://api.titulacion.institucion.edu/api/v1
VITE_OIDC_AUTHORITY=https://sso.institucion.edu/realms/titulacion
VITE_OIDC_CLIENT_ID=titulacion-frontend
```

Con los mocks desactivados, el ingreso usa OIDC (authorization code + PKCE) y el token se envía como `Bearer` en cada petición.

## Variables de entorno

| Variable                                                        | Descripción                                             | Por defecto         |
| --------------------------------------------------------------- | ------------------------------------------------------- | ------------------- |
| `VITE_API_URL`                                                  | URL base de la API REST                                 | `/api/v1`           |
| `VITE_USE_MOCKS`                                                | `true` para usar MSW en lugar del backend               | `false`             |
| `VITE_TIMEZONE`                                                 | Zona horaria institucional para mostrar fechas (RNF-30) | `America/Guayaquil` |
| `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_SCOPE` | Proveedor OIDC institucional (RNF-01)                   | —                   |

## Scripts

| Script                            | Acción                                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo                                                  |
| `npm run build`                   | Typecheck + build de producción en `dist/`                              |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                       |
| `npm run typecheck`               | TypeScript estricto                                                     |
| `npm test`                        | Pruebas unitarias y de integración (Vitest)                             |
| `npm run e2e`                     | Pruebas E2E y de accesibilidad (Playwright); levanta su propio servidor |

Si Chromium ya está instalado en otra ruta, use `PW_CHROMIUM_PATH=/ruta/chromium npm run e2e`.

## Estructura

```
src/
  api/          cliente HTTP (JWT, errores normalizados), claves de query, helper de mutaciones
  app/          providers, router (carga diferida por pantalla), layout y navegación por rol
  auth/         sesión (mock u OIDC), guardas por rol
  components/   DataTable, StatusBadge, FileUpload, ConfirmDialog, Campo… y ui/ (shadcn)
  features/     hooks de datos, esquemas Zod y componentes por dominio
  lib/          fechas en zona institucional, estados → etiqueta/color, validación de archivos, errores
  mocks/        MSW: base en memoria (DER), datos semilla, handlers con las reglas de negocio
  pages/        pantallas por rol: estudiante/, docente/, admin/, comun/
  types/        tipos de dominio alineados con el DER
e2e/            flujos E2E y auditoría axe (WCAG 2.1 AA)
```

## Cobertura de requisitos

| Módulo        | Pantallas                                                                                                                                                                                                                  | Requisitos    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Estudiante    | Seguimiento, catálogo y detalle de temas, asistente de postulación, mi grupo e invitaciones, mis postulaciones, PAT                                                                                                        | RF-01 a RF-16 |
| Administrador | Panel, períodos, habilitados (importación y resolución de ingreso), docentes, líneas, carga tutorial, temas e historial, postulaciones, conflictos, asignaciones y tutores, revisión y plantillas PAT, auditoría, reportes | RF-17 a RF-36 |
| Docente       | Mis temas, mis tutorías, mi carga                                                                                                                                                                                          | RF-37 a RF-39 |

En el frontend también se abordan:

- **Accesibilidad:** WCAG 2.1 AA, verificada con axe en E2E (RNF-15).
- **Usabilidad:** interfaz en español, adaptable a móvil y con mensajes que citan la regla incumplida (RNF-16).
- **Fechas:** se muestran en la hora institucional (RNF-30).
- **Archivos:** validación de formato y tamaño antes de enviar (RNF-09, RNF-14); descarga mediante URL prefirmada (RNF-12).
- **Autorización:** guardas por rol en las rutas (RNF-03).
- **Despliegue:** contenedor con Nginx (RNF-26).

Las reglas de negocio las aplica el backend. El frontend las valida antes de enviar y los mocks las reproducen para que los flujos sean realistas.

## Contenedor

```bash
docker build -t titulacion-frontend \
  --build-arg VITE_API_URL=/api/v1 \
  --build-arg VITE_OIDC_AUTHORITY=https://sso.institucion.edu/realms/titulacion \
  --build-arg VITE_OIDC_CLIENT_ID=titulacion-frontend .
docker run -p 8080:8080 titulacion-frontend
```

Nginx sirve la SPA con _fallback_ a `index.html`, cabeceras de seguridad y caché inmutable para `/assets`.
