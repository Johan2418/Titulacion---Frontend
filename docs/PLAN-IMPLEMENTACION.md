# Plan de implementación — Frontend del Sistema de Gestión del Proceso de Titulación

## Contexto
El repositorio `Titulacion---Frontend` está vacío (solo `README.md`). Hay que construir **solo el frontend** del sistema descrito en la *Especificación de Requisitos* (RF-01…RF-39, RNF-01…RNF-34, RN-01…RN-13) y el *DER corregido*. El backend (NestJS + PostgreSQL, API REST con OpenAPI) se construye en otro repositorio con los mismos documentos. El front consume esa API; mientras no exista, se trabaja con mocks (MSW) que respetan el DER.

Decisiones tomadas: **React + TypeScript** (RNF-22), **shadcn/ui + Tailwind**, **MSW** para simular la API.

Fuera de alcance del front (son del backend): transacciones, bloqueos, colas, hash SHA-256, backups, almacenamiento de objetos, envío de correos. El front solo los **refleja** (estados, mensajes de error, descargas por URL prefirmada).

---

## 1. Stack
| Área | Elección |
|---|---|
| Build | Vite + React 19 + TypeScript estricto |
| Routing | React Router (rutas anidadas por rol, loaders con guardas) |
| Datos servidor | TanStack Query (caché, invalidación, polling de exportaciones/importaciones) |
| HTTP | Cliente `fetch`/axios con interceptor de JWT y manejo uniforme de errores |
| Formularios | React Hook Form + Zod (validaciones espejo de los CHECK del DER) |
| UI | Tailwind + shadcn/ui (Radix → accesibilidad WCAG 2.1 AA, RNF-15) |
| Tablas | TanStack Table (filtros, orden, paginación) |
| Auth | `oidc-client-ts` (OIDC institucional, PKCE; RNF-01/18) |
| Fechas | date-fns + date-fns-tz, zona horaria de la institución (RNF-30) |
| Mocks | MSW + datos semilla tipados según el DER |
| Tests | Vitest + Testing Library (unit/componentes), Playwright (E2E), axe-core (a11y) |
| Calidad | ESLint, Prettier, Husky + lint-staged, CI en GitHub Actions |
| Despliegue | Dockerfile multi-stage (build → Nginx) (RNF-26) |
| Errores | Sentry u otro (opcional, RNF-29) |

## 2. Estructura del proyecto (feature-based)
```
src/
  app/            # providers (Query, Auth, Theme), router, layout
  api/            # cliente HTTP, tipos generados/compartidos, endpoints por recurso
  auth/           # OIDC, sesión, guardas por rol (RoleGuard), hook useAuth
  components/ui/  # shadcn/ui
  components/     # comunes: DataTable, StatusBadge, FileUpload, ConfirmDialog, EmptyState, PageHeader
  features/
    periodos/ estudiantes-habilitados/ docentes/ lineas/ temas/
    grupos/ invitaciones/ postulaciones/ conflictos/ asignaciones/
    tutores/ carga-tutorial/ pat/ reportes/ historial/ notificaciones/
  pages/
    estudiante/ docente/ admin/
  mocks/          # MSW handlers + seeds + "db" en memoria
  lib/            # fechas, formatos, enums → etiquetas/colores, utilidades
  types/          # tipos de dominio (entidades y enums del DER)
```
Cada feature contiene: `api.ts` (queries/mutations), `schemas.ts` (Zod), `components/`, `hooks/`.

