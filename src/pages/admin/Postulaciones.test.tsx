import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { FiltrosPostulacion } from '@/features/postulaciones/api'
import Postulaciones from './Postulaciones'

const useTemas = vi.fn()
const usePostulaciones = vi.fn()

vi.mock('@/features/periodos/PeriodoContext', () => ({ usePeriodo: () => ({ periodoId: 'p1' }) }))
vi.mock('@/features/temas/api', () => ({ useTemas: (...args: unknown[]) => useTemas(...args) }))
vi.mock('@/features/postulaciones/api', () => ({
  usePostulaciones: (f: FiltrosPostulacion) => usePostulaciones(f),
}))
vi.mock('@/features/postulaciones/TablaPostulaciones', () => ({
  TablaPostulaciones: ({ filtros }: { filtros: ReactNode }) => <div>{filtros}</div>,
}))

const postulacion = (id: string, temaId: string, titulo: string) => ({
  id,
  tema: { id: temaId, titulo },
})
const todas = [
  postulacion('a', 't2', 'Visión artificial'),
  postulacion('b', 't1', 'Aprendizaje automático'),
  postulacion('c', 't2', 'Visión artificial'),
]

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

describe('Postulaciones (admin)', () => {
  it('builds the topic filter from the period applications instead of the topic bank', async () => {
    // The filtered list holds a single topic; the options must still come from every application.
    usePostulaciones.mockImplementation((f: FiltrosPostulacion) => ({
      isPending: false,
      isError: false,
      data: f.temaId || f.estado || f.modalidad ? [todas[1]] : todas,
    }))
    const user = userEvent.setup()
    render(<Postulaciones />)

    await user.click(screen.getByRole('combobox', { name: 'Filtrar por tema' }))
    const listbox = await screen.findByRole('listbox')
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Todos los temas', 'Aprendizaje automático', 'Visión artificial'])
    expect(useTemas).not.toHaveBeenCalled()
    expect(usePostulaciones).toHaveBeenCalledWith({
      periodoId: 'p1',
      temaId: '',
      estado: '',
      modalidad: '',
    })
  })
})
