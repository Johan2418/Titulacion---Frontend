import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUsuario } from '@/auth/AuthProvider'
import { Campo, SelectSimple } from '@/components/Campo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { opcionesCarrerasConFacultad, useFacultades } from '@/features/academico/api'
import { ErrorCatalogo } from '@/features/academico/ErrorCatalogo'
import { useDocentes } from '@/features/catalogos/api'
import { nombreCompleto } from '@/lib/utils'
import type { Programa } from '@/types/dominio'
import { useCoordinadores, useGuardarPrograma } from './api'
import {
  cuerpoPrograma,
  MAX_TEMAS_PROGRAMA_DEFECTO,
  programaSchema,
  type ProgramaForm,
  type TipoResponsable,
} from './schemas'

const OPCIONES_TIPO: { value: TipoResponsable; label: string }[] = [
  { value: 'DOCENTE', label: 'Docente' },
  { value: 'COORDINADOR', label: 'Coordinador' },
]

/** Bloque 4: alta y edición de programas. El COORDINADOR queda como responsable y no lo cambia. */
export function FormPrograma({
  programa,
  onClose,
}: {
  programa: Programa | null
  onClose: () => void
}) {
  const usuario = useUsuario()
  const esCoordinador = usuario.rol === 'COORDINADOR'
  const facultades = useFacultades()
  const docentes = useDocentes()
  const coordinadores = useCoordinadores(!esCoordinador)
  const guardar = useGuardarPrograma()
  const { register, handleSubmit, control, formState, watch, setValue } = useForm<ProgramaForm>({
    resolver: zodResolver(programaSchema) as never,
    defaultValues: programa
      ? {
          nombre: programa.nombre,
          descripcion: programa.descripcion ?? '',
          carreraId: programa.carreraId,
          tipoResponsable: programa.responsable.tipo,
          responsableDocenteId: programa.responsableDocenteId ?? '',
          responsableUsuarioId: programa.responsableUsuarioId ?? '',
          maxTemas: programa.maxTemas,
          activo: programa.activo,
        }
      : {
          nombre: '',
          descripcion: '',
          carreraId: '',
          tipoResponsable: esCoordinador ? 'COORDINADOR' : 'DOCENTE',
          responsableDocenteId: '',
          responsableUsuarioId: esCoordinador ? usuario.id : '',
          maxTemas: MAX_TEMAS_PROGRAMA_DEFECTO,
          activo: true,
        },
  })
  const e = formState.errors
  const carreraId = watch('carreraId')
  const tipo = watch('tipoResponsable')
  // el backend no permite cambiar la carrera de un programa con temas
  const carreraFija = !!programa && programa.temasRegistrados > 0

  const enviar = handleSubmit((d) => {
    const cuerpo = cuerpoPrograma(d, {
      editando: !!programa,
      coordinadorId: esCoordinador ? usuario.id : undefined,
    })
    guardar.mutate(programa ? { id: programa.id, ...cuerpo } : cuerpo, { onSuccess: onClose })
  })

  return (
    <form noValidate onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo
        etiqueta="Nombre"
        requerido
        error={e.nombre?.message}
        className="space-y-1.5 sm:col-span-2"
      >
        {(p) => <Input {...p} maxLength={150} {...register('nombre')} />}
      </Campo>
      <Campo
        etiqueta="Descripción"
        error={e.descripcion?.message}
        className="space-y-1.5 sm:col-span-2"
      >
        {(p) => <Textarea {...p} rows={3} maxLength={2000} {...register('descripcion')} />}
      </Campo>
      <Campo
        etiqueta="Carrera"
        requerido
        error={e.carreraId?.message}
        ayuda={carreraFija ? 'La carrera no cambia mientras el programa tenga temas.' : undefined}
      >
        {(p) => (
          <>
            <Controller
              control={control}
              name="carreraId"
              render={({ field }) => (
                <SelectSimple
                  {...p}
                  value={field.value}
                  disabled={carreraFija}
                  onChange={(v) => {
                    if (v === field.value) return
                    field.onChange(v)
                    // el docente responsable debe pertenecer a la carrera del programa
                    if (!esCoordinador && tipo === 'DOCENTE') setValue('responsableDocenteId', '')
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
        etiqueta="Máximo de temas"
        requerido
        error={e.maxTemas?.message}
        ayuda={programa ? `Tiene ${programa.temasRegistrados} tema(s) registrados.` : '1 a 50.'}
      >
        {(p) => <Input {...p} type="number" min={1} max={50} {...register('maxTemas')} />}
      </Campo>
      {esCoordinador ? (
        <Alert variant="info" className="sm:col-span-2">
          <AlertDescription>
            {programa
              ? 'Solo el administrador puede cambiar el responsable del programa.'
              : 'Quedarás como responsable del programa.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Campo etiqueta="Tipo de responsable" requerido>
            {(p) => (
              <Controller
                control={control}
                name="tipoResponsable"
                render={({ field }) => (
                  <SelectSimple
                    {...p}
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v as TipoResponsable)
                      // exactamente un responsable: elegir un tipo descarta el otro
                      setValue(
                        v === 'DOCENTE' ? 'responsableUsuarioId' : 'responsableDocenteId',
                        '',
                      )
                    }}
                    opciones={OPCIONES_TIPO}
                  />
                )}
              />
            )}
          </Campo>
          {tipo === 'DOCENTE' ? (
            <Campo etiqueta="Docente responsable" requerido error={e.responsableDocenteId?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="responsableDocenteId"
                  render={({ field }) => (
                    <SelectSimple
                      {...p}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!carreraId}
                      placeholder={carreraId ? 'Seleccione…' : 'Seleccione primero la carrera'}
                      opciones={(docentes.data ?? [])
                        .filter((d) => d.carrera.id === carreraId && d.estado === 'ACTIVO')
                        .map((d) => ({ value: d.id, label: nombreCompleto(d) }))}
                    />
                  )}
                />
              )}
            </Campo>
          ) : (
            <Campo
              etiqueta="Coordinador responsable"
              requerido
              error={e.responsableUsuarioId?.message}
            >
              {(p) => (
                <Controller
                  control={control}
                  name="responsableUsuarioId"
                  render={({ field }) => (
                    <SelectSimple
                      {...p}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={
                        coordinadores.isLoading ? 'Cargando coordinadores…' : 'Seleccione…'
                      }
                      opciones={(coordinadores.data ?? []).map((u) => ({
                        value: u.id,
                        label: nombreCompleto(u),
                      }))}
                    />
                  )}
                />
              )}
            </Campo>
          )}
        </>
      )}
      {programa && (
        <div className="flex items-center gap-2 sm:col-span-2">
          <Controller
            control={control}
            name="activo"
            render={({ field }) => (
              <Checkbox
                id="programa-activo"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="programa-activo">
            Programa activo (desactivarlo no lo elimina ni quita sus temas)
          </Label>
        </div>
      )}
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {programa ? 'Guardar cambios' : 'Crear programa'}
        </Button>
      </DialogFooter>
    </form>
  )
}
