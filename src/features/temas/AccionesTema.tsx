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
    desc: 'El tema dejará de recibir postulaciones (RF-25). Las existentes se conservan.',
  },
  retirar: {
    label: 'Retirar',
    titulo: 'Retirar tema',
    desc: 'El tema se retira del proceso y sus postulaciones abiertas se rechazan. El historial se conserva.',
  },
}

/** RF-21 / RF-25: transiciones de estado del tema. */
export function AccionesTema({ tema, size = 'sm' }: { tema: Tema; size?: 'sm' | 'default' }) {
  const accion = useAccionTema()
  const [motivo, setMotivo] = useState('')
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {DISPONIBLES[tema.estado].map((a) => (
        <ConfirmDialog
          key={a}
          trigger={
            <Button variant={a === 'retirar' ? 'ghost' : 'outline'} size={size}>
              {TEXTO[a].label}
            </Button>
          }
          titulo={`${TEXTO[a].titulo}: ${tema.titulo}`}
          descripcion={TEXTO[a].desc}
          destructivo={a === 'retirar'}
          confirmar={TEXTO[a].label}
          onConfirm={() => {
            if (a === 'retirar' && !motivo.trim()) return Promise.reject(new Error('motivo'))
            return accion
              .mutateAsync({ id: tema.id, accion: a, motivo: motivo || undefined })
              .then(() => setMotivo(''))
          }}
        >
          {a === 'retirar' && (
            <Campo
              etiqueta="Motivo del retiro"
              requerido
              error={!motivo.trim() ? 'Obligatorio.' : undefined}
            >
              {(p) => (
                <Textarea {...p} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              )}
            </Campo>
          )}
        </ConfirmDialog>
      ))}
    </div>
  )
}
