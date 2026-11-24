import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Equipo } from '@/features/equipos/api'
import DetalleEquipo from './DetalleEquipo'

const ID = '00000000-0000-4000-8000-000000000020'
const asignar = vi.fn()
const docente = (id: string, apellidos: string) => ({
  id,
  nombres: 'Luis',
  apellidos,
  tituloAcademico: 'Magíster',
})
const candidato = (id: string, prioridad: number, apellidos: string) => ({
  id,
  prioridad,
  docente: docente(`d-${id}`, apellidos),
  elegibleActualmente: true,
  carga: { actual: 1, maxTrabajos: 3, bloquearAlSuperar: true },
})
let equipo: Equipo

vi.mock('@/features/equipos/api', () => ({
  useEquipo: () => ({ isPending: false, isError: false, data: equipo }),
  useAsignarTutorCandidato: () => ({ mutate: asignar, isPending: false }),
  usePrepararPatInverso: () => ({ mutate: vi.fn(), isPending: false, data: undefined }),
  useConfirmarPatInverso: () => ({ mutate: vi.fn(), isPending: false }),
  useGenerarPatEstudiante: () => ({ mutate: vi.fn(), isPending: false, data: undefined }),
  useEntregarPatFirmado: () => ({ mutate: vi.fn(), isPending: false }),
}))

const pantalla = () =>
  render(
    <MemoryRouter initialEntries={[`/admin/equipos/${ID}`]}>
      <Routes>
        <Route path="/admin/equipos/:id" element={<DetalleEquipo />} />
      </Routes>
    </MemoryRouter>,
  )

describe('DetalleEquipo (admin)', () => {
  beforeEach(() => {
    asignar.mockReset()
    equipo = {
      id: ID,
      periodoId: 'p1',
      origen: 'ADMIN',
      estado: 'VIGENTE',
      modalidad: 'GRUPAL',
      motivo: 'Acta 5',
      fechaAsignacion: '2026-11-23T10:00:00Z',
      tema: { id: 't1', titulo: 'Plataforma de seguimiento', tipo: 'PAREJA', estado: 'ASIGNADO' },
      grupo: { id: 'g1', nombre: 'Equipo Alfa', estado: 'ACTIVO' },
      integrantes: [
        {
          estudianteId: 'e1',
          nombres: 'Ana',
          apellidos: 'Briones',
          matricula: '0911',
          rolEnGrupo: 'REPRESENTANTE',
          situacionIngreso: 'ADMITIDO',
          pat: {
            datosPersonalesRegistrados: true,
            contenidoRegistrado: false,
            ultimaGeneracion: null,
            ultimaEntrega: null,
          },
        },
      ],
      candidatos: [candidato('c1', 1, 'Vera'), candidato('c2', 2, 'Mendoza')],
      tutorVigente: null,
    }
  })

  it('muestra integrantes con su sección PAT y confirma un candidato como tutor', async () => {
    pantalla()
    const pat = screen.getByLabelText('PAT de Ana Briones')
    expect(within(pat).getByText('Datos personales registrados')).toBeInTheDocument()
    expect(within(pat).getByText('Contenido pendiente')).toBeInTheDocument()
    expect(within(pat).getByLabelText('Word del PAT de Ana Briones')).toBeInTheDocument()
    expect(
      screen.getByText('Sin tutor vigente: confirme uno de los candidatos.'),
    ).toBeInTheDocument()

    const filas = within(screen.getByRole('table', { name: 'Candidatos a tutor' })).getAllByRole(
      'row',
    )
    await userEvent.click(within(filas[2]!).getByRole('button', { name: /Asignar como tutor/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(asignar).toHaveBeenCalledWith(
      { equipoId: ID, candidatoId: 'c2', motivo: undefined },
      expect.anything(),
    )
  })

  it('exige motivo para reemplazar al tutor vigente', async () => {
    equipo.tutorVigente = {
      id: 'tv',
      tipo: 'CANDIDATO_CONFIRMADO',
      candidatoTutorId: 'c1',
      fechaAsignacion: '2026-11-23T10:00:00Z',
      docente: docente('d-c1', 'Vera'),
    }
    pantalla()
    expect(screen.getByText('Tutor vigente', { selector: 'span' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Reemplazar por este/ }))
    const confirmar = screen.getByRole('button', { name: 'Confirmar' })
    expect(confirmar).toBeDisabled()
    await userEvent.type(
      screen.getByRole('textbox', { name: /Motivo del reemplazo/ }),
      'Elegido en el PAT',
    )
    await userEvent.click(confirmar)
    expect(asignar).toHaveBeenCalledWith(
      { equipoId: ID, candidatoId: 'c2', motivo: 'Elegido en el PAT' },
      expect.anything(),
    )
  })
})