## 3. Modelo de dominio en el front (`src/types`)
Tipos TS de cada entidad del DER y sus enums, que alimentan mocks, formularios y badges:
- `Usuario.rol`: ESTUDIANTE | DOCENTE | ADMIN; `estado`: ACTIVO | INACTIVO
- `PeriodoTitulacion.estado`: BORRADOR | POSTULACION_ABIERTA | POSTULACION_CERRADA | EN_CURSO | ARCHIVADO
- `EstudianteHabilitado`: origen (MANUAL/IMPORTACION/SINCRONIZACION), estado (HABILITADO/SUSPENDIDO), condicion_ingreso (REGULAR/CONDICIONADO), situacion_ingreso (PENDIENTE/ADMITIDO/NO_ADMITIDO)
- `Grupo.estado`: EN_CONFORMACION | ACTIVO | DISUELTO | ANULADO; `GrupoIntegrante` rol_en_grupo REPRESENTANTE/INTEGRANTE, estado ACTIVO/RETIRADO
- `Invitacion.estado`: PENDIENTE | ACEPTADA | RECHAZADA | CANCELADA | EXPIRADA
- `Tema.estado`: BORRADOR | PUBLICADO | CERRADO | ASIGNADO | RETIRADO
- `Postulacion.estado`: PENDIENTE | EN_CONFLICTO | ACEPTADA | RECHAZADA | CANCELADA | ANULADA
- `AsignacionTema.estado`: VIGENTE | ANULADA; causa_anulacion INCUMPLIMIENTO_CONDICION | OTRA
- `AsignacionTutor`: tipo PROPUESTO_CONFIRMADO | ASIGNADO_DIRECTO; estado VIGENTE | REEMPLAZADA | ANULADA
- `ResolucionConflicto.criterio`: ORDEN_LLEGADA | PROMEDIO | SORTEO | DECISION_COMISION
- `DocumentoPat.formato` PDF | DOCX; `RevisionPat.resultado` OBSERVADO | APROBADO | RECHAZADO
- `SolicitudExportacion`: tipo_reporte (ESTUDIANTES, GRUPOS, TEMAS_OFERTADOS, TEMAS_ASIGNADOS, TEMAS_DISPONIBLES, DOCENTES, CARGA_TUTORIAL), formato PDF|XLSX|CSV, estado EN_COLA|PROCESANDO|LISTO|FALLIDO
- `LoteImportacion`: tipo ESTUDIANTES|DOCENTES, estado EN_PROCESO|COMPLETADO|COMPLETADO_CON_ERRORES|FALLIDO
- `Notificacion` (canal EN_APP/EMAIL, leida), `Auditoria`, `TemaHistorial`, `PlantillaPat`, `ConfigCargaTutorial`, `TutorPropuesto`, `LineaInvestigacion`, `Docente`, `Estudiante`

Un mapa central `lib/estados.ts` da etiqueta en español + variante de color de badge por enum (consistencia visual en todo el sistema).

## 4. Transversales
1. **Autenticación (RNF-01/17/18):** login vía OIDC institucional (redirect + PKCE), callback, refresh silencioso, logout. El token se adjunta como Bearer. En modo mock, pantalla de login simulada para elegir usuario/rol.
2. **Autorización (RNF-03/04):** `RoleGuard` en rutas y menú filtrado por rol. El front oculta lo que no corresponde; el backend es la autoridad. 401 → re-login, 403 → página "sin permiso".
3. **Contexto de período:** selector global de período (admin) / período vigente del estudiante; la mayoría de consultas dependen de `periodo_id`.
4. **Errores (RNF-16):** formato de error del backend normalizado (código de regla + mensaje) y mapeado a mensajes claros en español, mostrando la regla incumplida (ej. "El grupo debe tener entre 2 y 4 integrantes (RN-05)"). Toasts + errores en línea en formularios.
5. **Validación cliente:** Zod replica los CHECK del DER para feedback temprano (fechas de período en orden, `max ≥ min ≥ 1`, observaciones obligatorias al OBSERVAR/RECHAZAR, archivos PDF/DOCX + tamaño máximo).
6. **Archivos (RNF-09/12/14):** componente `FileUpload` (drag & drop, valida extensión/MIME/tamaño, barra de progreso). Descargas mediante URL prefirmada que devuelve el backend.
7. **Fechas (RNF-30):** todas las fechas en hora local de la institución con helper único.
8. **Notificaciones (RF-16):** campana en el header con contador de no leídas (polling con TanStack Query), lista y marcar como leída.
9. **Accesibilidad y responsive (RNF-15/16/27):** navegación por teclado, foco visible, contraste AA, `aria-*`, layout móvil (sidebar colapsable), pruebas axe en CI.
10. **Layout:** `AppShell` con sidebar por rol, header (período, notificaciones, usuario), breadcrumbs.

## 5. Módulos y pantallas

