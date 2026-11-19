import type { ReactNode } from 'react'
import { Campo, SelectSimple } from '@/components/Campo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { nombreCompleto } from '@/lib/utils'
import { useElegirTutorPat, type ResumenPatB } from './api'
import { etiquetaArticulacion } from './mensajes'

const MODALIDAD_ACADEMICA: Record<string, string> = {
  TRABAJO_INTEGRACION_CURRICULAR: 'Trabajo de integración curricular',
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const vacio = children === null || children === undefined || children === ''
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">
        {vacio ? <span className="text-muted-foreground">Sin dato</span> : children}
      </dd>
    </div>
  )
}

function Tutor({
  resumen,
  pid,
  aid,
  editable,
}: {
  resumen: ResumenPatB
  pid: string
  aid: string
  editable: boolean
}) {
  const elegir = useElegirTutorPat(pid, aid)
  const { valor, fuente } = resumen.automaticos.tutor
  const propuestas = resumen.tutoresPropuestos.data
  if (fuente === 'ASIGNACION_TUTOR' && valor)
    return (
      <dl>
        <Dato etiqueta="Tutor asignado">{nombreCompleto(valor)}</Dato>
      </dl>
    )
  if (!propuestas.length)
    return (
      <Alert variant="warning">
        <AlertTitle>Sin tutor</AlertTitle>
        <AlertDescription>
          Tu trabajo no tiene tutor asignado ni tutores propuestos. Contacta al administrador.
        </AlertDescription>
      </Alert>
    )
  const elegido = resumen.editables.contenido.tutorPropuestoId ?? valor?.tutorPropuestoId ?? ''
  return (
    <Campo
      etiqueta="Tutor propuesto"
      ayuda="Aún no tienes tutor asignado. Se imprimirá la propuesta elegida (por defecto, la primera de tu postulación)."
    >
      {(p) => (
        <SelectSimple
          {...p}
          value={elegido}
          disabled={!editable || elegir.isPending}
          onChange={(v) => v && v !== elegido && elegir.mutate(v)}
          opciones={propuestas.map((t) => ({
            value: t.id,
            label: `${t.ordenPrioridad}. ${nombreCompleto(t)}${t.esProponenteTema ? ' (proponente del tema)' : ''}${t.elegibleActualmente ? '' : ' (no disponible)'}`,
            disabled: !t.elegibleActualmente && t.id !== elegido,
          }))}
        />
      )}
    </Campo>
  )
}

/** Paso 1: valores que el sistema completa solo (solo lectura). */
export function PasoResumen({
  resumen,
  pid,
  aid,
  editable,
}: {
  resumen: ResumenPatB
  pid: string
  aid: string
  editable: boolean
}) {
  const a = resumen.automaticos
  const integrantes = a.integrantes.valor ?? []
  return (
    <div className="space-y-4">
      <Alert variant="info" role="note">
        <AlertDescription>
          Estos datos se completan automáticamente desde el sistema. Si alguno es incorrecto,
          solicita la corrección al administrador; no se editan aquí.
        </AlertDescription>
      </Alert>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Dato etiqueta="Estudiante">
          {[a.nombres.valor, a.apellidos.valor].filter(Boolean).join(' ')}
        </Dato>
        <Dato etiqueta="Cédula">{a.cedula.valor}</Dato>
        <Dato etiqueta="Matrícula">{a.matricula.valor}</Dato>
        <Dato etiqueta="Correo institucional">{a.correoInstitucional.valor}</Dato>
        <Dato etiqueta="Facultad">{a.facultad.valor}</Dato>
        <Dato etiqueta="Carrera">{a.carrera.valor}</Dato>
        <Dato etiqueta="Período">
          {a.periodo.valor &&
            [a.periodo.valor.nombre, a.periodo.valor.codigo && `(${a.periodo.valor.codigo})`]
              .filter(Boolean)
              .join(' ')}
        </Dato>
        <Dato etiqueta="Sede o extensión">
          {a.extensionPat.valor ?? (
            <span className="text-amber-700 dark:text-amber-300">
              Pendiente: debe configurarla el administrador
            </span>
          )}
        </Dato>
        <Dato etiqueta="Curso">{a.curso.valor}</Dato>
        <Dato etiqueta="Modalidad académica">
          {a.modalidadAcademica.valor &&
            (MODALIDAD_ACADEMICA[a.modalidadAcademica.valor] ?? a.modalidadAcademica.valor)}
        </Dato>
        <div className="sm:col-span-2">
          <Dato etiqueta="Tema">{a.temaTitulo.valor}</Dato>
        </div>
        <Dato etiqueta="Línea de investigación">
          {a.lineaInvestigacion.valor &&
            `${a.lineaInvestigacion.valor.codigo} · ${a.lineaInvestigacion.valor.nombre}`}
        </Dato>
        <Dato etiqueta="Articulación sugerida">
          {a.articulacionesSugeridas.valor.map(etiquetaArticulacion).join(', ')}
        </Dato>
        <Dato etiqueta="Modalidad">
          {a.modalidad.valor === 'GRUPAL'
            ? 'Grupal'
            : a.modalidad.valor === 'INDIVIDUAL'
              ? 'Individual'
              : null}
        </Dato>
        <Dato etiqueta="Integrantes">
          {integrantes.length > 0 && (
            <ul>
              {integrantes.map((i) => (
                <li key={i.id}>{nombreCompleto(i)}</li>
              ))}
            </ul>
          )}
        </Dato>
        <div className="sm:col-span-2">
          <Dato etiqueta="Problemática sugerida (descripción del tema)">
            {a.problematicaSugerida.valor && (
              <span className="font-normal whitespace-pre-line">
                {a.problematicaSugerida.valor}
              </span>
            )}
          </Dato>
        </div>
      </dl>
      <Tutor resumen={resumen} pid={pid} aid={aid} editable={editable} />
    </div>
  )
}
