import { useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, UserPlusIcon, XIcon } from 'lucide-react'
import { SelectSimple } from '@/components/Campo'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { nombreCompleto } from '@/lib/utils'
import type { Postulacion } from '@/types/dominio'
import { useCompletarTutores, useTutoresDisponibles } from './api'
import { moverElemento } from './reglas'

/**
 * Registro único de tutores propuestos para una postulación PENDIENTE que no los tiene (p. ej.
 * registrada antes de que fueran obligatorios). El backend valida plazo, titular/representante
 * y que la lista no exista; la lista no se puede modificar después.
 */
export function CompletarTutoresDialog({ postulacion }: { postulacion: Postulacion }) {
  const [abierto, setAbierto] = useState(false)
  const docentes = useTutoresDisponibles(abierto ? postulacion.tema.id : undefined)
  const completar = useCompletarTutores()
  const [tutores, setTutores] = useState<string[]>([])
  const [agregar, setAgregar] = useState('')

  const porId = new Map((docentes.data ?? []).map((d) => [d.id, d]))
  const disponibles = (docentes.data ?? []).filter((d) => !tutores.includes(d.id))

  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o)
        if (!o) {
          setTutores([])
          setAgregar('')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlusIcon /> Registrar tutores propuestos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tutores propuestos</DialogTitle>
          <DialogDescription>
            Indica uno o varios docentes en orden de prioridad. Solo puede registrarse una vez,
            dentro del plazo de postulación; la asignación definitiva la realiza el responsable de
            titulación.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-2" aria-label="Tutores en orden de prioridad">
          {tutores.map((dId, i) => {
            const d = porId.get(dId)
            return (
              <li key={dId} className="flex items-center gap-2 rounded-lg border p-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {nombreCompleto(d)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === 0}
                  onClick={() => setTutores(moverElemento(tutores, i, i - 1))}
                  aria-label={`Subir prioridad de ${nombreCompleto(d)}`}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === tutores.length - 1}
                  onClick={() => setTutores(moverElemento(tutores, i, i + 1))}
                  aria-label={`Bajar prioridad de ${nombreCompleto(d)}`}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTutores(tutores.filter((x) => x !== dId))}
                  aria-label={`Quitar a ${nombreCompleto(d)}`}
                >
                  <XIcon />
                </Button>
              </li>
            )
          })}
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SelectSimple
            aria-label="Docente a agregar"
            className="sm:flex-1"
            value={agregar}
            onChange={setAgregar}
            placeholder={docentes.isLoading ? 'Cargando docentes…' : 'Seleccione un docente…'}
            opciones={disponibles.map((d) => ({
              value: d.id,
              label: nombreCompleto(d),
            }))}
          />
          <Button
            variant="outline"
            disabled={!agregar}
            onClick={() => {
              setTutores([...tutores, agregar])
              setAgregar('')
            }}
          >
            <PlusIcon /> Agregar
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button
            disabled={tutores.length === 0 || completar.isPending}
            onClick={() =>
              completar.mutate(
                { id: postulacion.id, tutores },
                { onSuccess: () => setAbierto(false) },
              )
            }
          >
            Guardar preferencias
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
