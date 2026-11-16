import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Campo, normalizarBusqueda, SelectSimple } from './Campo'

const opciones = [
  { value: 'ing', label: 'Ingeniería en Software' },
  { value: 'med', label: 'Medicina' },
  { value: 'der', label: 'Derecho', disabled: true },
]

const abrir = () => userEvent.click(screen.getByRole('combobox'))

describe('normalizarBusqueda', () => {
  it('ignora mayúsculas y diacríticos', () => {
    expect(normalizarBusqueda('  Ingeniería ÑANDÚ ')).toBe('ingenieria nandu')
  })
})

describe('SelectSimple', () => {
  it('muestra el placeholder y, si hay valor, su etiqueta', () => {
    const { rerender } = render(
      <SelectSimple value="" onChange={vi.fn()} opciones={opciones} placeholder="Elija" />,
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('Elija')
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
    rerender(<SelectSimple value="med" onChange={vi.fn()} opciones={opciones} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Medicina')
  })

  it('filtra sin distinguir mayúsculas ni acentos y avisa si no hay resultados', async () => {
    render(<SelectSimple value="" onChange={vi.fn()} opciones={opciones} />)
    await abrir()
    expect(screen.getByRole('combobox', { name: 'Buscar' })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('combobox', { name: 'Buscar' }), 'INGENIERIA')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Ingeniería en Software',
    ])
    await userEvent.clear(screen.getByRole('combobox', { name: 'Buscar' }))
    await userEvent.type(screen.getByRole('combobox', { name: 'Buscar' }), 'zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })

  it('al elegir una opción llama a onChange y cierra la lista', async () => {
    const onChange = vi.fn()
    render(<SelectSimple value="" onChange={onChange} opciones={opciones} />)
    await abrir()
    await userEvent.click(screen.getByRole('option', { name: 'Medicina' }))
    expect(onChange).toHaveBeenCalledWith('med')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('se puede usar solo con teclado', async () => {
    const onChange = vi.fn()
    render(<SelectSimple value="" onChange={onChange} opciones={opciones} />)
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('medic{Enter}')
    expect(onChange).toHaveBeenCalledWith('med')
  })

  it('la opción "todos" va primero y devuelve cadena vacía', async () => {
    const onChange = vi.fn()
    render(<SelectSimple value="med" onChange={onChange} opciones={opciones} todos="Todas" />)
    await abrir()
    const items = screen.getAllByRole('option')
    expect(items[0]).toHaveTextContent('Todas')
    await userEvent.click(items[0])
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('con valor vacío y "todos" muestra la etiqueta de todos', () => {
    render(<SelectSimple value="" onChange={vi.fn()} opciones={opciones} todos="Todas" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Todas')
  })

  it('no permite elegir una opción deshabilitada', async () => {
    const onChange = vi.fn()
    render(<SelectSimple value="" onChange={onChange} opciones={opciones} />)
    await abrir()
    expect(screen.getByRole('option', { name: 'Derecho' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(screen.getByRole('option', { name: 'Derecho' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('con disabled no abre la lista', async () => {
    render(<SelectSimple value="" onChange={vi.fn()} opciones={opciones} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
    await abrir()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('se asocia a su etiqueta y a su descripción de error', () => {
    function Ejemplo() {
      const [v, setV] = useState('')
      return (
        <Campo etiqueta="Carrera" error="Seleccione la carrera.">
          {(p) => <SelectSimple {...p} value={v} onChange={setV} opciones={opciones} />}
        </Campo>
      )
    }
    render(<Ejemplo />)
    const combo = screen.getByRole('combobox', { name: /Carrera/ })
    expect(combo).toHaveAttribute('aria-invalid', 'true')
    expect(combo).toHaveAccessibleDescription('Seleccione la carrera.')
  })
})
