import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const facultades = [
  { value: 'f-vida', label: 'Facultad de Ciencias de la Vida' },
  { value: 'f-ing', label: 'Facultad de Ingeniería' },
]
const carreras = [
  {
    value: 'c-sof',
    label: 'Ingeniería en Software — Facultad de Ciencias de la Vida',
    facultadId: 'f-vida',
  },
  { value: 'c-civ', label: 'Ingeniería Civil — Facultad de Ingeniería', facultadId: 'f-ing' },
]
const lineas = [{ value: 'l-ia', label: 'Inteligencia artificial' }]

describe('FiltrosBancoTemas', () => {
  it('ofrece filtros de facultad, carrera, línea, tipo, estado y disponibilidad', () => {
    render(
      <FiltrosBancoTemas
        valores={FILTROS_BANCO_INICIALES}
        onChange={vi.fn()}
        facultades={facultades}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    for (const nombre of [
      'Filtrar por facultad',
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
        facultades={facultades}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo disponibles' }))
    expect(onChange).toHaveBeenCalledWith({
      ...FILTROS_BANCO_INICIALES,
      estado: '',
      disponible: true,
    })
    rerender(
      <FiltrosBancoTemas
        valores={{ ...FILTROS_BANCO_INICIALES, disponible: true }}
        onChange={onChange}
        facultades={facultades}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBeDisabled()
  })
})

describe('filtro por facultad', () => {
  const opcionesDe = async (nombre: string) => {
    await userEvent.click(screen.getByRole('combobox', { name: nombre }))
    return screen.getAllByRole('option').map((o) => o.textContent)
  }

  it('acota las carreras a la facultad elegida', async () => {
    render(
      <FiltrosBancoTemas
        valores={{ ...FILTROS_BANCO_INICIALES, facultadId: 'f-ing' }}
        onChange={vi.fn()}
        facultades={facultades}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    expect(await opcionesDe('Filtrar por carrera')).toEqual([
      'Todas las carreras',
      'Ingeniería Civil — Facultad de Ingeniería',
    ])
  })

  it('sin facultad ofrece todas las carreras', async () => {
    render(
      <FiltrosBancoTemas
        valores={FILTROS_BANCO_INICIALES}
        onChange={vi.fn()}
        facultades={facultades}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    expect(await opcionesDe('Filtrar por carrera')).toHaveLength(3)
  })

  it('limpia la carrera si queda fuera de la facultad elegida', async () => {
    const onChange = vi.fn()
    render(
      <FiltrosBancoTemas
        valores={{ ...FILTROS_BANCO_INICIALES, carreraId: 'c-sof' }}
        onChange={onChange}
        facultades={facultades}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por facultad' }))
    await userEvent.click(screen.getByRole('option', { name: 'Facultad de Ingeniería' }))
    expect(onChange).toHaveBeenCalledWith({
      ...FILTROS_BANCO_INICIALES,
      facultadId: 'f-ing',
      carreraId: '',
    })
  })

  it('conserva la carrera si pertenece a la facultad elegida', async () => {
    const onChange = vi.fn()
    render(
      <FiltrosBancoTemas
        valores={{ ...FILTROS_BANCO_INICIALES, carreraId: 'c-sof' }}
        onChange={onChange}
        facultades={facultades}
        carreras={carreras}
        lineas={lineas}
      />,
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por facultad' }))
    await userEvent.click(screen.getByRole('option', { name: 'Facultad de Ciencias de la Vida' }))
    expect(onChange).toHaveBeenCalledWith({
      ...FILTROS_BANCO_INICIALES,
      facultadId: 'f-vida',
      carreraId: 'c-sof',
    })
  })
})

describe('filtrosTemaDesdeBanco', () => {
  it('convierte los filtros de la página en filtros de GET /temas', () => {
    expect(filtrosTemaDesdeBanco(FILTROS_BANCO_INICIALES)).toEqual({
      facultadId: '',
      carreraId: '',
      lineaId: '',
      tipo: '',
      estado: '',
      disponible: undefined,
    })
    expect(
      filtrosTemaDesdeBanco({
        ...FILTROS_BANCO_INICIALES,
        facultadId: 'f',
        carreraId: 'c',
        tipo: 'PAREJA',
        disponible: true,
      }),
    ).toEqual({
      facultadId: 'f',
      carreraId: 'c',
      lineaId: '',
      tipo: 'PAREJA',
      estado: '',
      disponible: true,
    })
  })
})
