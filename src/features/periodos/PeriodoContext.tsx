import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PeriodoTitulacion } from '@/types/dominio'
import { usePeriodos } from './api'

const CLAVE = 'titulacion.periodoSeleccionado'

interface Ctx {
  periodos: PeriodoTitulacion[]
  periodo: PeriodoTitulacion | null
  periodoId: string | undefined
  seleccionar: (id: string) => void
  cargando: boolean
}

const PeriodoCtx = createContext<Ctx | null>(null)

const PRIORIDAD = [
  'POSTULACION_ABIERTA',
  'POSTULACION_CERRADA',
  'EN_CURSO',
  'BORRADOR',
  'ARCHIVADO',
]

/** Contexto global de período: la mayoría de vistas dependen del período seleccionado. */
export function PeriodoProvider({ children }: { children: React.ReactNode }) {
  const { data: periodos = [], isPending } = usePeriodos()
  const [seleccion, setSeleccion] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CLAVE)
    } catch {
      return null
    }
  })

  const porDefecto = useMemo(
    () =>
      [...periodos].sort((a, b) => PRIORIDAD.indexOf(a.estado) - PRIORIDAD.indexOf(b.estado))[0] ??
      null,
    [periodos],
  )
  const periodo = periodos.find((p) => p.id === seleccion) ?? porDefecto

  useEffect(() => {
    if (seleccion && periodos.length && !periodos.some((p) => p.id === seleccion))
      setSeleccion(null)
  }, [periodos, seleccion])

  const valor = useMemo<Ctx>(
    () => ({
      periodos,
      periodo,
      periodoId: periodo?.id,
      cargando: isPending,
      seleccionar: (id) => {
        setSeleccion(id)
        try {
          localStorage.setItem(CLAVE, id)
        } catch {
          // sin almacenamiento
        }
      },
    }),
    [periodos, periodo, isPending],
  )
  return <PeriodoCtx.Provider value={valor}>{children}</PeriodoCtx.Provider>
}

export function usePeriodo() {
  const ctx = useContext(PeriodoCtx)
  if (!ctx) throw new Error('usePeriodo debe usarse dentro de <PeriodoProvider>')
  return ctx
}
