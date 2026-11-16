# Block 1: searchable combobox and faculty filters

## Goal

Make long dropdowns usable (search as you type) and let admins narrow lists by faculty.

## A) Searchable `SelectSimple`

- `SelectSimple` in `src/components/Campo.tsx` is rewritten on the shadcn Combobox pattern
  (`@radix-ui/react-popover` + `cmdk`). Its public API is unchanged, so the ~20 call sites
  need no edits.
- New shadcn-style primitives: `ui/popover.tsx` and `ui/command.tsx`.
- Trigger is a `<button role="combobox">` with `aria-expanded`; `id` and `aria-*` props are
  forwarded, so `<Label htmlFor>` and error descriptions keep working. The popover is as wide as
  the trigger.
- Filtering matches on the option label, ignoring case and diacritics (NFD + strip marks), so
  "ingenieria" finds "Ingeniería". Empty state: "Sin resultados".
- `todos` stays the first item and maps to `''` (the `TODOS` sentinel is internal).
  Disabled options are not selectable; `disabled` disables the whole control.
- The two native `<select>` in `pages/estudiante/Pat.tsx` now use `SelectSimple`.
- Tests: jsdom polyfills (`ResizeObserver`, `scrollIntoView`, pointer capture) live in
  `src/test/setup.ts`. cmdk exposes `listbox`/`option` roles, so most existing tests kept working.

### Dependency note

`@radix-ui/react-popover@1.3.1` requires newer `dismissable-layer`/`focus-scope` than the
installed Dialog/Select/DropdownMenu/Tooltip. With two copies of those layers, a popover inside
a Dialog closed itself immediately (focus trap conflict). Dialog, Select, DropdownMenu and
Tooltip were bumped (same major) so Radix internals dedupe to one copy.

## B) Faculty filters

- Temas bank: new `facultadId` filter, sent as `facultad_id` (the HTTP client snake-cases keys)
  and part of the query key. Choosing a faculty restricts the career options to that faculty
  and clears a selected career that falls outside it. Career options carry their `facultadId`
  (from `opcionesCarrerasConFacultad`).
- Admin Docentes: the backend list only has `carrera_id` and the page already filters careers
  client-side, so the faculty filter is client-side too, with the same career-clearing rule.
- Skipped: admin Habilitados (its careers belong to a single faculty, the period's, so a
  faculty filter adds nothing) and student CatalogoTemas (no career filter; the server forces
  the student's career).
