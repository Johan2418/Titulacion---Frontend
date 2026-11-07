import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FormularioImportacionTemas } from './FormularioImportacionTemas'
import { PARAMETROS_IMPORTACION_INICIALES } from './importacion'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const props = {
  carreras: [{ value: 'c', label: 'Ingeniería en Software — Facultad' }],
  lineas: [{ value: 'l', label: 'Inteligencia artificial' }],
  onChange: vi.fn(),
  onDescargarPlantilla: vi.fn(),
}

describe('FormularioImportacionTemas', () => {
  it('exige carrera, línea, tipo y archivo antes de validar', () => {
    const onValidar = vi.fn()
    render(
      <FormularioImportacionTemas
        {...props}
        valores={PARAMETROS_IMPORTACION_INICIALES}
        onValidar={onValidar}
        validando={false}
      />,
    )
    expect(screen.getByRole('combobox', { name: /Carrera/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Línea de investigación/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Tipo de tema/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Validar archivo/ })).toBeDisabled()
  })

  it('habilita la validación con todos los campos y la ejecuta', () => {
    const onValidar = vi.fn()
    render(
      <FormularioImportacionTemas
        {...props}
        valores={{ carreraId: 'c', lineaId: 'l', tipo: 'GRUPO', archivo: new File(['x'], 'temas.xlsx') }}
        onValidar={onValidar}
        validando={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Validar archivo/ }))
    expect(onValidar).toHaveBeenCalledOnce()
  })

  it('ofrece descargar la plantilla', () => {
    render(
      <FormularioImportacionTemas
        {...props}
        valores={PARAMETROS_IMPORTACION_INICIALES}
        onValidar={vi.fn()}
        validando={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Descargar plantilla/ }))
    expect(props.onDescargarPlantilla).toHaveBeenCalledOnce()
  })
})
