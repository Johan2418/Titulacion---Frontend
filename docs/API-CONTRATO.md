# Contrato de API esperado por el frontend

Este documento describe la API REST que consume el frontend. Sirve para coordinar con el repositorio del backend (NestJS). La fuente de verdad de la implementación simulada está en `src/mocks/handlers/`. Los tipos de las respuestas están en `src/types/dominio.ts`.

Cuando el backend publique su especificación OpenAPI (RNF-24), los tipos manuales se reemplazarán por tipos generados (`openapi-typescript`). Las diferencias que aparezcan se resolverán en esta capa sin cambiar las pantallas.

## Convenciones

| Tema           | Convención                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base           | `VITE_API_URL` (por defecto `/api/v1`)                                                                                                                                         |
| Autenticación  | `Authorization: Bearer <JWT>` emitido por el OIDC institucional; el backend valida la firma con JWKS (RNF-18)                                                                  |
| Formato        | JSON en **camelCase**. Las columnas del DER se traducen 1:1 (`fecha_inicio_postulacion` → `fechaInicioPostulacion`)                                                            |
| Fechas         | ISO-8601 con zona horaria (TIMESTAMPTZ). El front las muestra en `VITE_TIMEZONE` (RNF-30)                                                                                      |
| Listas         | Arreglo JSON simple. La excepción es `/auditoria`, que pagina con `{ items, total, page, pageSize }`                                                                           |
| DTO expandidos | Las respuestas incluyen resúmenes embebidos (p. ej. `tema.linea { id, nombre }` o `docenteProponente { id, nombres, apellidos, email, cedula }`) para evitar N+1 en el cliente |
| Creación       | `201` con la entidad creada. Acciones (`POST .../aceptar`, etc.) → `200`. Sin contenido → `204`                                                                                |
| Archivos       | `multipart/form-data` con el campo `archivo`. Las descargas devuelven `{ url, nombreArchivo, expiraEn }` con una URL prefirmada (RNF-12)                                       |
| Eliminación    | No hay borrado físico del proceso (RNF-31). Los cambios son transiciones de estado                                                                                             |

### Formato de error

```json
{
  "statusCode": 409,
  "code": "RANGO_INTEGRANTES",
  "message": "El tema admite entre 2 y 3 integrante(s)…",
  "regla": "RN-05",
  "detalles": {}
}
```

- `code` es estable y legible por máquina; el front reacciona a algunos códigos, por ejemplo `CARGA_TUTORIAL_ADVERTENCIA`.
- `regla` (opcional) indica la regla de negocio o el requisito incumplido. Se muestra al usuario (RNF-16).
- `message` va en español y es apto para mostrarse al usuario. NestJS puede enviar `message` como arreglo; el cliente los une.

## Endpoints

### Sesión

| Método | Ruta       | Rol   | Descripción                                   |
| ------ | ---------- | ----- | --------------------------------------------- |
| GET    | `/auth/me` | todos | Usuario actual + `estudianteId` / `docenteId` |

### Períodos (RF-17)

| Método | Ruta                    | Rol   | Notas                                                                                                |
| ------ | ----------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| GET    | `/periodos`             | todos | Incluye `condicionadosPendientes`                                                                    |
| GET    | `/periodos/actual`      | todos | Período vigente o `null`                                                                             |
| GET    | `/periodos/:id`         | todos |                                                                                                      |
| POST   | `/periodos`             | ADMIN | Valida el orden de las fechas (CHECK del DER)                                                        |
| PATCH  | `/periodos/:id`         | ADMIN |                                                                                                      |
| POST   | `/periodos/:id/estado`  | ADMIN | `{ estado }`. `EN_CURSO` se rechaza con condicionados pendientes (`CONDICIONADOS_PENDIENTES`, RN-02) |
| GET    | `/periodos/:id/resumen` | ADMIN | KPIs del panel (`ResumenPeriodo`)                                                                    |

### Catálogos (RF-18, RF-19)

