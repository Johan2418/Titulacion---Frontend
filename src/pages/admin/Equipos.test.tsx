import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CargaDocente, Docente, EstudianteHabilitado, Tema } from '@/types/dominio'
import Equipos from './Equipos'

const consulta = <T,>(data: T) => ({ isPending: false, isError: false, data })
const carrera = { id: 'c1', nombre: 'Software' }
const habilitado = (id: string, apellidos: string, extra: Partial<EstudianteHabilitado> = {}) =>
  ({
    id: `h-${id}`,
    estado: 'HABILITADO',
    situacionIngreso: 'ADMITIDO',
    estudiante: { id, nombres: 'Ana', apellidos, cedula: `09${id}`, carrera, nivel: 9 },
    ...extra,
  }) as unknown as EstudianteHabilitado
const tema = (id: string, titulo: string, tipo: Tema['tipo'], min: number, max: number) =>
  ({
    id,
    titulo,
    tipo,
    minIntegrantes: min,
    maxIntegrantes: max,
    carrera,
    estado: 'PUBLICADO',
  }) as Tema
const docente = (id: string, apellidos: string) =>
  ({ id, nombres: 'Luis', apellidos, estado: 'ACTIVO', habilitadoTutoria: true }) as Docente

const crear = vi.fn()
const periodo = { id: 'p1', nombre: '2026-2', estado: 'POSTULACION_CERRADA' }
let habilitados = [
  habilitado('e1', 'Zambrano'),
  habilitado('e2', 'Briones'),
  habilitado('e3', 'Suspendido', { estado: 'SUSPENDIDO' }),
]

vi.mock('@/features/periodos/PeriodoContext', () => ({
  usePeriodo: () => ({ periodoId: periodo.id, periodo }),
}))
vi.mock('@/features/catalogos/api', () => ({
  useHabilitados: () => consulta(habilitados),
  useDocentes: () => consulta([docente('d1', 'Mendoza'), docente('d2', 'Vera')]),
  useCargaTutorial: () =>
    consulta([
      { docente: { id: 'd1' }, actual: 1, limite: 3 },
      { docente: { id: 'd2' }, actual: 0, limite: null },
    ] as unknown as CargaDocente[]),
}))
vi.mock('@/features/temas/api', () => ({
  useTemas: () =>
    consulta([
      tema('t1', 'Tema individual', 'INDIVIDUAL', 1, 1),
      tema('t2', 'Tema en pareja', 'PAREJA', 2, 2),
    ]),
}))
vi.mock('@/features/equipos/api', () => ({
  useEquipos: () => consulta([]),
  useCrearEquipo: () => ({ mutate: crear, isPending: false }),
}))

const elegir = async (combo: string, opcion: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: combo }))
  await userEvent.click(screen.getByRole('option', { name: opcion }))
}
const pantalla = () =>
  render(
    <MemoryRouter>
      <Equipos />
    </MemoryRouter>,
  )
const agregar = async (apellidos: string) => {
  const lista = screen.getByRole('list', { name: 'Estudiantes disponibles' })
  const fila = within(lista).getByText(new RegExp(apellidos)).closest('li')!
  await userEvent.click(within(fila).getByRole('button', { name: 'Agregar' }))
}

describe('Equipos (admin): conformación', () => {
  beforeEach(() => {
    crear.mockReset()
    periodo.estado = 'POSTULACION_CERRADA'
    habilitados = [
      habilitado('e1', 'Zambrano'),
      habilitado('e2', 'Briones'),
      habilitado('e3', 'Suspendido', { estado: 'SUSPENDIDO' }),
    ]
  })

  it('arma un grupo con representante, tema y candidatos ordenados y envía la conformación', async () => {
    pantalla()
    // los suspendidos no se ofrecen
    expect(screen.queryByText(/Suspendido/)).not.toBeInTheDocument()
    await agregar('Zambrano')
    await agregar('Briones')
    const seleccionados = screen.getByRole('list', { name: 'Estudiantes seleccionados' })
    await userEvent.click(
      within(seleccionados).getByRole('button', { name: 'Hacer representante' }),
    )
    expect(within(seleccionados).getAllByRole('listitem')[0]).toHaveTextContent('Briones')
    expect(within(seleccionados).getAllByRole('listitem')[0]).toHaveTextContent('Representante')

    await elegir('Tema', 'Tema en pareja (PAREJA)')
    await elegir('Agregar candidato', 'Luis Mendoza')
    await elegir('Agregar candidato', 'Luis Vera')
    await userEvent.click(screen.getByRole('button', { name: 'Subir prioridad de Luis Vera' }))
    const candidatos = within(
      screen.getByRole('list', { name: 'Candidatos a tutor' }),
    ).getAllByRole('listitem')
    expect(candidatos[0]).toHaveTextContent(/^1\.Luis Vera.*sin límite configurado/)
    expect(candidatos[1]).toHaveTextContent(/^2\.Luis Mendoza.*Carga 1 de 3/)

    const boton = screen.getByRole('button', { name: /Conformar equipo/ })
    expect(boton).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox', { name: /Motivo/ }), 'Acta 5')
    await userEvent.type(screen.getByRole('textbox', { name: /Nombre del grupo/ }), 'Equipo Alfa')
    await userEvent.click(boton)
    expect(crear).toHaveBeenCalledWith(
      {
        periodoId: 'p1',
        estudianteIds: ['e2', 'e1'],
        temaId: 't2',
        docenteIds: ['d2', 'd1'],
        nombreGrupo: 'Equipo Alfa',
        motivo: 'Acta 5',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('advierte cuando la cantidad de estudiantes no corresponde al tipo del tema', async () => {
    pantalla()
    await agregar('Zambrano')
    await agregar('Briones')
    await elegir('Tema', 'Tema individual (INDIVIDUAL)')
    expect(
      screen.getByText('El tema INDIVIDUAL admite 1 integrante(s); seleccionó 2.'),
    ).toBeInTheDocument()
    await elegir('Agregar candidato', 'Luis Mendoza')
    await userEvent.type(screen.getByRole('textbox', { name: /Motivo/ }), 'Acta')
    expect(screen.getByRole('button', { name: /Conformar equipo/ })).toBeDisabled()
  })

  it('ofrece el formulario también con el período en postulación abierta', () => {
    periodo.estado = 'POSTULACION_ABIERTA'
    pantalla()
    expect(screen.queryByText('El período no admite conformar equipos')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Conformar equipo/ })).toBeInTheDocument()
  })

  it('no ofrece el formulario si el período no admite conformar equipos', () => {
    periodo.estado = 'BORRADOR'
    pantalla()
    expect(screen.getByText('El período no admite conformar equipos')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Conformar equipo/ })).not.toBeInTheDocument()
  })
})
