import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MiGrupo from './MiGrupo'

const { miGrupo, crear, consulta, mutacion } = vi.hoisted(() => ({
  miGrupo: vi.fn(),
  crear: vi.fn(),
  consulta: (data: unknown) => ({ isPending: false, isError: false, data }),
  mutacion: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/auth/AuthProvider', () => ({ useUsuario: () => ({ estudianteId: 'e1' }) }))
vi.mock('@/features/periodos/PeriodoContext', () => ({ usePeriodo: () => ({ periodoId: 'p1' }) }))
vi.mock('@/features/catalogos/api', () => ({
  useCandidatosInvitacion: () =>
    consulta([
      { id: 'e2', nombres: 'Luis', apellidos: 'Mora' },
      { id: 'e3', nombres: 'Rosa', apellidos: 'Vega' },
    ]),
}))
vi.mock('@/features/grupos/api', () => ({
  useMiGrupo: () => miGrupo(),
  useMisInvitaciones: () => consulta([]),
  useInvitacionesGrupo: () => consulta([]),
  useResponderInvitacion: mutacion,
  useInvitar: mutacion,
  useSalirGrupo: mutacion,
  useCrearGrupo: () => ({ mutate: crear, isPending: false }),
}))

const integrante = (id: string, nombres: string, rolEnGrupo: string, matricula?: string) => ({
  id: `i-${id}`,
  estado: 'ACTIVO',
  rolEnGrupo,
  estudiante: { id, nombres, apellidos: 'X', email: '', cedula: '', matricula },
})

describe('MiGrupo (estudiante)', () => {
  beforeEach(() => {
    crear.mockReset()
  })

  it('no muestra columna de matrícula ni busca por ella, y lista candidatos solo con nombre', () => {
    miGrupo.mockReturnValue(
      consulta({
        id: 'g1',
        nombre: 'Equipo',
        estado: 'ACTIVO',
        composicionCerrada: false,
        integrantes: [
          integrante('e1', 'Ana', 'REPRESENTANTE', '0102030405'),
          integrante('e2', 'Luis', 'INTEGRANTE'),
        ],
      }),
    )
    render(<MiGrupo />)
    const tabla = screen.getByRole('table', { name: 'Integrantes del grupo' })
    expect(within(tabla).queryByText('Matrícula')).toBeNull()
    expect(screen.queryByText('0102030405')).toBeNull()
    expect(screen.queryByText(/undefined/)).toBeNull()
    expect(screen.getByRole('searchbox', { name: 'Buscar por nombre' })).toBeTruthy()
    const lista = screen.getByRole('list', { name: 'Estudiante a invitar' })
    expect(within(lista).getAllByRole('button')).toHaveLength(2)
  })

  it('rechaza nombres con enlaces antes de llamar al servidor', async () => {
    miGrupo.mockReturnValue(consulta(null))
    const user = userEvent.setup()
    render(<MiGrupo />)
    await user.type(screen.getByLabelText('Nombre del grupo'), 'visita www.sitio.com')
    await user.click(screen.getByRole('button', { name: /Crear grupo/ }))
    expect(screen.getByText(/no puede incluir enlaces/i)).toBeTruthy()
    expect(crear).not.toHaveBeenCalled()
  })

  it('envía el nombre válido recortado', async () => {
    miGrupo.mockReturnValue(consulta(null))
    const user = userEvent.setup()
    render(<MiGrupo />)
    await user.type(screen.getByLabelText('Nombre del grupo'), '  Equipo Ñandú  ')
    await user.click(screen.getByRole('button', { name: /Crear grupo/ }))
    expect(crear).toHaveBeenCalledWith({ periodoId: 'p1', nombre: 'Equipo Ñandú' })
  })
})
