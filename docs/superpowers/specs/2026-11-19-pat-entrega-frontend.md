# PAT delivery wizard — frontend notes

Date: 2026-11-19. Branch: `feat/pat-entrega`. HTTP contract: backend
`docs/superpowers/specs/2026-11-19-pat-automatico-design.md`. UI copy stays in Spanish.

## Student page (`/estudiante/pat`)

`src/pages/estudiante/Pat.tsx` only resolves the current assignment and renders
`AsistenteEntregaPat` (`src/features/pat/`). The three former cards are replaced by one guided wizard:

| Step                  | Component            | Data                                                                                                                                                                                                                                                                                                                |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Resumen automático | `PasoResumen`        | `GET P/resumen` → `automaticos` (read-only, note: corrections go through ADMIN). Without a current tutor, a select over `tutores_propuestos.data` saves `PATCH P { tutor_propuesto_id }`.                                                                                                                           |
| 2. Datos faltantes    | `PasoDatosFaltantes` | RHF + zod (`datosFaltantesSchema`), prefilled from `editables`. Personal fields → `PATCH /estudiantes/me/datos-pat`; problemática, confirmation and articulación → `PATCH P`. Only dirty parts are sent. Fields in `pendientes` are marked `aria-invalid` with "Dato pendiente".                                    |
| 3. Entregar           | `PasoEntregar`       | `GET P/generaciones` (history, replaces `sessionStorage`), polling `GET P/generaciones/:id` every 3 s only while the latest one is `EN_COLA`/`PROCESANDO`; `POST .../reintentar` on `FALLIDO`; `POST .../entregar` after a confirm dialog; optional signed upload (`POST .../documentos-pat` with `generacion_id`). |

Gating: step 3 is disabled while `pendientes` is non-empty. "Guardar y continuar" saves, refetches the
summary and advances only when no pendientes remain; otherwise it lists what is still missing
(including ADMIN-only keys such as `extension_pat`). A student with no pendientes opens on step 3.

Delivery state (latest own document): `PENDIENTE` and `APROBADO` block new deliveries; `OBSERVADO` and
`RECHAZADO` show the observations and allow generating and delivering again. A generation already
delivered (`documento_pat_id`) is not offered for delivery again.

## Errors

`src/features/pat/mensajes.ts` maps plain pending keys (`correo_personal`, `extension_pat`, …) to
Spanish labels, renders the `400 { pendientes }` of generation as a sentence and translates common
class-validator messages. Spanish backend messages (409s) are shown as-is.

## Admin

`DocumentoPat.origen` (`GENERADO` | `FIRMADO`, defaults to `FIRMADO` when absent) is shown with
`ORIGEN_PAT` badges ("Generado sin firma" / "Firmado") in the review inbox, the review dialog and the
version history.

## Removed

`useDatosPat`, `useContenidoPat` (superseded by `useResumenPat`) and the
`pat.generacion.{user}.{pid}.{aid}` `sessionStorage` key. `curso` and `modalidad_academica` are no
longer asked from the student.
