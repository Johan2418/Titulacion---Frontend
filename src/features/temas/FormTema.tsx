import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Campo, SelectSimple } from '@/components/Campo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { carrerasDeFacultad, opcionesCarreras, useFacultades } from '@/features/academico/api'
import { useDocentes, useLineas } from '@/features/catalogos/api'
import { nombreCompleto } from '@/lib/utils'
import type { Tema } from '@/types/dominio'
import { useGuardarTema } from './api'
import { temaSchema, type TemaForm } from './schemas'

/** RF-20 / RF-21: registro y edición de temas. */
export function FormTema({
  tema,
  periodoId,
  facultadId,
  maxDefault,
  onClose,
}: {
  tema: Tema | null
  periodoId: string
  /** Facultad del período: solo sus carreras son elegibles. */
  facultadId: string | undefined
  maxDefault: number
  onClose: () => void
}) {
  const lineas = useLineas()
  const docentes = useDocentes()
  const facultades = useFacultades()
  const carreras = carrerasDeFacultad(facultades.data, facultadId)
  const guardar = useGuardarTema()
  const { register, handleSubmit, control, formState, setValue, watch } = useForm<TemaForm>({
    resolver: zodResolver(temaSchema) as never,
    defaultValues: tema
      ? {
          titulo: tema.titulo,
          descripcion: tema.descripcion,
          carreraId: tema.carrera.id,
          lineaId: tema.linea.id,
          docenteProponenteId: tema.docenteProponente.id,
          minIntegrantes: tema.minIntegrantes,
          maxIntegrantes: tema.maxIntegrantes,
        }
      : {
          titulo: '',
          descripcion: '',
          carreraId: '',
          lineaId: '',
          docenteProponenteId: '',
          minIntegrantes: 1,
          maxIntegrantes: maxDefault,
        },
  })
  const e = formState.errors
  const carreraId = watch('carreraId')
  const conPostulaciones = !!tema && tema.postulacionesAbiertas > 0

  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit((d) =>
        guardar.mutate(tema ? { id: tema.id, ...d } : { ...d, periodoId }, { onSuccess: onClose }),
      )}
    >
      <Campo
        etiqueta="Título"
        requerido
        error={e.titulo?.message}
        className="space-y-1.5 sm:col-span-2"
      >
        {(p) => <Input {...p} {...register('titulo')} maxLength={250} />}
      </Campo>
      <Campo
        etiqueta="Descripción"
        requerido
        error={e.descripcion?.message}
        className="space-y-1.5 sm:col-span-2"
      >
        {(p) => <Textarea {...p} rows={5} {...register('descripcion')} />}
      </Campo>
      <Campo
        etiqueta="Carrera"
        requerido
        error={e.carreraId?.message}
        ayuda={
          facultades.isLoading || carreras.length
            ? undefined
            : 'La facultad del período no tiene carreras disponibles.'
        }
      >
        {(p) => (
          <Controller
            control={control}
            name="carreraId"
            render={({ field }) => (
              <SelectSimple
                {...p}
                value={field.value}
                onChange={(v) => {
                  if (v === field.value) return
                  field.onChange(v)
                  // el docente proponente debe pertenecer a la misma carrera del tema
                  setValue('docenteProponenteId', '')
                }}
                opciones={opcionesCarreras(carreras)}
              />
            )}
          />
        )}
      </Campo>
      <Campo etiqueta="Línea de investigación" requerido error={e.lineaId?.message}>
        {(p) => (
          <Controller
            control={control}
            name="lineaId"
            render={({ field }) => (
              <SelectSimple
                {...p}
                value={field.value}
                onChange={field.onChange}
                opciones={(lineas.data ?? [])
                  .filter((l) => l.activa || l.id === field.value)
                  .map((l) => ({ value: l.id, label: l.nombre }))}
              />
            )}
          />
        )}
      </Campo>
      <Campo etiqueta="Docente proponente" requerido error={e.docenteProponenteId?.message}>
        {(p) => (
          <Controller
            control={control}
            name="docenteProponenteId"
            render={({ field }) => (
              <SelectSimple
                {...p}
                value={field.value}
                onChange={field.onChange}
                disabled={!carreraId}
                placeholder={carreraId ? 'Seleccione…' : 'Seleccione primero la carrera'}
                opciones={(docentes.data ?? [])
                  .filter((d) => d.carrera.id === carreraId)
                  .map((d) => ({ value: d.id, label: nombreCompleto(d) }))}
              />
            )}
          />
        )}
      </Campo>
      <Campo etiqueta="Mínimo de integrantes" requerido error={e.minIntegrantes?.message}>
        {(p) => (
          <Input
            {...p}
            type="number"
            min={1}
            disabled={conPostulaciones}
            {...register('minIntegrantes')}
          />
        )}
      </Campo>
      <Campo etiqueta="Máximo de integrantes" requerido error={e.maxIntegrantes?.message}>
        {(p) => (
          <Input
            {...p}
            type="number"
            min={1}
            disabled={conPostulaciones}
            {...register('maxIntegrantes')}
          />
        )}
      </Campo>
      {conPostulaciones && (
        <Alert variant="info" className="sm:col-span-2">
          <AlertDescription>
            El rango de integrantes no puede cambiarse mientras haya postulaciones abiertas.
          </AlertDescription>
        </Alert>
      )}
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {tema ? 'Guardar cambios' : 'Registrar tema'}
        </Button>
      </DialogFooter>
    </form>
  )
}
