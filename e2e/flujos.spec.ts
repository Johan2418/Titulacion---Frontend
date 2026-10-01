import { expect, test } from '@playwright/test'
import { cambiarUsuario, ingresarComo, toast } from './utilidades'

test('login simulado: elegir un usuario lleva a su inicio', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /Ana Rodríguez Paz/ }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Panel del proceso de titulación' })).toBeVisible()
})

test('admin registra un tema y lo publica', async ({ page }) => {
  await ingresarComo(page, 'usr-admin', '/admin/temas')
  await page.getByRole('button', { name: 'Registrar tema' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Título').fill('Sistema de recomendación de cursos electivos')
  await dialogo
    .getByLabel('Descripción')
    .fill('Recomendador basado en filtrado colaborativo para la malla curricular.')
  await dialogo.getByLabel('Línea de investigación').click()
  await page.getByRole('option', { name: 'Inteligencia Artificial' }).click()
  await dialogo.getByLabel('Docente proponente').click()
  await page.getByRole('option', { name: 'Fernando López Arias' }).click()
  await dialogo.getByLabel('Máximo de integrantes').fill('0')
  await dialogo.getByRole('button', { name: 'Registrar tema' }).click()
  await expect(dialogo.getByText('El máximo debe ser al menos 1.')).toBeVisible()
  await dialogo.getByLabel('Máximo de integrantes').fill('2')
  await dialogo.getByRole('button', { name: 'Registrar tema' }).click()
  await toast(page, 'Tema registrado como borrador.')

  await page.getByLabel('Buscar por título o docente…').fill('recomendación de cursos')
  const fila = page.getByRole('row', { name: /Sistema de recomendación de cursos electivos/ })
  await expect(fila.getByText('Borrador')).toBeVisible()
  await fila.getByRole('button', { name: 'Publicar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Publicar' }).click()
  await expect(fila.getByText('Publicado')).toBeVisible()
})

test('estudiante postula individualmente con tutores propuestos', async ({ page }) => {
  await ingresarComo(page, 'usr-est-4', '/estudiante/temas')
  await page
    .getByRole('link', { name: 'Gestor de proyectos de vinculación con la comunidad' })
    .click()
  await page.getByRole('link', { name: 'Postular' }).click()

  await expect(page.getByRole('radio', { name: /Individual/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByLabel('Cumple')).toHaveCount(5)
  await page.getByRole('button', { name: 'Siguiente' }).click()

  // RF-11: el proponente aparece sugerido en primer lugar
  await expect(page.getByText('Docente proponente del tema (sugerido)')).toBeVisible()
  await page.getByLabel('Docente a agregar').click()
  await page.getByRole('option', { name: 'Ricardo Peña Solís' }).click()
  await page.getByRole('button', { name: 'Agregar' }).click()
  await page.getByRole('button', { name: /Subir prioridad de Ricardo/ }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText('1. Ricardo Peña Solís · 2. Patricia Zambrano Ruiz')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar postulación' }).click()

  await toast(page, 'Postulación registrada.')
  await expect(page).toHaveURL(/\/estudiante\/postulaciones$/)
  await expect(page.getByText('Pendiente').first()).toBeVisible()
})

test('estudiante crea grupo e invita; el invitado acepta', async ({ page }) => {
  await ingresarComo(page, 'usr-est-4', '/estudiante/grupo')
  await page.getByLabel('Nombre del grupo').fill('Equipo Torres')
  await page.getByRole('button', { name: 'Crear grupo' }).click()
  await toast(page, 'Grupo creado')
  await page.getByLabel('Estudiante a invitar').click()
  await page.getByRole('option', { name: /Lucía Navarro Bravo/ }).click()
  await page.getByRole('button', { name: 'Invitar' }).click()
  await toast(page, 'Invitación enviada.')

  await cambiarUsuario(page, 'usr-est-15', '/estudiante/grupo')
  await page.getByRole('button', { name: 'Aceptar' }).click()
  await toast(page, 'Te uniste al grupo.')
  await expect(page.getByRole('heading', { name: /Equipo Torres/ })).toBeVisible()
  await expect(page.getByText('2 integrante(s) activo(s)')).toBeVisible()
})

test('admin resuelve un conflicto, asigna el tema y el tutor', async ({ page }) => {
  await ingresarComo(page, 'usr-admin', '/admin/conflictos')
  await page.getByRole('button', { name: 'Registrar resolución' }).click()
  await expect(page.getByText('Seleccione la postulación ganadora.')).toBeVisible()
  await page.getByRole('button', { name: 'Sugerir ganadora según el criterio' }).click()
  await page.getByLabel('Justificación').fill('Se aplicó el orden de llegada.')
  await page.getByRole('button', { name: 'Registrar resolución' }).click()
  await toast(page, 'Conflicto resuelto')
  await expect(page.getByText('No hay conflictos abiertos')).toBeVisible()

  await page.goto('/admin/asignaciones')
  await page.getByRole('tab', { name: /Postulaciones aceptadas por asignar/ }).click()
  await page
    .getByRole('row', { name: /Sistema de detección de intrusiones/ })
    .getByRole('button', { name: 'Detalle' })
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Asignar tema' }).click()
  await toast(page, 'Tema asignado')

  await page.getByRole('tab', { name: 'Asignaciones', exact: true }).click()
  await page
    .getByRole('row', { name: /Sistema de detección de intrusiones/ })
    .getByRole('link', { name: 'Asignar tutor' })
    .click()
  await page.getByLabel('Seleccionar a María José Ortega Villa').check()
  await page.getByRole('button', { name: 'Asignar tutor' }).click()
  await toast(page, /asignado\(a\) como tutor/)
  await expect(
    page.getByRole('table', { name: 'Historial de tutores' }).getByText('María José Ortega Villa'),
  ).toBeVisible()
})

test('control de carga: advertencia y confirmación al superar el límite', async ({ page }) => {
  await ingresarComo(page, 'usr-admin', '/admin/carga')
  // el formulario del límite global aparece cuando carga la configuración
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible()
  await page.getByLabel('Máximo de trabajos').first().fill('1')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await toast(page, 'Configuración de carga guardada.')

  await page.goto('/admin/asignaciones/asg-2')
  await page.getByText(/Asignar directamente otro docente/).click()
  await page.getByLabel('Seleccionar a Elena Cordero Díaz').check()
  await expect(page.getByText('El docente superará su límite')).toBeVisible()
  await page.getByRole('button', { name: 'Asignar tutor' }).click()
  await expect(page.getByRole('dialog', { name: 'Advertencia de carga tutorial' })).toBeVisible()
  await page.getByRole('button', { name: 'Asignar de todos modos' }).click()
  await toast(page, /Elena Cordero Díaz asignado/)
})

test('PAT: el admin observa, el estudiante carga una nueva versión', async ({ page }) => {
  await ingresarComo(page, 'usr-admin', '/admin/pat/revision')
  await page.getByRole('button', { name: 'Revisar' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Resultado').click()
  await page.getByRole('option', { name: 'Observado' }).click()
  await dialogo.getByRole('button', { name: 'Registrar revisión' }).click()
  await expect(dialogo.getByText(/obligatorias al observar o rechazar/)).toBeVisible()
  await dialogo.getByLabel('Observaciones').fill('Incluir la matriz de riesgos.')
  await dialogo.getByRole('button', { name: 'Registrar revisión' }).click()
  await toast(page, 'Revisión registrada.')

  await cambiarUsuario(page, 'usr-est-9', '/estudiante/pat')
  await expect(page.getByText('La versión 2 fue observada')).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({
    name: 'pat.exe',
    mimeType: 'application/x-msdownload',
    buffer: Buffer.from('x'),
  })
  await expect(page.getByText(/Formato no permitido/)).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({
    name: 'PAT-v3.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 v3'),
  })
  await page.getByRole('button', { name: 'Cargar PAT' }).click()
  await toast(page, 'PAT versión 3 cargado')
  await expect(page.getByText('Versión 3 en revisión')).toBeVisible()
})

test('reportes: la exportación se procesa y queda lista para descargar', async ({ page }) => {
  await ingresarComo(page, 'usr-admin', '/admin/reportes')
  await page.getByRole('button', { name: 'Generar' }).click()
  await toast(page, 'Solicitud registrada')
  const fila = page.getByRole('row', { name: /Estudiantes habilitados/ })
  await expect(fila.getByText('En cola')).toBeVisible()
  await expect(fila.getByRole('button', { name: 'Descargar' })).toBeVisible({ timeout: 15_000 })
})

test('un estudiante no accede al módulo de administración', async ({ page }) => {
  await ingresarComo(page, 'usr-est-4', '/admin/temas')
  await expect(page.getByRole('heading', { name: 'Sin permiso' })).toBeVisible()
})

test('navegación móvil con menú lateral @solo-movil', async ({ page }) => {
  await ingresarComo(page, 'usr-est-1', '/estudiante')
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: 'Temas' }).click()
  await expect(page.getByRole('heading', { name: 'Temas de titulación' })).toBeVisible()
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(ancho).toBeLessThanOrEqual(0)
})
