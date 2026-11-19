import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import type { ConfirmacionPendiente } from '@/types/dominio'
import { cuerpoRespuestaConfirmacion } from './api'
import { ConfirmacionObligatoria } from './ConfirmacionObligatoria'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/client', async (original) => {
  const real = await original<typeof import('@/api/client')>()
  return { ...real, api: { ...real.api, get, post } }
})

const { cerrarSesion } = vi.hoisted(() => ({ cerrarSesion: vi.fn() }))
vi.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ cerrarSesion }) }))

const pendiente: ConfirmacionPendiente = {
  postulacionId: 'po1',
  periodoId: 'p1',
  estadoPostulacion: 'PENDIENTE_CONFIRMACION',
  fechaPostulacion: '2026-11-15T10:00:00Z',
  venceEn: '2026-11-17T10:00:00Z',
  tema: { id: 't1', titulo: 'Visión artificial', tipo: 'GRUPO', estado: 'RESERVADO' },
  grupo: { id: 'g1', nombre: 'Equipo Alfa' },
  representante: { id: 'u1', nombres: 'Ana', apellidos: 'Mora' },
  miConfirmacion: { estado: 'PENDIENTE', respondidaEn: null },
  confirmaciones: [
    {
      estudianteId: 'e1',
      nombres: 'Ana',
      apellidos: 'Mora',
      estado: 'CONFIRMADA',
      respondidaEn: '2026-11-15T10:00:00Z',
    },
    {
      estudianteId: 'e2',
      nombres: 'Luis',
      apellidos: 'Vega',
      estado: 'PENDIENTE',
      respondidaEn: null,
    },
  ],
}

function renderModal() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={qc}>
      <ConfirmacionObligatoria />
    </QueryClientProvider>,
  )
}

describe('ConfirmacionObligatoria', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    cerrarSesion.mockReset()
  })

  it('no muestra nada sin reservas pendientes', async () => {
    get.mockResolvedValue([])
    renderModal()
    await vi.waitFor(() =>
      expect(get).toHaveBeenCalledWith('/postulaciones/confirmaciones-pendientes'),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('bloquea con un diálogo rotulado que no se cierra con ESC ni tiene «X»', async () => {
    get.mockResolvedValue([pendiente])
    renderModal()
    const dialogo = await screen.findByRole('dialog', { name: 'Confirma el tema reservado' })
    expect(dialogo).toHaveTextContent('Visión artificial')
    expect(dialogo).toHaveTextContent('Equipo Alfa')
    expect(dialogo).toHaveTextContent('Ana Mora')
    expect(dialogo).toHaveAccessibleDescription(/antes del/)
    expect(within(dialogo).queryByRole('button', { name: 'Cerrar' })).toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('confirma el tema y se cierra cuando ya no quedan reservas', async () => {
    get.mockResolvedValueOnce([pendiente]).mockResolvedValue([])
    post.mockResolvedValue({ ...pendiente, miConfirmacion: { estado: 'CONFIRMADA' } })
    renderModal()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar tema' }))
    expect(post).toHaveBeenCalledWith('/postulaciones/po1/confirmar', undefined)
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('rechazar advierte que el tema vuelve al banco y envía el motivo', async () => {
    get.mockResolvedValueOnce([pendiente]).mockResolvedValue([])
    post.mockResolvedValue({ ...pendiente, estadoPostulacion: 'RECHAZADA' })
    renderModal()
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    expect(screen.getByRole('dialog', { name: 'Rechazar el tema reservado' })).toHaveTextContent(
      'el tema vuelve al banco de temas',
    )
    expect(post).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText(/Motivo/), 'No coincide con mi línea')
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar tema' }))
    expect(post).toHaveBeenCalledWith('/postulaciones/po1/rechazar', {
      motivo: 'No coincide con mi línea',
    })
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('si la reserva venció, vuelve a consultar la lista', async () => {
    get.mockResolvedValueOnce([pendiente]).mockResolvedValue([])
    post.mockImplementation(() =>
      Promise.reject(
        new ApiError({ statusCode: 409, code: 'HTTP_409', message: 'La reserva venció: …' }),
      ),
    )
    renderModal()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar tema' }))
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('ante un error 5xx muestra el aviso, mantiene el diálogo y permite reintentar', async () => {
    get.mockResolvedValue([pendiente])
    post.mockImplementation(() =>
      Promise.reject(
        new ApiError({ statusCode: 503, code: 'HTTP_503', message: 'Servicio caído' }),
      ),
    )
    renderModal()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar tema' }))
    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('No se pudo registrar tu respuesta')
    expect(aviso).toHaveTextContent('Servicio caído')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar tema' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeEnabled()
  })

  it('«Cerrar sesión» dentro del diálogo usa el cierre de sesión de la app', async () => {
    get.mockResolvedValue([pendiente])
    renderModal()
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(cerrarSesion).toHaveBeenCalledTimes(1)
  })
})

describe('cuerpoRespuestaConfirmacion', () => {
  it('confirmar no lleva cuerpo; rechazar omite el motivo vacío', () => {
    expect(cuerpoRespuestaConfirmacion({ postulacionId: 'p', accion: 'confirmar' })).toBeUndefined()
    expect(
      cuerpoRespuestaConfirmacion({ postulacionId: 'p', accion: 'rechazar', motivo: '   ' }),
    ).toEqual({})
    expect(
      cuerpoRespuestaConfirmacion({ postulacionId: 'p', accion: 'rechazar', motivo: ' ok ' }),
    ).toEqual({ motivo: 'ok' })
  })
})
