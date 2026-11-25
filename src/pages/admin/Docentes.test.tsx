import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Docente, FacultadCatalogo } from '@/types/dominio'
import Docentes from './Docentes'

const facultades: FacultadCatalogo[] = [
  {
    id: 'f1',
    codigo: 'VIDA',
    nombre: 'Facultad de la Vida',
    carreras: [{ id: 'c1', codigo: 'SOF', nombre: 'Software' }],
  },
  {
    id: 'f2',
    codigo: 'ING',
    nombre: 'Facultad de Ingeniería',
    carreras: [{ id: 'c2', codigo: 'CIV', nombre: 'Civil' }],
  },
]
const docente = (id: string, apellidos: string, carreraId: string): Docente =>
  ({
    id,
    apellidos,
    nombres: 'X',
    carrera: { id: carreraId, nombre: carreraId },
  }) as Docente
const docentes = [docente('d1', 'Pérez', 'c1'), docente('d2', 'Gómez', 'c2')]

vi.mock('@/features/catalogos/api', () => ({
  descargarPlantillaDocentes: vi.fn(),
  useLotes: vi.fn(),
  useDocentes: () => ({ isPending: false, isError: false, data: docentes }),
  useGuardarDocente: () => ({ mutateAsync: vi.fn() }),
  useImportarDocentes: () => ({ mutateAsync: vi.fn() }),
  useReenviarAcceso: () => ({ mutate: vi.fn() }),
}))
vi.mock('@/features/academico/api', async (original) => ({
  ...(await original<typeof import('@/features/academico/api')>()),
  useFacultades: () => ({ isLoading: false, isError: false, data: facultades }),
}))
vi.mock('@/features/catalogos/ImportarArchivo', () => ({ ImportarArchivo: () => null }))
vi.mock('@/features/periodos/PeriodoContext', () => ({
  usePeriodo: () => ({ periodo: { id: 'p1', facultadId: 'f1' } }),
}))
vi.mock('@/components/DataTable', () => ({
  DataTable: ({ datos, filtros }: { datos: Docente[]; filtros: ReactNode }) => (
    <div>
      {filtros}
      <ul>
        {datos.map((d) => (
          <li key={d.id}>{d.apellidos}</li>
        ))}
      </ul>
    </div>
  ),
}))

const filas = () => screen.getAllByRole('listitem').map((li) => li.textContent)
const elegir = async (combo: string, opcion: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: combo }))
  await userEvent.click(screen.getByRole('option', { name: opcion }))
}

describe('Docentes (admin): filtro por facultad', () => {
  it('filtra la lista y acota las carreras a la facultad elegida', async () => {
    render(<Docentes />)
    expect(filas()).toEqual(['Pérez', 'Gómez'])
    await elegir('Filtrar por facultad', 'Facultad de Ingeniería')
    expect(filas()).toEqual(['Gómez'])
    await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por carrera' }))
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todas las carreras',
      'Civil — Facultad de Ingeniería',
    ])
  })

  it('limpia la carrera elegida si queda fuera de la nueva facultad', async () => {
    render(<Docentes />)
    await elegir('Filtrar por carrera', 'Software — Facultad de la Vida')
    expect(filas()).toEqual(['Pérez'])
    await elegir('Filtrar por facultad', 'Facultad de Ingeniería')
    expect(screen.getByRole('combobox', { name: 'Filtrar por carrera' })).toHaveTextContent(
      'Todas las carreras',
    )
    expect(filas()).toEqual(['Gómez'])
  })
})
