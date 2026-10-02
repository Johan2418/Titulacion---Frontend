import { expect, test } from '@playwright/test'

/** Respuestas de `GET /auth/me` acordadas con el backend (ver docs/API-CONTRATO.md). */
test.describe('estados de sesión', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByText('Escenarios de autenticación').click()
  })

  test('403: cuenta no registrada', async ({ page }) => {
    await page.getByRole('button', { name: /Cuenta no registrada/ }).click()
    await expect(page.getByRole('heading', { name: 'Tu cuenta no está registrada' })).toBeVisible()
    await page.getByRole('button', { name: 'Ingresar con otra cuenta' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('identidad sin perfil (etapa actual del backend) se trata como no registrada', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Solo identidad verificada/ }).click()
    await expect(page.getByRole('heading', { name: 'Tu cuenta no está registrada' })).toBeVisible()
  })

  test('503: autenticación no disponible permite reintentar sin perder la sesión', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Autenticación no disponible/ }).click()
    await expect(
      page.getByRole('heading', { name: 'No pudimos verificar tu sesión' }),
    ).toBeVisible()
    // el servicio se recupera: el mismo token vuelve a ser válido
    await page.evaluate(() => sessionStorage.setItem('titulacion.mockToken', 'mock:usr-admin'))
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(
      page.getByRole('heading', { name: 'Panel del proceso de titulación' }),
    ).toBeVisible()
  })
})

test('401 durante la sesión: vuelve al ingreso con aviso', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /Ana Rodríguez Paz/ }).click()
  await expect(page.getByRole('heading', { name: 'Panel del proceso de titulación' })).toBeVisible()
  // el token deja de ser válido (expiró o fue revocado)
  await page.evaluate(() => sessionStorage.setItem('titulacion.mockToken', 'mock:token-vencido'))
  await page.getByRole('link', { name: 'Temas' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Tu sesión expiró o no es válida. Vuelve a ingresar.')).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('titulacion.mockToken'))).toBeNull()
})
