# Blocks 2, 3 and 4 — frontend notes

Date: 2026-11-15. Branch: `feat/combobox-busqueda`. HTTP contract: backend
`docs/superpowers/specs/2026-11-15-bloques-2-3-4-design.md`. UI copy stays in Spanish.

## Review fixes (block 1 follow-up)

- `src/features/academico/facultadCarrera.ts`: shared faculty → career narrowing
  (`carrerasDeFacultadElegida`, `carreraTrasCambiarFacultad`, `facultadPorCarrera`), used by the topic
  bank filters, the teachers page and the programas page. The teachers list filters rows with a
  career → faculty map instead of scanning visible careers per row.
- `normalizarBusqueda` uses the escaped range `/[̀-ͯ]/g`.

## Block 2 — forced period transitions

- `evaluarTransicion(transicion, periodo, ahora)` (`features/periodos/reglas.ts`) mirrors the backend
  date guards: `normal` (date reached), `forzable` (returns the date field that moves to now) or
  `bloqueada` (e.g. open with the end date already past; the message tells what to edit).
- Buttons stay enabled whenever the state precondition holds. `forzable` opens
  `TransicionForzadaDialog`: destructive warning naming the date that moves to now plus the
  consequences, required `motivo` (zod, 10–500 chars), body `{ forzar: true, motivo }`. Backend errors
  are shown inside the dialog. `bloqueada` shows the reason inside the normal confirmation.
- History (`Historial`): `*_FORZADA` audit actions get a "Forzada" badge and show the motivo.
- The client clock only guides the UI; the backend re-checks with `clock_timestamp()`.

## Block 3 — reservation and mandatory confirmation

- New enum values `RESERVADO` (topic) and `PENDIENTE_CONFIRMACION` (application) with labels and
  badges; `ESTADO_CONFIRMACION` for each member's answer. `ESTADOS_POSTULACION_ACTIVA` replaces the
  hard-coded active lists. `PostulacionB` maps `confirmaciones` and `vence_en`.
- `ConfirmacionObligatoria` is mounted in `AppShell` for ESTUDIANTE. It polls
  `GET /postulaciones/confirmaciones-pendientes` (60 s) and shows a blocking Radix dialog (no close
  button, ESC and outside clicks prevented, focus trapped, labelled by its title) for the earliest
  reservation: topic, group, representative, deadline and member answers. "Rechazar" switches to a
  warning view with an optional motivo (≤ 500). Any answer or error refetches the list (expired or
  already answered reservations disappear) and invalidates applications, group, topics and `me`.
- Postular shows the reservation/48 h notice before sending and in the success toast. My
  applications, My group and the admin application detail show per-member confirmation status.
  Cancel and "complete tutors" also accept `PENDIENTE_CONFIRMACION`. Close/withdraw topic actions
  accept `RESERVADO`.

## Block 4 — programas and COORDINADOR

- Role `COORDINADOR`: home `/coordinador` (Programas) and `/coordinador/temas` (topic bank).
  `PeriodoProvider` skips `GET /periodos` for this role (backend answers 403) and the header hides
  the period selector.
- `features/programas`: `useProgramas` (filters facultad, carrera, responsable, `mios`, `activo`),
  `useGuardarPrograma`, `useCoordinadores` (ADMIN only: `GET /usuarios` filtered client-side),
  `programaSchema` (exactly one responsable) and `cuerpoPrograma` (ADMIN sends only the chosen
  responsable; COORDINADOR creates with itself and never sends a responsable on edit).
- Programas page (ADMIN and COORDINADOR): filters, topics count vs `max_temas`, edit only when
  `puedeEditarPrograma` (ADMIN, or the COORDINADOR responsible).
- Topics: `FormTema` adds Programa (active programas of the topic's career; required for
  COORDINADOR, only their own) and Categoría; on edit only changed fields are sent. The bank adds a
  Programa filter, a Programa column and an "Agrupar por programa" view. COORDINADOR only edits and
  publishes topics of their programas; import, detail and close/withdraw stay ADMIN-only. The
  student catalog and topic detail show programa and categoría.

## Known limits

- `useCoordinadores` pages through every user because `GET /usuarios` has no role filter.
- Not verified in a real browser against the backend; covered by unit/component tests only.
