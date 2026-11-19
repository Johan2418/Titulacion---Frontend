import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisponibilidadTema } from '@/pages/estudiante/componentes'
import { ESTADOS_POSTULACION, ESTADOS_TEMA } from '@/types/dominio'
import { ESTADO_CONFIRMACION, ESTADO_POSTULACION, ESTADO_TEMA, opciones } from './estados'

describe('estados del bloque 3', () => {
  it('rotula el tema reservado y la postulación por confirmar', () => {
    expect(ESTADO_TEMA.RESERVADO.label).toBe('Reservado')
    expect(ESTADO_POSTULACION.PENDIENTE_CONFIRMACION.label).toBe('Pendiente de confirmación')
    expect(ESTADO_CONFIRMACION.CONFIRMADA.label).toBe('Confirmó')
  })

  it('los filtros de estado incluyen los nuevos valores', () => {
    expect(opciones(ESTADO_TEMA).map((o) => o.value)).toEqual([...ESTADOS_TEMA])
    expect(opciones(ESTADO_POSTULACION).map((o) => o.value)).toEqual(
      expect.arrayContaining([...ESTADOS_POSTULACION]),
    )
  })

  it('un tema reservado no aparece como disponible para el estudiante', () => {
    render(<DisponibilidadTema tema={{ disponible: false, estado: 'RESERVADO' }} />)
    expect(screen.getByText('No disponible · Reservado')).toBeInTheDocument()
  })
})
