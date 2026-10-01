import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { ingresarComo } from './utilidades'

/** RNF-15: WCAG 2.1 AA en las pantallas principales. */
const PANTALLAS: [string, string][] = [
  ['usr-est-1', '/estudiante'],
  ['usr-est-1', '/estudiante/temas'],
  ['usr-est-1', '/estudiante/grupo'],
  ['usr-est-9', '/estudiante/pat'],
  ['usr-doc-6', '/docente/tutorias'],
  ['usr-admin', '/admin'],
  ['usr-admin', '/admin/habilitados'],
  ['usr-admin', '/admin/temas'],
  ['usr-admin', '/admin/conflictos'],
  ['usr-admin', '/admin/asignaciones/asg-2'],
]

for (const [usuario, ruta] of PANTALLAS) {
  test(`sin violaciones WCAG 2.1 AA: ${ruta} @movil`, async ({ page }) => {
    await ingresarComo(page, usuario, ruta)
    await page.waitForLoadState('networkidle')
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      r.violations.map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(' | ')}`,
      ),
    ).toEqual([])
  })
}

test('login sin violaciones WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Ana Rodríguez/ })).toBeVisible()
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(r.violations.map((v) => v.id)).toEqual([])
})
