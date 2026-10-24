# Integración con la API del backend

El frontend consume la API REST del backend NestJS ([`MarlonX-a/Titulacion_backend`](https://github.com/MarlonX-a/Titulacion_backend)). La documentación de referencia de cada endpoint es su Swagger (`http://127.0.0.1:3000/docs`). Este documento resume cómo el frontend usa esa API y qué funciones de la interfaz todavía no tienen soporte en el backend.

## Convenciones

| Tema          | Backend                                                                    | Cómo lo resuelve el frontend                                                               |
| ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Base          | Rutas en la raíz (`/auth/login`, `/periodos`…)                             | El navegador llama a `/api/v1/*`; Vite (desarrollo) o Nginx (contenedor) quitan el prefijo |
| Formato       | JSON en `snake_case`                                                       | `src/api/client.ts` convierte claves de entrada y salida; las pantallas usan camelCase     |
| Listas        | Paginadas: `{ data, total, page, limit }` (máximo 100 por página)          | `api.todas()` recorre todas las páginas y devuelve un arreglo                              |
| Recursos      | Casi todos anidados por período: `/periodos/:periodoId/...`                | El período se toma del selector global (`PeriodoContext`)                                  |
| Resúmenes     | Personas embebidas con `id`, `nombres`, `apellidos` (a veces `matricula`)  | `src/api/adaptadores.ts` completa los campos que faltan con valores neutros                |
| Errores       | Formato por defecto de NestJS: `{ statusCode, message, error }`            | Se muestra `message` (en español); los mensajes genéricos en inglés se reemplazan          |
| "Sin recurso" | `404` en consultas propias (`/grupos/me`, `/plantillas-pat/vigente`, etc.) | `oNulo()` lo convierte en `null` (estado vacío)                                            |
| Archivos      | `multipart/form-data` con el campo `archivo`; descargas con URL prefirmada | Descarga mediante `{ url, expira_en }`                                                     |

## Autenticación

| Paso             | Endpoint                                                    | Notas                                                                  |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Ingreso          | `POST /auth/login` `{ email, password }`                    | Token de 15 min en memoria + cookie `HttpOnly` de renovación (`/auth`) |
| Primer acceso    | `POST /auth/change-initial-password` `{ password }`         | Cuando el login responde `requiere_cambio_clave: true`                 |
| Renovación       | `GET /auth/csrf` + `POST /auth/refresh` con `X-CSRF-Token`  | Antes de vencer el token, ante un `401` y al recargar la página        |
| Cierre de sesión | `POST /auth/logout` con `X-CSRF-Token`                      |                                                                        |
| Recuperación     | `POST /auth/forgot-password`, `POST /auth/reset-password`   |                                                                        |
| Perfil           | `GET /usuarios/me` + `GET /estudiantes/me` o `/docentes/me` | Arma `SesionUsuario` con `estudianteId` / `docenteId`                  |

La renovación valida el `Origin` contra `AUTH_ORIGINS` del backend: el origen del frontend debe figurar allí.

## Correspondencia por módulo

| Función del frontend                | Endpoint(s) del backend                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Períodos, período vigente           | `GET /periodos` (todos los roles); el vigente se elige por estado en el cliente                                 |
| Abrir / cerrar postulación, iniciar | `POST /periodos/:id/abrir-postulacion`, `cerrar-postulacion`, `iniciar-titulacion`                              |
| Panel (KPIs)                        | Calculado con los listados de habilitados, temas, postulaciones, conflictos, asignaciones y PAT                 |
| Líneas de investigación             | `GET/POST /lineas-investigacion`, `PATCH /lineas-investigacion/:id`                                             |
| Docentes (alta)                     | `POST /usuarios` (rol DOCENTE, envía clave temporal) y luego `POST /docentes`                                   |
| Estudiantes                         | `GET /estudiantes` (búsqueda en el cliente)                                                                     |
| Habilitados                         | `GET/POST /periodos/:id/habilitados`, `POST .../habilitados/:id/resolver-ingreso`                               |
| Candidatos a invitar (estudiante)   | `GET /periodos/:id/habilitados/candidatos-invitacion`                                                           |
| Importación de estudiantes (Excel)  | `POST /periodos/:id/importaciones/estudiantes/validar` → consulta → `.../:id/confirmar`                         |
| Límites de carga                    | `GET/POST /periodos/:id/config-carga-tutorial`, `PATCH .../:id`                                                 |
| Carga por docente                   | `GET /periodos/:id/carga-tutorial/:docenteId`, `GET .../carga-tutorial/me`                                      |
| Temas                               | `GET/POST /periodos/:id/temas`, `GET/PATCH .../temas/:id`, `POST .../temas/:id/publicar`, `.../historial`       |
| Grupos                              | `POST /periodos/:id/grupos`, `GET .../grupos/me`, `POST .../grupos/:id/salir` o `disolver`                      |
| Invitaciones                        | `GET/POST .../grupos/:id/invitaciones`, `GET .../invitaciones/me`, `POST .../invitaciones/:id/{accion}`         |
| Postulaciones                       | `GET/POST /periodos/:id/postulaciones`, `GET .../me`, `POST .../:id/cancelar`, `GET .../:id/tutores-propuestos` |
| Tutores elegibles al postular       | `GET /periodos/:id/temas/:temaId/tutores-disponibles`                                                           |
| Conflictos                          | `GET /periodos/:id/conflictos`, `GET/POST .../temas/:temaId/conflicto[/resolver]`                               |
| Asignación de tema                  | `POST /periodos/:id/postulaciones/:id/asignar-tema` (desde una postulación PENDIENTE)                           |
| Asignaciones                        | `GET /periodos/:id/asignaciones-tema`, `.../me`, `.../:id`                                                      |
| Tutor                               | `POST .../asignaciones-tema/:id/asignar-tutor` o `POST .../asignaciones-tutor/:id/reemplazar`                   |
| Tutorías del docente                | `GET /periodos/:id/asignaciones-tutor/me`                                                                       |
| Plantillas PAT                      | `GET/POST /periodos/:id/plantillas-pat`, `.../vigente`, `.../:id/descarga`, `.../vigente/descarga`              |
| Documentos PAT y revisión           | `.../asignaciones-tema/:id/documentos-pat` (`ultima`, `:id/descarga`, `:id/revision`)                           |
| Bandeja de revisión PAT             | Última versión de cada asignación vigente                                                                       |
| Notificaciones                      | `GET /notificaciones`, `POST /notificaciones/:id/leer`                                                          |
| Seguimiento del estudiante          | Calculado con habilitación, grupo, invitaciones, postulaciones, asignación y PAT propios                        |

## Diferencias de flujo

- **Asignación directa:** el backend no tiene "aceptar" ni "rechazar" manual. El responsable asigna el tema desde una postulación `PENDIENTE`; esa postulación pasa a `ACEPTADA` y las demás del tema se rechazan.
- **Tutor:** el backend exige un límite de carga configurado (global o del docente) antes de asignar tutorías. Si se supera un límite sin bloqueo, la asignación se registra y se muestran las advertencias.
- **Plantilla PAT:** al publicar una versión queda como la única vigente; no se pueden indicar fechas de vigencia ni reactivar versiones anteriores.
- **Salir del grupo:** el backend exige un motivo; el frontend envía uno genérico. Si el representante sale con otros integrantes activos, el grupo se disuelve.

## Funciones aún no disponibles en el backend

La interfaz las muestra, pero responden con el aviso "… todavía no está disponible en el backend":

- Edición de docentes e importación masiva de docentes.
- Edición de una habilitación (estado, condición o requisito).
- Eliminación de un límite de carga específico.
- Cierre y retiro de temas.
- Anulación manual de asignaciones.
- Reactivación de una versión anterior de la plantilla PAT.
- Consulta de auditoría.
- Reportes y exportaciones.
