import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Campo } from '@/components/Campo'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Tema } from '@/types/dominio'
import { useAccionTema, type AccionTema } from './api'

const DISPONIBLES: Record<Tema['estado'], AccionTema[]> = {
  BORRADOR: ['publicar', 'retirar'],
  PUBLICADO: ['cerrar', 'retirar'],
  CERRADO: ['publicar', 'retirar'],
  ASIGNADO: [],
  RETIRADO: [],
}

const TEXTO: Record<AccionTema, { label: string; titulo: string; desc: string }> = {
  publicar: {
    label: 'Publicar',
    titulo: 'Publicar tema',
    desc: 'El tema será visible para los estudiantes y podrá recibir postulaciones.',
  },
  cerrar: {
    label: 'Cerrar',
    titulo: 'Cerrar tema',
    desc: 'El tema dejará de recibir postulaciones (RF-25) y sus postulaciones pendientes o en conflicto se rechazarán. Podrá reabrirse más adelante.',
  },
  retirar: {
    label: 'Retirar',
    titulo: 'Retirar tema',
    desc: 'El tema se retira del proceso de forma definitiva y sus postulaciones abiertas se rechazan. El historial se conserva.',
  },
}

const REABRIR = {
  label: 'Reabrir',
  titulo: 'Reabrir tema',
  desc: 'El tema volverá a estar publicado. Las postulaciones rechazadas al cerrarlo no se reactivan.',
}

const requiereMotivo = (a: AccionTema) => a !== 'publicar'

/** RF-21 / RF-25: transiciones de estado del tema. */
export function AccionesTema({ tema, size = 'sm' }: { tema: Tema; size?: 'sm' | 'default' }) {
  const accion = useAccionTema()
  const [motivo, setMotivo] = useState('')
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {DISPONIBLES[tema.estado].map((a) => {
        const reabrir = a === 'publicar' && tema.estado === 'CERRADO'
        const texto = reabrir ? REABRIR : TEXTO[a]
        return (
          <ConfirmDialog
            key={a}
            trigger={
              <Button variant={a === 'retirar' ? 'ghost' : 'outline'} size={size}>
                {texto.label}
              </Button>
            }
            titulo={`${texto.titulo}: ${tema.titulo}`}
            descripcion={texto.desc}
            destructivo={a === 'retirar'}
            confirmar={texto.label}
            onConfirm={() => {
              if (requiereMotivo(a) && !motivo.trim()) return Promise.reject(new Error('motivo'))
              return accion
                .mutateAsync({
                  id: tema.id,
                  accion: a,
                  motivo: requiereMotivo(a) ? motivo : undefined,
                  reabrir,
                })
                .then(() => setMotivo(''))
            }}
          >
            {requiereMotivo(a) && (
              <Campo
                etiqueta={a === 'cerrar' ? 'Motivo del cierre' : 'Motivo del retiro'}
                requerido
                error={!motivo.trim() ? 'Obligatorio.' : undefined}
              >
                {(p) => (
                  <Textarea
                    {...p}
                    value={motivo}
                    maxLength={1000}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                )}
              </Campo>
            )}
          </ConfirmDialog>
        )
      })}
    </div>
  )
}
