import { useRef, useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { ConsultaEstado } from '@/components/Estados'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useResumenPat, type ResumenPatB } from './api'
import { describirPendientes } from './mensajes'
import { PasoDatosFaltantes } from './PasoDatosFaltantes'
import { PasoEntregar } from './PasoEntregar'
import { PasoResumen } from './PasoResumen'

const PASOS = [
  {
    titulo: 'Resumen automático',
    descripcion: 'Revisa los datos que el sistema completa por ti.',
  },
  {
    titulo: 'Datos faltantes',
    descripcion: 'Completa solo lo que el sistema no conoce.',
  },
  {
    titulo: 'Entregar',
    descripcion: 'Genera el PDF y entrégalo.',
  },
] as const

function Asistente({
  resumen,
  pid,
  aid,
  habilitado,
  refrescar,
}: {
  resumen: ResumenPatB
  pid: string
  aid: string
  habilitado: boolean
  refrescar: () => Promise<string[]>
}) {
  // Quien ya no tiene pendientes vuelve directamente a la entrega.
  const [paso, setPaso] = useState(resumen.pendientes.length === 0 ? 2 : 0)
  const titulo = useRef<HTMLHeadingElement>(null)
  const listo = resumen.pendientes.length === 0
  const ir = (i: number) => {
    setPaso(i)
    requestAnimationFrame(() => titulo.current?.focus())
  }
  const bloqueado = (i: number) => i === 2 && !listo

  return (
    <div className="space-y-4">
      <nav aria-label="Pasos para entregar el PAT">
        <ol className="flex flex-wrap gap-2">
          {PASOS.map((p, i) => (
            <li key={p.titulo}>
              <button
                type="button"
                aria-current={i === paso ? 'step' : undefined}
                disabled={bloqueado(i)}
                title={bloqueado(i) ? 'Completa los datos faltantes primero' : undefined}
                onClick={() => ir(i)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50',
                  i === paso && 'border-primary bg-primary text-primary-foreground',
                  i !== paso &&
                    i === 1 &&
                    listo &&
                    'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
                )}
              >
                <span className="font-semibold">{i + 1}</span>
                {p.titulo}
                {i === 1 && listo && <CheckIcon className="size-4" aria-label="completo" />}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <Card>
        <CardHeader>
          <CardTitle ref={titulo} tabIndex={-1} className="outline-none">
            Paso {paso + 1}: {PASOS[paso].titulo}
          </CardTitle>
          <CardDescription>{PASOS[paso].descripcion}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paso === 0 && (
            <>
              <PasoResumen resumen={resumen} pid={pid} aid={aid} editable={habilitado} />
              <div className="flex justify-end">
                <Button onClick={() => ir(1)}>Continuar</Button>
              </div>
            </>
          )}
          {paso === 1 && (
            <>
              <PasoDatosFaltantes
                key={resumen.estudianteId}
                resumen={resumen}
                pid={pid}
                aid={aid}
                alGuardar={async () => {
                  const restantes = await refrescar()
                  if (!restantes.length) ir(2)
                  return restantes
                }}
              />
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => ir(0)}>
                  Atrás
                </Button>
                <Button variant="ghost" disabled={!listo} onClick={() => ir(2)}>
                  Ir a entregar
                </Button>
              </div>
            </>
          )}
          {paso === 2 && (
            <>
              {!listo && (
                <Alert variant="warning">
                  <AlertDescription>
                    Antes de generar falta: {describirPendientes(resumen.pendientes)}.
                  </AlertDescription>
                </Alert>
              )}
              <PasoEntregar pid={pid} aid={aid} habilitado={habilitado} listo={listo} />
              <div className="flex justify-start">
                <Button variant="outline" onClick={() => ir(1)}>
                  Revisar mis datos
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Asistente «Entregar PAT»: resumen automático → datos faltantes → generación y entrega. */
export function AsistenteEntregaPat({
  pid,
  aid,
  habilitado,
}: {
  pid: string
  aid: string
  habilitado: boolean
}) {
  const resumen = useResumenPat(pid, aid)
  return (
    <ConsultaEstado query={resumen}>
      {(r) => (
        <Asistente
          resumen={r}
          pid={pid}
          aid={aid}
          habilitado={habilitado}
          refrescar={async () => (await resumen.refetch()).data?.pendientes ?? r.pendientes}
        />
      )}
    </ConsultaEstado>
  )
}