### Estudiante (`/estudiante`)
| Pantalla | Requisitos | Contenido |
|---|---|---|
| Inicio / Seguimiento | RF-15 | Tarjetas de estado: situación de ingreso (si CONDICIONADO), grupo, postulación, asignación de tema, tutor, PAT (timeline del proceso) |
| Catálogo de temas | RF-05, RF-07 | Lista de temas PUBLICADOS con filtros (línea, docente, nº integrantes, disponibilidad) y badge de disponibilidad + nº postulaciones abiertas |
| Detalle de tema | RF-06, RF-07 | Título, descripción, línea, docente proponente, min/max, estado; botón "Postular" habilitado solo si aplica |
| Mi grupo | RF-01, RF-03 | Crear grupo (queda como representante), ver integrantes, estado; composición bloqueada tras postular |
| Invitaciones | RF-02 | Representante: buscar estudiantes habilitados del período e invitar, cancelar. Invitado: aceptar/rechazar. Estados y expiración |
| Postular (wizard) | RF-04, RF-08, RF-09, RF-10, RF-11 | Paso 1: modalidad (individual si tema admite 1 / grupal si es representante). Paso 2: validación de rango de integrantes y fechas del período. Paso 3: proponer tutores ordenados por prioridad (drag & drop) con el docente proponente sugerido primero. Paso 4: confirmar |
| Mi postulación | RF-15 | Estado, tutores propuestos, cancelar si PENDIENTE |
| PAT | RF-12, RF-13, RF-14 | Descargar plantilla vigente; subir PAT (solo con asignación vigente); historial de versiones con su revisión y observaciones; subir nueva versión si OBSERVADO/RECHAZADO |

### Docente (`/docente`)
| Pantalla | Requisitos | Contenido |
|---|---|---|
| Mis temas | RF-37 | Temas que propuso, estado y postulaciones recibidas |
| Mis tutorías | RF-38 | Estudiantes/grupos asignados como tutor, tema, estado del PAT |
| Mi carga | RF-39 | Carga actual vs. límite (barra de progreso; aviso si advierte/bloquea) |

### Administrador (`/admin`)
| Pantalla | Requisitos | Contenido |
|---|---|---|
| Dashboard | — | KPIs del período: habilitados, condicionados pendientes, temas por estado, postulaciones, conflictos abiertos, PAT por revisar |
| Períodos | RF-17 | CRUD, fechas (validadas), máx. integrantes por defecto, transiciones de estado; bloqueo visual de "Iniciar titulación" si hay condicionados PENDIENTE |
| Estudiantes habilitados | RF-18 | Tabla por período, alta manual, importación (subir archivo → `lote_importacion` con progreso, filas OK/error y descarga de errores), condición REGULAR/CONDICIONADO, resolver ingreso (ADMITIDO/NO_ADMITIDO con observación) mostrando efecto de anulación (RN-03) |
| Docentes | RF-19 | Alta/importación, marcar habilitado para tutoría |
| Líneas de investigación | (catálogo DER) | CRUD simple, activo/inactivo |
| Temas | RF-20, RF-21 | Registrar (período, línea, docente proponente, min/max), editar, publicar, cerrar, retirar; pestaña de historial (`tema_historial`) |
| Postulaciones | RF-22, RF-26 | Filtros por período/tema/estado/modalidad; detalle con integrantes y tutores propuestos (prioridad, marca "proponente") |
| Conflictos | RF-23 | Temas con varias postulaciones válidas; formulario de resolución: criterio, puntaje por participante, ganadora, justificación |
| Asignaciones de tema | RF-24, RF-25 | Asignar desde postulación ACEPTADA (aviso: el tema pasa a ASIGNADO y se rechazan las demás); anular con causa y motivo; cierre manual |
| Asignación de tutor | RF-27, RF-28, RF-30 | Lista de propuestos (proponente primero) o docente habilitado directo; muestra carga actual vs. límite; advertencia o bloqueo; reemplazo con motivo e historial |
| Carga tutorial | RF-29 | Límite global del período y límites por docente; modo advertir/bloquear |
| Revisión de PAT | RF-31, RF-32 | Bandeja de versiones pendientes; visor/descarga; resultado con observaciones obligatorias si OBSERVADO/RECHAZADO |
| Plantillas PAT | RF-33 | Subir/versionar por período, activar una (solo una activa) |
| Historial / Auditoría | RF-34 | Línea de tiempo por entidad (tema, postulación, asignación, PAT, ingreso) + bitácora de auditoría con valores anteriores/nuevos (JSON diff) |
| Reportes y exportación | RF-35, RF-36 | Elegir tipo de reporte + filtros + formato; lista de solicitudes con estado (polling) y descarga cuando LISTO; indicación de expiración |

