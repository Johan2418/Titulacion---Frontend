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

Ver la sección [Autenticación](#autenticación-coordinación-con-el-backend) para las respuestas de error y la transición por etapas.

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

## Autenticación (coordinación con el backend)

El frontend obtiene el token del proveedor institucional (OIDC, authorization code + PKCE) y lo envía en cada petición. El backend valida el token y decide qué puede hacer el usuario. El front nunca valida firmas ni decide roles.

### Respuestas de `GET /auth/me` y cómo las trata el front

| Respuesta del backend                                      | `code` sugerido         | Qué hace el front                                                                |
| ---------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `200` con usuario y `rol` (`SesionUsuario`)                | —                       | Entra a `/estudiante`, `/docente` o `/admin` según el rol                        |
| `200` con solo `{ subject, issuer }` (etapa 3 del backend) | —                       | Pantalla "Tu cuenta no está registrada": hay identidad pero no perfil            |
| `401` token ausente, vencido o inválido                    | `TOKEN_INVALIDO`        | Descarta el token local y vuelve al ingreso con el aviso "Tu sesión expiró…"     |
| `403` identidad válida sin usuario registrado              | `USUARIO_NO_REGISTRADO` | Pantalla "Tu cuenta no está registrada", con opción de ingresar con otra cuenta  |
| `503` autenticación sin configurar o JWKS inaccesible      | `AUTH_NO_DISPONIBLE`    | Pantalla "No pudimos verificar tu sesión" con **Reintentar**; no borra la sesión |

Un `401` en **cualquier** otro endpoint también invalida la sesión local. Un `503` en otros endpoints se muestra como notificación.

El front acepta el cuerpo de error por defecto de NestJS (`{ statusCode, message, error }`); si falta `code`, usa `HTTP_<status>`. Aun así, se recomienda enviar el `code` en los errores de autenticación para no depender del texto del mensaje.

### Transición por etapas

1. **Etapa 3 (validación JWT, sin usuarios):** `/auth/me` devuelve `{ subject, issuer }`. El front lo reconoce y muestra "cuenta no registrada", así que conectar esta etapa no rompe nada, aunque nadie puede entrar todavía.
2. **Etapa de usuarios:** `/auth/me` debe devolver `SesionUsuario` (`id`, `email`, `nombres`, `apellidos`, `rol`, `estado`, `estudianteId`, `docenteId`). Una identidad válida sin registro debe responder `403 USUARIO_NO_REGISTRADO`.

### Requisitos para conectar front y backend

- **CORS:** si front y API están en dominios distintos, el backend debe permitir el origen del front, la cabecera `Authorization` y el _preflight_ `OPTIONS`. Si el front se sirve detrás del mismo dominio (proxy `/api/` en Nginx), no hace falta.
- **Configuración alineada:**

  | Front (`.env`)                              | Backend (`.env`) | Deben coincidir en                               |
  | ------------------------------------------- | ---------------- | ------------------------------------------------ |
  | `VITE_OIDC_AUTHORITY`                       | `OIDC_ISSUER`    | El emisor (`iss`) de los tokens                  |
  | Scope de la API dentro de `VITE_OIDC_SCOPE` | `OIDC_AUDIENCE`  | La audiencia (`aud`) del token que pide el front |
  | —                                           | `JWKS_URI`       | Las claves del mismo emisor                      |

  Si no coinciden, todas las peticiones responderán `401`.

### Notas si el proveedor es Microsoft Entra ID (Microsoft 365)

- **Emisor (v2):** `https://login.microsoftonline.com/<TENANT_ID>/v2.0`. JWKS: `https://login.microsoftonline.com/<TENANT_ID>/discovery/v2.0/keys`. Las firmas son `RS256`.
- **Identificador estable:** en Entra el `sub` es distinto para cada aplicación cliente. El identificador estable del usuario es `oid` (junto con `tid`); conviene usarlo para `id_externo_sso` en la etapa de usuarios.
- **Audiencia:** según la versión de token configurada en el registro de la API (`accessTokenAcceptedVersion`), `aud` llega como el GUID de la aplicación o como `api://...`. `OIDC_AUDIENCE` debe ser exactamente lo que llega.
- **Tipo de token:** el front debe pedir un token para la API propia (p. ej. `api://<id>/access_as_user`), no para Microsoft Graph. Los tokens de Graph no son validables por terceros.

## Endpoints exclusivos del modo simulado

`GET /auth/usuarios-demo` y `POST /mock/reiniciar` solo existen en MSW. El backend no debe implementarlos.
