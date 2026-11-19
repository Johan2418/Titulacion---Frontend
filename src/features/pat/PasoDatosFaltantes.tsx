import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Campo, SelectSimple } from '@/components/Campo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useGuardarContenidoPat, useGuardarDatosPat, type ResumenPatB } from './api'
import {
  cuerpoContenido,
  cuerpoPersonal,
  partesModificadas,
  valoresIniciales,
} from './formularioPat'
import {
  campoDePendiente,
  describirPendientes,
  etiquetaArticulacion,
  mensajeErrorPat,
} from './mensajes'
import {
  ARTICULACIONES_PAT,
  DISCAPACIDADES_PAT,
  datosFaltantesSchema,
  type DatosFaltantesForm,
} from './schemas'

type CampoTexto = {
  [K in keyof DatosFaltantesForm]: DatosFaltantesForm[K] extends string ? K : never
}[keyof DatosFaltantesForm]
const PERSONALES: { campo: CampoTexto; etiqueta: string; max: number; tipo?: string }[] = [
  { campo: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', max: 10, tipo: 'date' },
  { campo: 'sexo', etiqueta: 'Sexo', max: 40 },
  { campo: 'nacionalidad', etiqueta: 'Nacionalidad', max: 80 },
  { campo: 'estadoCivil', etiqueta: 'Estado civil', max: 40 },
  { campo: 'paralelo', etiqueta: 'Paralelo', max: 20 },
]
const UBICACION: typeof PERSONALES = [
  { campo: 'provincia', etiqueta: 'Provincia', max: 100 },
  { campo: 'canton', etiqueta: 'Cantón', max: 100 },
  { campo: 'parroquia', etiqueta: 'Parroquia', max: 100 },
]
const CONTACTO: (Omit<(typeof PERSONALES)[number], 'campo'> & {
  campo: 'correoPersonal' | 'telefonoConvencional' | 'certificadoVotacion' | 'celular'
})[] = [
  { campo: 'celular', etiqueta: 'Celular', max: 30, tipo: 'tel' },
  { campo: 'correoPersonal', etiqueta: 'Correo personal', max: 150, tipo: 'email' },
  { campo: 'telefonoConvencional', etiqueta: 'Teléfono convencional', max: 30, tipo: 'tel' },
  { campo: 'certificadoVotacion', etiqueta: 'Certificado de votación', max: 100 },
]
const DISCAPACIDAD: Record<string, string> = {
  VISUAL: 'Visual',
  FISICA: 'Física',
  AUDITIVA: 'Auditiva',
  INTELECTUAL: 'Intelectual',
  PSICOLOGICA: 'Psicológica',
  LENGUAJE: 'Lenguaje',
  OTRA: 'Otra',
}
const PENDIENTE = 'Dato pendiente.'

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">{titulo}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

/**
 * Paso 2: solo lo que el sistema no puede completar. Los datos personales se guardan una vez por
 * estudiante y se reutilizan en otros PAT; la problemática y la articulación son de este trabajo.
 */
export function PasoDatosFaltantes({
  resumen,
  pid,
  aid,
  alGuardar,
}: {
  resumen: ResumenPatB
  pid: string
  aid: string
  /** Se llama tras guardar con los pendientes actualizados. */
  alGuardar: () => Promise<string[]>
}) {
  const guardarDatos = useGuardarDatosPat()
  const guardarContenido = useGuardarContenidoPat(pid, aid)
  const [error, setError] = useState<string | null>(null)
  const [faltan, setFaltan] = useState<string[] | null>(null)
  const { register, control, handleSubmit, watch, setValue, reset, formState } =
    useForm<DatosFaltantesForm>({
      resolver: zodResolver(datosFaltantesSchema),
      defaultValues: valoresIniciales(resumen),
    })
  const pendientes = new Set(resumen.pendientes.map(campoDePendiente))
  const errorDe = (campo: keyof DatosFaltantesForm) =>
    formState.errors[campo]?.message ?? (pendientes.has(campo) ? PENDIENTE : undefined)
  const tieneDiscapacidad = watch('tieneDiscapacidad')
  const discapacidades = watch('discapacidades')
  const guardando = formState.isSubmitting

  const enviar = handleSubmit(async (d) => {
    setError(null)
    setFaltan(null)
    const partes = partesModificadas(formState.dirtyFields)
    try {
      if (partes.personal) await guardarDatos.mutateAsync(cuerpoPersonal(d))
      if (partes.contenido) await guardarContenido.mutateAsync(cuerpoContenido(d))
      reset(d)
      const restantes = await alGuardar()
      if (restantes.length) setFaltan(restantes)
    } catch (e) {
      setError(mensajeErrorPat(e))
    }
  })

  const campoTexto = ({ campo, etiqueta, max, tipo }: (typeof PERSONALES)[number]) => (
    <Campo key={campo} etiqueta={etiqueta} error={errorDe(campo)}>
      {(p) => <Input {...p} type={tipo ?? 'text'} maxLength={max} {...register(campo)} />}
    </Campo>
  )

  return (
    <form noValidate onSubmit={enviar} className="space-y-4" aria-label="Datos faltantes del PAT">
      {resumen.pendientes.length > 0 && (
        <Alert variant="warning" role="status">
          <AlertTitle>Datos pendientes</AlertTitle>
          <AlertDescription>{describirPendientes(resumen.pendientes)}.</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Tus datos personales se guardan una sola vez y se reutilizan en cualquier PAT que generes.
      </p>
      <Grupo titulo="Datos personales">{PERSONALES.map(campoTexto)}</Grupo>
      <Grupo titulo="Ubicación">{UBICACION.map(campoTexto)}</Grupo>
      <Grupo titulo="Contacto y documentos">
        {CONTACTO.map((c) => {
          if (c.campo === 'celular') return campoTexto(c)
          const noAplica = `${c.campo}NoAplica` as const
          const marcado = watch(noAplica)
          return (
            <div key={c.campo} className="space-y-1.5">
              <Campo etiqueta={c.etiqueta} error={errorDe(c.campo)}>
                {(p) => (
                  <Input
                    {...p}
                    type={c.tipo ?? 'text'}
                    maxLength={c.max}
                    disabled={marcado}
                    {...register(c.campo)}
                  />
                )}
              </Campo>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  {...register(noAplica, {
                    onChange: (e) =>
                      e.target.checked && setValue(c.campo, '', { shouldDirty: true }),
                  })}
                />
                {c.etiqueta}: no aplica
              </label>
            </div>
          )
        })}
      </Grupo>
      <Grupo titulo="Discapacidad">
        <Campo etiqueta="¿Tiene discapacidad?" error={errorDe('tieneDiscapacidad')}>
          {(p) => (
            <Controller
              control={control}
              name="tieneDiscapacidad"
              render={({ field }) => (
                <SelectSimple
                  {...p}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Seleccione"
                  opciones={[
                    { value: 'true', label: 'Sí' },
                    { value: 'false', label: 'No' },
                  ]}
                />
              )}
            />
          )}
        </Campo>
        {tieneDiscapacidad === 'true' && (
          <>
            <Controller
              control={control}
              name="discapacidades"
              render={({ field }) => (
                <fieldset
                  className="sm:col-span-2"
                  aria-invalid={!!errorDe('discapacidades')}
                  aria-describedby={
                    errorDe('discapacidades') ? 'pat-discapacidades-error' : undefined
                  }
                >
                  <legend className="text-sm font-medium">Tipo de discapacidad</legend>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    {DISCAPACIDADES_PAT.map((x) => (
                      <label key={x} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.value.includes(x)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked
                                ? [...field.value, x]
                                : field.value.filter((v) => v !== x),
                            )
                          }
                        />
                        {DISCAPACIDAD[x]}
                      </label>
                    ))}
                  </div>
                  {errorDe('discapacidades') && (
                    <p id="pat-discapacidades-error" className="text-sm text-destructive">
                      {errorDe('discapacidades')}
                    </p>
                  )}
                </fieldset>
              )}
            />
            {campoTexto({ campo: 'gradoDiscapacidad', etiqueta: 'Grado', max: 200 })}
            {discapacidades.includes('OTRA') &&
              campoTexto({
                campo: 'otraDiscapacidad',
                etiqueta: 'Otra discapacidad',
                max: 200,
              })}
          </>
        )}
      </Grupo>
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">Contenido de este PAT</legend>
        <Campo
          etiqueta="Problemática"
          error={errorDe('problematica')}
          ayuda="Se propone la descripción del tema; puedes ajustarla."
        >
          {(p) => (
            <Textarea
              {...p}
              rows={7}
              maxLength={5000}
              {...register('problematica', {
                onChange: () => setValue('confirmaProblematica', false, { shouldDirty: true }),
              })}
            />
          )}
        </Campo>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            aria-invalid={pendientes.has('confirmaProblematica')}
            {...register('confirmaProblematica')}
          />
          Confirmo que la problemática es correcta
        </label>
        {pendientes.has('confirmaProblematica') && (
          <p className="text-sm text-destructive">Debes confirmar la problemática.</p>
        )}
        <Controller
          control={control}
          name="articulaciones"
          render={({ field }) => (
            <fieldset>
              <legend className="text-sm font-medium">Articulación</legend>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {ARTICULACIONES_PAT.map((x) => (
                  <label key={x} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.value.includes(x)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.checked
                            ? x === 'NINGUNA'
                              ? [x]
                              : [...field.value.filter((v) => v !== 'NINGUNA'), x]
                            : field.value.filter((v) => v !== x),
                        )
                      }
                    />
                    {etiquetaArticulacion(x)}
                  </label>
                ))}
              </div>
              {(pendientes.has('articulaciones') ||
                pendientes.has('articulacionesExcluyentes')) && (
                <p className="text-sm text-destructive">
                  Elige al menos una articulación («Ninguna» no se combina con otras).
                </p>
              )}
            </fieldset>
          )}
        />
      </fieldset>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {faltan && (
        <Alert variant="warning">
          <AlertDescription>
            Datos guardados. Aún falta: {describirPendientes(faltan)}.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
      </div>
    </form>
  )
}
