import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  FILTROS_BANCO_INICIALES,
  FiltrosBancoTemas,
  filtrosTemaDesdeBanco,
} from './FiltrosBancoTemas'

beforeAll(() => {
  // Radix primitives measure their elements; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const carreras = [{ value: 'c-sof', label: 'Ingeniería en Software — Facultad de Ciencias de la Vida' }]
const lineas = [{ value: 'l-ia', label: 'Inteligencia artificial' }]

describe('FiltrosBancoTemas', () => {
  it('ofrece filtros de carrera, línea, tipo, estado y disponibilidad', () => {
    render(
      <FiltrosBancoTemas
        valores={FILTROS_BANCO_INICIALES}
        onChange={vi.fn()}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    for (const nombre of [
      'Filtrar por carrera',
      'Filtrar por línea',
      'Filtrar por tipo',
      'Filtrar por estado',
    ]) {
      expect(screen.getByRole('combobox', { name: nombre })).toBeInTheDocument()
    }
    expect(screen.getByRole('checkbox', { name: 'Solo disponibles' })).not.toBeChecked()
  })

  it('al pedir solo disponibles limpia el estado y lo deshabilita', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <FiltrosBancoTemas
        valores={{ ...FILTROS_BANCO_INICIALES, estado: 'CERRADO' }}
        onChange={onChange}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo disponibles' }))
    expect(onChange).toHaveBeenCalledWith({ ...FILTROS_BANCO_INICIALES, estado: '', disponible: true })
    rerender(
      <FiltrosBancoTemas
        valores={{ ...FILTROS_BANCO_INICIALES, disponible: true }}
        onChange={onChange}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBeDisabled()
  })
})

describe('filtrosTemaDesdeBanco', () => {
  it('convierte los filtros de la página en filtros de GET /temas', () => {
    expect(filtrosTemaDesdeBanco(FILTROS_BANCO_INICIALES)).toEqual({
      carreraId: '',
      lineaId: '',
      tipo: '',
      estado: '',
      disponible: undefined,
    })
    expect(
      filtrosTemaDesdeBanco({ ...FILTROS_BANCO_INICIALES, carreraId: 'c', tipo: 'PAREJA', disponible: true }),
    ).toEqual({ carreraId: 'c', lineaId: '', tipo: 'PAREJA', estado: '', disponible: true })
  })
})
