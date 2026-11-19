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
import { useProgramas } from '@/features/programas/api'
import { useUsuario } from '@/auth/AuthProvider'
import { nombreCompleto } from '@/lib/utils'
import type { Tema, TipoTema } from '@/types/dominio'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useGuardarTema } from './api'
import { opcionesTipoTema } from './integrantes'
import { camposProgramaTema, temaSchemaPara, type TemaForm } from './schemas'

/** RF-20 / RF-21: registro y edición de temas del banco de una carrera (no dependen del período). */
export function FormTema({ tema, onClose }: { tema: Tema | null; onClose: () => void }) {
  const usuario = useUsuario()
  // bloque 4: el COORDINADOR solo registra temas dentro de sus programas
  const esCoordinador = usuario.rol === 'COORDINADOR'
  const lineas = useLineas()
  const docentes = useDocentes()
  const facultades = useFacultades()
  const guardar = useGuardarTema()
  const { periodo } = usePeriodo()
  const maxPeriodo = periodo?.maxIntegrantesDefault
  const { register, handleSubmit, control, formState, setValue, watch } = useForm<TemaForm>({
    resolver: zodResolver(temaSchemaPara(esCoordinador)) as never,
    defaultValues: tema
      ? {
          titulo: tema.titulo,
          descripcion: tema.descripcion,
          carreraId: tema.carrera.id,
          lineaId: tema.linea.id,
          docenteProponenteId: tema.docenteProponente.id,
          tipo: tema.tipo,
          programaId: tema.programaId ?? '',
          categoria: tema.categoria ?? '',
        }
      : {
          titulo: '',
          descripcion: '',
          carreraId: '',
          lineaId: '',
          docenteProponenteId: '',
          tipo: undefined,
          programaId: '',
          categoria: '',
        },
  })
  const e = formState.errors
  const carreraId = watch('carreraId')
  // programas activos de la carrera del tema (el COORDINADOR, solo los suyos)
  const programas = useProgramas({ carreraId, activo: true, mios: esCoordinador }, !!carreraId)
  const conPostulaciones = !!tema && tema.postulacionesAbiertas > 0

  return (
    <form
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit(({ programaId, categoria, ...d }) => {
        const programa = camposProgramaTema({ programaId, categoria }, tema)
        guardar.mutate(tema ? { id: tema.id, ...d, ...programa } : { ...d, ...programa }, {
          onSuccess: onClose,
        })
      })}
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
                    // el docente proponente y el programa deben ser de la misma carrera del tema
                    setValue('docenteProponenteId', '')
                    setValue('programaId', '')
                  }}
                  opciones={opcionesCarrerasConFacultad(facultades.data)}
                />
              )}
            />
            <ErrorCatalogo consulta={facultades} />
          </>
        )}
      </Campo>
      <Campo
        etiqueta="Tipo de tema"
        requerido
        error={e.tipo?.message}
        ayuda={
          periodo
            ? `El máximo de integrantes de un tema grupal es ${maxPeriodo}, según el período ${periodo.nombre}.`
            : 'El máximo de integrantes de un tema grupal lo define el período.'
        }
      >
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
                opciones={opcionesTipoTema(maxPeriodo)}
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
      <Campo
        etiqueta="Programa"
        requerido={esCoordinador}
        error={e.programaId?.message}
        ayuda="Solo programas activos de la carrera del tema."
      >
        {(p) => (
          <Controller
            control={control}
            name="programaId"
            render={({ field }) => {
              const lista = programas.data ?? []
              // conserva visible el programa actual aunque esté inactivo o lleno
              const actual =
                tema?.programa && !lista.some((x) => x.id === tema.programa?.id)
                  ? [{ value: tema.programa.id, label: tema.programa.nombre }]
                  : []
              return (
                <SelectSimple
                  {...p}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!carreraId}
                  placeholder={carreraId ? 'Sin programa' : 'Seleccione primero la carrera'}
                  todos={esCoordinador ? undefined : 'Sin programa'}
                  opciones={[
                    ...actual,
                    ...lista.map((x) => ({
                      value: x.id,
                      label: `${x.nombre} (${x.temasRegistrados}/${x.maxTemas})`,
                      disabled: x.temasRegistrados >= x.maxTemas && x.id !== tema?.programaId,
                    })),
                  ]}
                />
              )
            }}
          />
        )}
      </Campo>
      <Campo
        etiqueta="Categoría"
        error={e.categoria?.message}
        ayuda="Opcional, hasta 120 caracteres."
      >
        {(p) => <Input {...p} maxLength={120} {...register('categoria')} />}
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
