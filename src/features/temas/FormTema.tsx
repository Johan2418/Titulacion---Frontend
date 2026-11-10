import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Campo, SelectSimple } from '@/components/Campo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { opcionesCarrerasConFacultad, useFacultades } from '@/features/academico/api'
import { ErrorCatalogo } from '@/features/academico/ErrorCatalogo'
import { useDocentes, useLineas } from '@/features/catalogos/api'
import { opciones, TIPO_TEMA } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { Tema, TipoTema } from '@/types/dominio'
import { useGuardarTema } from './api'
import { temaSchema, type TemaForm } from './schemas'

/** RF-20 / RF-21: registro y edición de temas del banco de una carrera (no dependen del período). */
export function FormTema({ tema, onClose }: { tema: Tema | null; onClose: () => void }) {
  const lineas = useLineas()
  const docentes = useDocentes()
  const facultades = useFacultades()
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
          tipo: tema.tipo,
        }
      : {
          titulo: '',
          descripcion: '',
          carreraId: '',
          lineaId: '',
          docenteProponenteId: '',
          tipo: undefined,
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
        guardar.mutate(tema ? { id: tema.id, ...d } : d, { onSuccess: onClose }),
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
      <Campo etiqueta="Carrera" requerido error={e.carreraId?.message}>
        {(p) => (
          <>
            <Controller
              control={control}
              name="carreraId"
              render={({ field }) => (
                <SelectSimple
                  {...p}
                  value={field.value}
                  disabled={conPostulaciones}
                  onChange={(v) => {
                    if (v === field.value) return
                    field.onChange(v)
                    // el docente proponente debe pertenecer a la misma carrera del tema
                    setValue('docenteProponenteId', '')
                  }}
                  opciones={opcionesCarrerasConFacultad(facultades.data)}
                />
              )}
            />
            <ErrorCatalogo consulta={facultades} />
          </>
        )}
      </Campo>
      <Campo etiqueta="Tipo de tema" requerido error={e.tipo?.message}>
        {(p) => (
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <SelectSimple
                {...p}
                value={field.value}
                disabled={conPostulaciones}
                onChange={(v) => field.onChange(v as TipoTema)}
                opciones={opciones(TIPO_TEMA)}
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
      {conPostulaciones && (
        <Alert variant="info" className="sm:col-span-2">
          <AlertDescription>
            La carrera y el tipo no pueden cambiarse mientras haya postulaciones abiertas.
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
