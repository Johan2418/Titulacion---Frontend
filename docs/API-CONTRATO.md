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
| Cambio de clave  | `POST /auth/change-password` `{ current_password, password }` | Menú de usuario. El backend revoca las sesiones: se vuelve a ingresar con la nueva clave |
| Perfil           | `GET /usuarios/me` + `GET /estudiantes/me` o `/docentes/me` | Arma `SesionUsuario` con `estudianteId` / `docenteId`                  |

La renovación valida el `Origin` contra `AUTH_ORIGINS` del backend: el origen del frontend debe figurar allí.

## Correspondencia por módulo

| Función del frontend                | Endpoint(s) del backend                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Períodos, período vigente           | `GET /periodos` (todos los roles); para ADMIN cada período incluye `condicionados_pendientes`. El vigente se elige por estado en el cliente |
| Abrir / cerrar postulación, iniciar | `POST /periodos/:id/abrir-postulacion` (también reabre desde POSTULACION_CERRADA), `cerrar-postulacion`, `iniciar-titulacion`                                   |
| Panel (KPIs)                        | `GET /periodos/:id/resumen` (ADMIN, una consulta agrupada): habilitados, condicionados pendientes, temas y postulaciones por estado, conflictos abiertos, asignaciones vigentes, sin tutor y PAT por revisar |
| Líneas de investigación             | `GET/POST /lineas-investigacion`, `PATCH /lineas-investigacion/:id`                                                                                             |
| Docentes (alta)                     | `POST /docentes` sin `usuarioId` (email, nombres, apellidos + perfil): crea cuenta, clave temporal y perfil en una transacción |
| Docentes (edición)                  | `PATCH /docentes/:id` (nombres, apellidos, cédula, título, departamento, habilitado_tutoria, estado ACTIVO/INACTIVO; el correo no es editable); `POST /usuarios/:usuarioId/reenviar-acceso` (nueva clave temporal, solo cuentas sin contraseña personal) |
| Estudiantes                         | `GET /estudiantes` (búsqueda en el cliente)                                                                                                                     |
| Habilitados                         | `GET/POST /periodos/:id/habilitados` (ADMIN: el estudiante trae `email`, `cedula`, `carrera`, `nivel`; `resuelto_por` con nombre), `PATCH .../:id`, `POST .../habilitados/:id/resolver-ingreso` |
| Candidatos a invitar (estudiante)   | `GET /periodos/:id/habilitados/candidatos-invitacion` (sin correo, cédula ni responsable)                                                                       |
| Importación de estudiantes (Excel)  | `GET /importaciones/estudiantes/plantilla`, `POST /periodos/:id/importaciones/estudiantes/validar` → consulta → `.../:id/confirmar`                            |
| Importación de docentes (Excel)     | `GET /importaciones/docentes/plantilla`, `POST /importaciones/docentes/validar` → `GET .../:id` → `POST .../:id/confirmar` (sin período) |
| Límites de carga                    | `GET/POST /periodos/:id/config-carga-tutorial` (solo activos; `incluir_inactivas=true` para historial), `PATCH .../:id`, `POST .../:id/desactivar` |
| Carga por docente                   | `GET /periodos/:id/carga-tutorial` (ADMIN, todos los docentes con carga actual y límite efectivo; ignora límites específicos inactivos), `GET .../carga-tutorial/me` |
| Temas                               | `GET/POST /periodos/:id/temas`, `GET/PATCH .../temas/:id`, `POST .../temas/:id/publicar` (también reabre CERRADO), `.../cerrar`, `.../retirar`, `.../historial` |
| Grupos                              | `POST /periodos/:id/grupos`, `GET .../grupos/me`, `POST .../grupos/:id/salir` o `disolver`; ADMIN: `GET .../grupos`, `POST .../grupos/:id/cambiar-representante`, `POST .../grupos/:id/integrantes/:estudianteId/retirar`, `POST .../grupos/:id/disolver` (motivo obligatorio) |
| Invitaciones                        | `GET/POST .../grupos/:id/invitaciones`, `GET .../invitaciones/me`, `POST .../invitaciones/:id/{accion}`                                                         |
| Postulaciones                       | `GET/POST /periodos/:id/postulaciones` (filtros `tema_id`, `estado`, `modalidad`; cada postulación trae `tutores_propuestos`), `GET .../me`, `POST .../:id/cancelar`, `POST .../:id/tutores-propuestos` (una sola vez, si no tiene lista) |
| Tutores elegibles al postular       | `GET /periodos/:id/temas/:temaId/tutores-disponibles`                                                                                                           |
| Conflictos                          | `GET /periodos/:id/conflictos` (cada tema trae `postulaciones` con `grupo_nombre` y `resolucion`), `GET/POST .../temas/:temaId/conflicto[/resolver]` |
| Asignación de tema                  | `POST /periodos/:id/postulaciones/:id/asignar-tema` (desde una postulación PENDIENTE)                                                                           |
| Asignaciones                        | `GET /periodos/:id/asignaciones-tema`, `.../me`, `.../:id`, `POST .../asignaciones-tema/:id/anular`                                                             |
| Tutor                               | `POST .../asignaciones-tema/:id/asignar-tutor` o `POST .../asignaciones-tutor/:id/reemplazar`                                                                   |
| Tutorías del docente                | `GET /periodos/:id/asignaciones-tutor/me`                                                                                                                       |
| Plantillas PAT                      | `GET/POST /periodos/:id/plantillas-pat`, `.../vigente`, `.../:id/descarga`, `.../vigente/descarga`                                                              |
| Documentos PAT y revisión           | `.../asignaciones-tema/:id/documentos-pat` (`ultima`, `:id/descarga`, `:id/revision`)                                                                           |
| Bandeja de revisión PAT             | `GET /periodos/:id/documentos-pat/ultimas` (ADMIN): última versión y revisión por asignación vigente; filtro `estado` (`PENDIENTE`, `APROBADO`, `OBSERVADO`, `RECHAZADO`, `SIN_ENTREGA`) |
| Reportes y exportaciones            | `GET/POST /periodos/:id/exportaciones`, `GET .../exportaciones/:id/descarga`, `POST .../exportaciones/:id/reintentar` (solo FALLIDO) (procesadas en segundo plano) |
| Notificaciones                      | Campana: `GET /notificaciones/no-leidas/contador` cada 30 s y `GET /notificaciones?page=1` solo al abrir el panel; `POST /notificaciones/:id/leer`, `POST /notificaciones/leer-todas` (un solo UPDATE, devuelve `{ actualizadas }`) |
| Historial y auditoría (ADMIN)       | `GET /auditoria` paginado en el servidor; filtros `entidad_tipo`, `entidad_id`, `accion`, `usuario_id`, `desde`/`hasta` (fechas inclusivas) y `q` (acción, entidad o correo). `id` es texto (bigint) |
| Importaciones recientes             | `GET /periodos/:id/importaciones/estudiantes` y `GET /importaciones/docentes` (primeros 20, más recientes primero, incluye vencidas con `expirada`); se consultan cada 1,5 s mientras alguna está en proceso |
| Seguimiento del estudiante          | Calculado con habilitación, grupo, invitaciones, postulaciones, asignación y PAT propios                                                                        |