| Método       | Ruta                                                            | Rol                                    | Notas                                                                            |
| ------------ | --------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| GET/POST     | `/lineas-investigacion`                                         | todos / ADMIN                          |                                                                                  |
| PATCH        | `/lineas-investigacion/:id`                                     | ADMIN                                  |                                                                                  |
| GET          | `/docentes?habilitadoTutoria=`                                  | todos                                  |                                                                                  |
| POST / PATCH | `/docentes`, `/docentes/:id`                                    | ADMIN                                  |                                                                                  |
| POST         | `/docentes/importar`                                            | ADMIN                                  | multipart → `LoteImportacion` (asíncrono)                                        |
| GET          | `/estudiantes?q=`                                               | ADMIN                                  | Catálogo institucional                                                           |
| GET          | `/periodos/:id/estudiantes-habilitados?sinGrupo=`               | ADMIN · estudiante con `sinGrupo=true` | `sinGrupo=true` devuelve los candidatos a invitación (RF-02)                     |
| POST         | `/periodos/:id/estudiantes-habilitados`                         | ADMIN                                  | `{ estudianteId, condicionIngreso, requisitoPendiente? }`                        |
| PATCH        | `/estudiantes-habilitados/:id`                                  | ADMIN                                  | estado / condición / requisito                                                   |
| POST         | `/estudiantes-habilitados/:id/resolver-ingreso`                 | ADMIN                                  | `{ situacionIngreso, observacion }`. Aplica RN-03 y devuelve `efectos: string[]` |
| POST         | `/periodos/:id/estudiantes-habilitados/importar`                | ADMIN                                  | multipart (CSV) → `LoteImportacion`                                              |
| GET          | `/lotes-importacion?tipo=&periodoId=`, `/lotes-importacion/:id` | ADMIN                                  | El front consulta cada 1,5 s mientras el estado sea `EN_PROCESO`                 |
| GET / PUT    | `/periodos/:id/config-carga`                                    | ADMIN                                  | PUT `{ docenteId \| null, maxTrabajos, bloquearAlSuperar }` (upsert)             |
| DELETE       | `/config-carga/:id`                                             | ADMIN                                  | Solo límites específicos                                                         |
| GET          | `/periodos/:id/carga-tutorial`                                  | ADMIN                                  | `CargaDocente[]`                                                                 |

### Temas (RF-05 a RF-07, RF-20, RF-21, RF-25)

| Método       | Ruta                                                                  | Rol                   | Notas                                                                                       |
| ------------ | --------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| GET          | `/temas?periodoId&lineaId&docenteId&estado&numIntegrantes&disponible` | todos                 | Incluye `disponible` y `postulacionesAbiertas`. Los estudiantes no ven BORRADOR ni RETIRADO |
| GET          | `/temas/:id`, `/temas/:id/historial`                                  | todos / ADMIN·DOCENTE |                                                                                             |
| POST / PATCH | `/temas`, `/temas/:id`                                                | ADMIN                 | El rango no puede cambiar si hay postulaciones abiertas                                     |
| POST         | `/temas/:id/publicar \| cerrar \| retirar`                            | ADMIN                 | `{ motivo }`, obligatorio al retirar                                                        |
| GET          | `/me/temas?periodoId`                                                 | DOCENTE               | Temas propios con `postulaciones[]` (RF-37)                                                 |

### Grupos e invitaciones (RF-01 a RF-03)

| Método     | Ruta                                                | Rol                          | Notas                                                                    |
| ---------- | --------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| GET        | `/me/grupo?periodoId`                               | ESTUDIANTE                   | `Grupo` o `null`. Incluye `composicionCerrada`                           |
| GET        | `/grupos?periodoId`                                 | ADMIN                        |                                                                          |
| POST       | `/grupos`                                           | ESTUDIANTE                   | `{ periodoId, nombre }`. Quien lo crea queda como representante          |
| POST       | `/grupos/:id/salir`                                 | ESTUDIANTE                   | Si lo usa el representante, el grupo se disuelve. Solo antes de postular |
| GET        | `/me/invitaciones`                                  | ESTUDIANTE                   | Recibidas                                                                |
| GET / POST | `/grupos/:id/invitaciones`                          | integrante / representante   | POST `{ estudianteId }`                                                  |
| POST       | `/invitaciones/:id/aceptar \| rechazar \| cancelar` | destinatario / representante |                                                                          |

### Postulaciones y conflictos (RF-04, RF-08 a RF-11, RF-22, RF-23, RF-26)

| Método     | Ruta                                               | Rol                        | Notas                                                                                                                      |
| ---------- | -------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GET        | `/postulaciones?periodoId&temaId&estado&modalidad` | ADMIN, DOCENTE             | Incluye `tutoresPropuestos[]` (con `esProponenteTema`) y `asignacionVigenteId`                                             |
| GET        | `/postulaciones/:id`                               | ADMIN, participantes       |                                                                                                                            |
| GET        | `/me/postulaciones?periodoId`                      | ESTUDIANTE                 | Individuales y de su grupo                                                                                                 |
| POST       | `/postulaciones`                                   | ESTUDIANTE                 | `{ temaId, modalidad, tutores: docenteId[] }` en orden de prioridad                                                        |
| POST       | `/postulaciones/:id/cancelar`                      | postulante / representante |                                                                                                                            |
| POST       | `/postulaciones/:id/aceptar`                       | ADMIN                      | Solo PENDIENTE sin competencia                                                                                             |
| POST       | `/postulaciones/:id/rechazar`                      | ADMIN                      | `{ observacion }`                                                                                                          |
| GET        | `/conflictos?periodoId`                            | ADMIN                      | `ConflictoAbierto[]` (postulaciones EN_CONFLICTO agrupadas por tema)                                                       |
| GET / POST | `/resoluciones-conflicto`                          | ADMIN                      | POST `{ temaId, criterioAplicado, participantes[{postulacionId, puntajeCriterio}], postulacionGanadoraId, justificacion }` |

