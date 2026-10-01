import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SesionUsuario } from '@/types/dominio'
import { RoleGuard } from './RoleGuard'

const usuarioActual = vi.hoisted(() => ({ valor: null as SesionUsuario | null }))
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ usuario: usuarioActual.valor, estado: 'autenticado' }),
}))

function renderRuta(rol: SesionUsuario['rol'], ruta: string) {
  usuarioActual.valor = {
    id: 'u',
    email: '',
    nombres: 'N',
    apellidos: 'A',
    rol,
    estado: 'ACTIVO',
    creadoEn: '',
  }
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: <RoleGuard roles={['ADMIN']} />,
        children: [{ index: true, element: <p>Panel admin</p> }],
      },
      { path: '/sin-permiso', element: <p>Sin permiso</p> },
    ],
    { initialEntries: [ruta] },
  )
  render(<RouterProvider router={router} />)
}

describe('RoleGuard (RNF-03)', () => {
  it('permite el acceso al rol autorizado', () => {
    renderRuta('ADMIN', '/admin')
    expect(screen.getByText('Panel admin')).toBeInTheDocument()
  })
  it('redirige a "sin permiso" a otros roles', () => {
    renderRuta('ESTUDIANTE', '/admin')
    expect(screen.getByText('Sin permiso')).toBeInTheDocument()
  })
})
