import type { FormEvent } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorCatalogo, MENSAJE_ERROR_CATALOGO } from './ErrorCatalogo'

describe('ErrorCatalogo', () => {
  it('no muestra nada si el catálogo cargó', () => {
    const { container } = render(<ErrorCatalogo consulta={{ isError: false, refetch: vi.fn() }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el error y reintenta la consulta', () => {
    const refetch = vi.fn()
    render(<ErrorCatalogo consulta={{ isError: true, refetch }} />)
    expect(screen.getByRole('alert')).toHaveTextContent(MENSAJE_ERROR_CATALOGO)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('no envía el formulario que lo contiene', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <ErrorCatalogo consulta={{ isError: true, refetch: vi.fn() }} />
      </form>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
