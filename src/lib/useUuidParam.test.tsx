import { renderHook } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useUuidParam } from './useUuidParam'

const UUID = '3f2b8a1e-9c4d-4f6a-8b1e-2d3c4b5a6f70'

function leer(valor: string) {
  let resultado: string | null | undefined
  function Sonda() {
    resultado = useUuidParam('id')
    return null
  }
  const router = createMemoryRouter([{ path: '/x/:id', element: <Sonda /> }], {
    initialEntries: [`/x/${valor}`],
  })
  renderHook(() => null)
  return import('@testing-library/react').then(({ render }) => {
    render(<RouterProvider router={router} />)
    return resultado
  })
}

describe('useUuidParam', () => {
  it('devuelve el parámetro cuando es un UUID', async () => expect(await leer(UUID)).toBe(UUID))
  // zod 4 valida UUID según RFC 4122 (igual que ParseUUIDPipe del backend): las mayúsculas se
  // aceptan y una variante fuera de [89ab] se rechaza.
  it('acepta un UUID en mayúsculas', async () =>
    expect(await leer(UUID.toUpperCase())).toBe(UUID.toUpperCase()))
  it('rechaza un UUID con variante fuera de RFC 4122', async () =>
    expect(await leer('3f2b8a1e-9c4d-4f6a-0b1e-2d3c4b5a6f70')).toBeNull())
  it.each(['abc', '..', '%2e%2e', `${UUID}x`, '1234', 'null'])('devuelve null para %j', async (v) =>
    expect(await leer(v)).toBeNull(),
  )
})
