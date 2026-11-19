import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SesionUsuario } from '@/types/dominio'
import { NAVEGACION } from '@/app/navegacion'
import { ROL } from '@/lib/estados'
import { RedireccionInicio, RoleGuard, RUTA_INICIO } from './RoleGuard'

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
      {
        path: '/coordinador',
        element: <RoleGuard roles={['COORDINADOR']} />,
        children: [{ index: true, element: <p>Programas</p> }],
      },
      { path: '/', element: <RedireccionInicio /> },
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

  it('el COORDINADOR entra a sus programas y no al panel de ADMIN', () => {
    renderRuta('COORDINADOR', '/coordinador')
    expect(screen.getByText('Programas')).toBeInTheDocument()
  })
  it('el COORDINADOR es redirigido a «sin permiso» desde /admin', () => {
    renderRuta('COORDINADOR', '/admin')
    expect(screen.getByText('Sin permiso')).toBeInTheDocument()
  })
  it('al iniciar sesión el COORDINADOR llega a la página de programas', () => {
    expect(RUTA_INICIO.COORDINADOR).toBe('/coordinador')
    renderRuta('COORDINADOR', '/')
    expect(screen.getByText('Programas')).toBeInTheDocument()
  })
  it('el COORDINADOR tiene navegación y etiqueta propias', () => {
    expect(NAVEGACION.COORDINADOR[0].items.map((i) => i.to)).toEqual([
      '/coordinador',
      '/coordinador/temas',
    ])
    expect(ROL.COORDINADOR.label).toBe('Coordinador')
  })
})