### Asignaciones y tutores (RF-24, RF-25, RF-27 a RF-30, RF-38, RF-39)

| Método | Ruta                                            | Rol                  | Notas                                                                                         |
| ------ | ----------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| GET    | `/asignaciones-tema?periodoId&estado`           | ADMIN                | Incluye `tutorVigente` y `estadoPat`                                                          |
| GET    | `/asignaciones-tema/:id`                        | ADMIN, participantes |                                                                                               |
| POST   | `/asignaciones-tema`                            | ADMIN                | `{ postulacionId, motivo? }`. El tema pasa a ASIGNADO y el resto de postulaciones se rechazan |
| POST   | `/asignaciones-tema/:id/anular`                 | ADMIN                | `{ causaAnulacion, motivoAnulacion }`                                                         |
| GET    | `/asignaciones-tema/:id/tutores`                | todos con acceso     | Historial                                                                                     |
| POST   | `/asignaciones-tema/:id/tutor`                  | ADMIN                | `{ docenteId, motivoCambio?, confirmarExceso? }` (ver abajo)                                  |
| GET    | `/me/asignacion?periodoId`                      | ESTUDIANTE           | `AsignacionTema` o `null`                                                                     |
| GET    | `/me/tutorias?periodoId`, `/me/carga?periodoId` | DOCENTE              |                                                                                               |

**Control de carga (RN-11):** si el docente supera su límite:

- con `bloquearAlSuperar = true`, la respuesta es `409 CARGA_TUTORIAL_EXCEDIDA`;
- si no, es `409 CARGA_TUTORIAL_ADVERTENCIA`. El front pide confirmación y reenvía la petición con `confirmarExceso: true`.

En ambos casos `detalles` lleva `{ actual, limite, bloquear, origenLimite }`.

### PAT (RF-12 a RF-14, RF-31 a RF-33)

| Método     | Ruta                                    | Rol                                      | Notas                                                                                             |
| ---------- | --------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET / POST | `/periodos/:id/plantillas-pat`          | todos / ADMIN                            | POST multipart: `archivo, version, activar, fechaVigenciaInicio?, fechaVigenciaFin?`              |
| GET        | `/periodos/:id/plantillas-pat/vigente`  | todos                                    |                                                                                                   |
| POST       | `/plantillas-pat/:id/activar`           | ADMIN                                    | Solo una activa por período                                                                       |
| GET        | `/plantillas-pat/:id/descarga`          | todos                                    | URL prefirmada                                                                                    |
| GET / POST | `/asignaciones-tema/:id/documentos-pat` | participantes, tutor, ADMIN / ESTUDIANTE | POST multipart `archivo`. Solo si la última versión está OBSERVADA o RECHAZADA (o no existe)      |
| GET        | `/documentos-pat?periodoId&estado`      | ADMIN                                    | Bandeja de revisión, con `tema` e `integrantes`                                                   |
| GET        | `/documentos-pat/:id/descarga`          | con acceso                               | URL prefirmada                                                                                    |
| POST       | `/documentos-pat/:id/revision`          | ADMIN                                    | `{ resultado, observaciones }`. Observaciones obligatorias si el resultado no es APROBADO (RN-12) |

`DocumentoPat.estado` es un campo derivado: `PENDIENTE` cuando aún no tiene revisión; si la tiene, el resultado de esa revisión.

### Seguimiento, notificaciones, auditoría y reportes

| Método     | Ruta                                                                  | Rol        | Notas                                                        |
| ---------- | --------------------------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| GET        | `/me/seguimiento?periodoId`                                           | ESTUDIANTE | Vista agregada (`Seguimiento`, RF-15)                        |
| GET        | `/me/notificaciones`                                                  | todos      | El front consulta cada 30 s                                  |
| POST       | `/notificaciones/:id/leida`, `/me/notificaciones/leer-todas`          | todos      |                                                              |
| GET        | `/auditoria?entidadTipo&entidadId&accion&q&desde&hasta&page&pageSize` | ADMIN      | Paginado (RF-34, RNF-34)                                     |
| GET / POST | `/exportaciones`                                                      | ADMIN      | POST `{ tipoReporte, formato, periodoId, filtros? }` → `202` |
| GET        | `/exportaciones/:id/descarga`                                         | ADMIN      | `409` si no está listo, `410` si expiró (RNF-33)             |

## Endpoints exclusivos del modo simulado

`GET /auth/usuarios-demo` y `POST /mock/reiniciar` solo existen en MSW. El backend no debe implementarlos.
