import { expect, type Page } from '@playwright/test'

/** Inicia sesión en modo mock fijando el token del usuario demo. */
export async function ingresarComo(page: Page, usuarioId: string, ruta = '/') {
  await page.addInitScript((u) => {
    if (!sessionStorage.getItem('titulacion.mockToken'))
      sessionStorage.setItem('titulacion.mockToken', `mock:${u}`)
  }, usuarioId)
  await page.goto(ruta)
  await expect(page.locator('main h1').first()).toBeVisible()
}

export async function cambiarUsuario(page: Page, usuarioId: string, ruta: string) {
  await page.evaluate((u) => sessionStorage.setItem('titulacion.mockToken', `mock:${u}`), usuarioId)
  await page.goto(ruta)
  await expect(page.locator('main h1').first()).toBeVisible()
}

export const toast = (page: Page, texto: string | RegExp) =>
  expect(page.locator('[data-sonner-toast]').filter({ hasText: texto }).first()).toBeVisible()