## 6. Capa API y mocks
- `api/client.ts`: base URL por `VITE_API_URL`, Bearer token, normalización de errores, paginación estándar.
- Un archivo de endpoints por recurso (`api/temas.ts`, `api/postulaciones.ts`, …) + hooks de TanStack Query con *query keys* centralizadas.
- **Contrato con el backend:** acordar con el repo backend las rutas REST, formato de paginación y de error. Cuando su OpenAPI esté disponible (RNF-24), sustituir los tipos manuales por tipos generados (`openapi-typescript`) sin cambiar las features.
- `mocks/`: base de datos en memoria con seeds coherentes (1 período abierto, ~20 estudiantes —algunos condicionados—, ~8 docentes, líneas, temas en varios estados, grupos, postulaciones, un conflicto, asignaciones, PAT con revisiones). Los handlers aplican las **reglas de negocio principales** (RN-04 a RN-08, RN-11, RN-12) para que el flujo sea realista y las respuestas de error tengan el mismo formato que el backend.
- Activación con `VITE_USE_MOCKS=true`.

## 7. Fases de implementación
1. **Fase 0 – Base:** scaffolding Vite/TS, Tailwind + shadcn, ESLint/Prettier, Vitest, router, AppShell, tipos del dominio, mapa de estados, cliente HTTP, MSW con seeds, login mock + guardas por rol, CI (lint, typecheck, test, build), Dockerfile.
2. **Fase 1 – Catálogos admin:** períodos, líneas, docentes, estudiantes habilitados (incl. importación), carga tutorial, plantillas PAT.
3. **Fase 2 – Temas:** registro y gestión admin + historial; catálogo/detalle estudiante; "Mis temas" docente.
4. **Fase 3 – Grupos e invitaciones** (RF-01…03).
5. **Fase 4 – Postulación** (wizard estudiante, tutores propuestos) y consulta admin (RF-04, 08–11, 22, 26).
6. **Fase 5 – Conflictos y asignaciones** de tema y tutor con control de carga (RF-23…25, 27, 28, 30); vistas docente RF-38/39.
7. **Fase 6 – PAT:** carga, versiones, revisión y observaciones (RF-12…14, 31, 32).
8. **Fase 7 – Seguimiento, notificaciones, historial/auditoría, dashboard** (RF-15, 16, 34).
9. **Fase 8 – Reportes y exportación** (RF-35, 36).
10. **Fase 9 – Integración real:** OIDC institucional, apuntar a backend real, tipos OpenAPI, E2E contra backend, pulido de a11y y responsive.

Cada fase deja pantallas funcionales contra MSW y sus pruebas.

## 8. Archivos clave a crear (Fase 0)
`package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind` config, `components.json` (shadcn), `src/main.tsx`, `src/app/router.tsx`, `src/app/providers.tsx`, `src/app/layout/AppShell.tsx`, `src/auth/AuthProvider.tsx`, `src/auth/RoleGuard.tsx`, `src/api/client.ts`, `src/types/*.ts`, `src/lib/estados.ts`, `src/lib/fechas.ts`, `src/mocks/{browser,handlers,db,seeds}.ts`, `.env.example`, `Dockerfile`, `nginx.conf`, `.github/workflows/ci.yml`, `README.md` (cómo ejecutar, variables, mocks).

## 9. Verificación
- `npm run lint && npm run typecheck && npm test && npm run build` en local y CI.
- `npm run dev` con `VITE_USE_MOCKS=true`: recorrer los flujos E2E con Playwright:
  1. Admin crea período y tema → publica.
  2. Estudiante crea grupo, invita, el invitado acepta, postula con tutores propuestos.
  3. Admin resuelve conflicto, asigna tema (tema pasa a ASIGNADO, otras postulaciones rechazadas) y tutor (aviso de carga).
  4. Estudiante sube PAT → admin observa con observaciones → estudiante sube v2 → aprobado.
  5. Admin solicita reporte → pasa a LISTO → descarga.
- Pruebas unitarias de esquemas Zod (rangos de integrantes, fechas, observaciones obligatorias) y de guardas por rol (RNF-23 en lo que toca al front).
- axe-core en E2E sin violaciones AA; revisión en viewport móvil.
