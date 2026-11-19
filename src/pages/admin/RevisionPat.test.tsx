import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { FilaBandejaPat } from '@/features/pat/api'
import type { DocumentoPat } from '@/types/dominio'
import RevisionPat from './RevisionPat'

const documento = (id: string, origen: DocumentoPat['origen']): DocumentoPat => ({
  id,
  asignacionTemaId: 'a1',
  estudianteId: id,
  version: 1,
  nombreArchivo: 'PAT.pdf',
  formato: 'PDF',
  tamanoBytes: 10,
  hashSha256: 'h',
  cargadoPor: { id, nombres: id, apellidos: 'X', email: '' },
  fechaCarga: '2026-11-19T10:00:00Z',
  estado: 'PENDIENTE',
  origen,
})
const fila = (id: string, origen: DocumentoPat['origen']): FilaBandejaPat => ({
  asignacionTemaId: 'a1',
  estudiante: { id, nombres: id, apellidos: 'X', email: '' } as FilaBandejaPat['estudiante'],
  tema: { id: 't1', titulo: 'Tema' },
  estado: 'PENDIENTE',
  documento: documento(id, origen),
})

vi.mock('@/features/periodos/PeriodoContext', () => ({ usePeriodo: () => ({ periodoId: 'p1' }) }))
vi.mock('@/features/pat/api', () => ({
  useBandejaPat: () => ({
    isPending: false,
    isError: false,
    data: [fila('Uno', 'GENERADO'), fila('Dos', 'FIRMADO')],
  }),
  useDocumentosPat: () => ({ isPending: false, isError: false, data: [] }),
  useRevisarPat: () => ({ mutate: vi.fn(), isPending: false }),
  descargarDocumentoPat: vi.fn(),
}))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

describe('Revisión de PAT', () => {
  it('distingue en la bandeja el PAT generado sin firma del firmado', () => {
    render(<RevisionPat />)
    const filaUno = screen.getByRole('row', { name: /Uno X/ })
    const filaDos = screen.getByRole('row', { name: /Dos X/ })
    expect(within(filaUno).getByText('Generado sin firma')).toBeInTheDocument()
    expect(within(filaDos).getByText('Firmado')).toBeInTheDocument()
  })

  it('muestra el origen en el detalle de revisión', async () => {
    const user = userEvent.setup()
    render(<RevisionPat />)
    await user.click(
      within(screen.getByRole('row', { name: /Uno X/ })).getByRole('button', { name: 'Revisar' }),
    )
    expect(within(screen.getByRole('dialog')).getByText('Generado sin firma')).toBeInTheDocument()
  })
})