## Diferencias de flujo

- **Asignación directa:** el backend no tiene "aceptar" ni "rechazar" manual. El responsable asigna el tema desde una postulación `PENDIENTE`; esa postulación pasa a `ACEPTADA` y las demás del tema se rechazan.
- **Tutor:** el backend exige un límite de carga configurado (global o del docente) antes de asignar tutorías. Si se supera un límite sin bloqueo, la asignación se registra y la respuesta trae `advertencias` (se muestran en la página); con bloqueo responde `409` con el motivo.
- **Correo de integrantes:** `GET .../grupos/me` no incluye el correo de los compañeros (RNF-28); la pantalla Mi grupo no lo muestra.
- **Plantilla PAT:** al publicar una versión queda como la única vigente; no se pueden indicar fechas de vigencia ni reactivar versiones anteriores.
- **Cerrar o retirar un tema:** exige un motivo; las postulaciones `PENDIENTE` o `EN_CONFLICTO` del tema pasan a `RECHAZADA`. No se permite si el tema tiene una asignación vigente. `RETIRADO` es definitivo; un tema `CERRADO` se reabre con `publicar`.
- **Reabrir postulación:** solo dentro del plazo de postulación. En `POSTULACION_CERRADA` el período solo admite editar la fecha fin de postulación (los demás campos deben conservar su valor).
- **Anulación manual:** causa (`OTRA` o `INCUMPLIMIENTO_CONDICION`) y motivo; termina al tutor, anula la postulación y republica el tema. Las postulaciones rechazadas antes no se reactivan.
- **Límite de carga específico:** no se elimina; se desactiva y vuelve a aplicar el límite global. Luego puede crearse uno nuevo para el mismo docente.
- **Salir del grupo:** el backend exige un motivo; el frontend envía uno genérico. Si el representante sale con otros integrantes activos, el grupo se disuelve.

## Funciones aún no disponibles en el backend

Ninguna conocida. Sin interfaz (baja prioridad): monitoreo de correos (`/admin/correos`, `/admin/notificaciones-email`).
