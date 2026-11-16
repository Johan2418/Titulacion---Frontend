import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import type { PeriodoTitulacion } from '@/types/dominio'
import { cuerpoCambioEstado } from './api'
import { TransicionForzadaDialog } from './TransicionForzadaDialog'

const post = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', async (original) => {
  const real = await original<typeof import('@/api/client')>()
  return { ...real, api: { ...real.api, post } }
})

const periodo = {
  id: 'p1',
  codigo: '2027-1',
  fechaInicioPostulacion: '2026-11-10T00:00:00Z',
  fechaFinPostulacion: '2026-11-20T00:00:00Z',
  fechaInicioTitulacion: '2026-11-25T00:00:00Z',
  estado: 'POSTULACION_ABIERTA',
} as PeriodoTitulacion

function renderDialogo() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <TransicionForzadaDialog
        periodo={periodo}
        transicion="cerrar"
        campo="fechaFinPostulacion"
        etiqueta="Cerrar postulación"
      />
    </QueryClientProvider>,
  )
}

const abrir = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar postulación' }))
  return screen.getByRole('dialog')
}

describe('TransicionForzadaDialog', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('advierte qué fecha se mueve a ahora y sus consecuencias', async () => {
    renderDialogo()
    const dialogo = await abrir()
    expect(dialogo).toHaveTextContent(
      'la fecha fin de postulación se moverá a la fecha y hora actuales',
    )
    expect(dialogo).toHaveTextContent('reservas de temas')
  })

  it('exige un motivo de 10 a 500 caracteres antes de llamar al backend', async () => {
    renderDialogo()
    await abrir()
    await userEvent.type(screen.getByLabelText(/Motivo/), 'corto')
    await userEvent.click(screen.getByRole('button', { name: 'Forzar y cerrar postulación' }))
    expect(await screen.findByText('Explique el motivo (mínimo 10 caracteres).')).toBeVisible()
    expect(post).not.toHaveBeenCalled()
  })

  it('envía { forzar: true, motivo } a la acción del período', async () => {
    post.mockResolvedValue({ ...periodo, estado: 'POSTULACION_CERRADA' })
    renderDialogo()
    await abrir()
    await userEvent.type(screen.getByLabelText(/Motivo/), '  Cierre anticipado por calendario.  ')
    await userEvent.click(screen.getByRole('button', { name: 'Forzar y cerrar postulación' }))
    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith('/periodos/p1/cerrar-postulacion', {
        forzar: true,
        motivo: 'Cierre anticipado por calendario.',
      }),
    )
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('muestra el error del backend dentro del diálogo', async () => {
    post.mockImplementation(() =>
      Promise.reject(
        new ApiError({
          statusCode: 409,
          code: 'HTTP_409',
          message: 'No se puede forzar el cierre: la fecha de inicio de postulación aún no llega.',
        }),
      ),
    )
    renderDialogo()
    await abrir()
    await userEvent.type(screen.getByLabelText(/Motivo/), 'Motivo suficientemente largo')
    await userEvent.click(screen.getByRole('button', { name: 'Forzar y cerrar postulación' }))
    expect(
      await screen.findByText(
        'No se puede forzar el cierre: la fecha de inicio de postulación aún no llega.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('cuerpoCambioEstado', () => {
  it('archivar envía el motivo; la transición normal, un cuerpo vacío', () => {
    expect(cuerpoCambioEstado({ id: 'p', estado: 'ARCHIVADO', motivo: 'x' })).toEqual({
      motivo: 'x',
    })
    expect(cuerpoCambioEstado({ id: 'p', estado: 'EN_CURSO' })).toEqual({})
  })
  it('la transición forzada envía forzar y el motivo recortado', () => {
    expect(
      cuerpoCambioEstado({ id: 'p', estado: 'EN_CURSO', forzar: true, motivo: ' motivo largo ' }),
    ).toEqual({ forzar: true, motivo: 'motivo largo' })
  })
})
