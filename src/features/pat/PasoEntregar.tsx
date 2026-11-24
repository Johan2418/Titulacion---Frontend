import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DownloadIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { K } from '@/api/claves'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ConsultaEstado } from '@/components/Estados'
import { FileUpload } from '@/components/FileUpload'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { MAX_TAMANO_PAT } from '@/lib/archivos'
import { ESTADO_PAT, ORIGEN_PAT } from '@/lib/estados'
import { formatFechaHora } from '@/lib/fechas'
import type { DocumentoPat } from '@/types/dominio'
import {
  descargarGeneracionPat,
  descargarGeneracionPatWord,
  generacionActiva,
  useDocumentosPat,
  useEntregarGeneracionPat,
  useGeneracionPat,
  useGeneracionesPat,
  useReintentarGeneracionPat,
  useSolicitarGeneracionPat,
  useSubirPat,
  type EstadoGeneracionPat,
  type GeneracionPatB,
} from './api'
import { HistorialVersionesPat } from './HistorialVersiones'
import { mensajeErrorPat } from './mensajes'

const ESTADO_GENERACION: Record<EstadoGeneracionPat, string> = {
  EN_COLA: 'En cola',
  PROCESANDO: 'Generando el PDF…',
  LISTO: 'Listo',
  FALLIDO: 'Falló',
}

/** Estado de la última entrega y qué puede hacer el estudiante a continuación. */
function EstadoEntrega({ doc }: { doc: DocumentoPat }) {
  const mensaje = {
    PENDIENTE: 'El administrador revisará tu PAT. No puedes entregar otra versión mientras tanto.',
    APROBADO: 'Tu PAT fue aprobado. No admite otra entrega.',
    OBSERVADO: 'Corrige lo indicado, genera de nuevo y entrega una nueva versión.',
    RECHAZADO: 'Revisa las observaciones, genera de nuevo y entrega una nueva versión.',
  }[doc.estado]
  return (
    <section aria-labelledby="pat-estado-entrega" className="space-y-2 rounded-lg border p-4">
      <h3 id="pat-estado-entrega" className="font-medium">
        Tu entrega
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Versión {doc.version}</span>
        <StatusBadge mapa={ESTADO_PAT} valor={doc.estado} />
        <StatusBadge mapa={ORIGEN_PAT} valor={doc.origen} />
        <span className="text-muted-foreground">
          entregada el {formatFechaHora(doc.fechaCarga)}
        </span>
      </div>
      <p className="text-sm">{mensaje}</p>
      {doc.revision?.observaciones && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Observaciones del administrador</p>
          <p className="mt-1 whitespace-pre-line">{doc.revision.observaciones}</p>
        </div>
      )}
    </section>
  )
}

function CargaFirmada({ generacionId, aid }: { generacionId: string; aid: string }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const subir = useSubirPat(aid)
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Opcional: entregar el PAT firmado
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-muted-foreground">
          Descarga el PDF, imprímelo, fírmalo y carga el escaneo en PDF. Se entregará como versión
          firmada de esta generación.
        </p>
        <FileUpload
          reglas={{ tipos: { pdf: ['application/pdf'] }, maxBytes: MAX_TAMANO_PAT }}
          archivo={archivo}
          onChange={setArchivo}
          etiqueta="Selecciona el PDF firmado"
        />
        <Button
          variant="outline"
          disabled={!archivo || subir.isPending}
          onClick={() =>
            archivo &&
            subir.mutate({ archivo, generacionId }, { onSuccess: () => setArchivo(null) })
          }
        >
          Entregar PAT firmado
        </Button>
      </div>
    </details>
  )
}

function Generacion({
  g,
  pid,
  aid,
  puedeEntregar,
}: {
  g: GeneracionPatB
  pid: string
  aid: string
  puedeEntregar: boolean
}) {
  const reintentar = useReintentarGeneracionPat(pid, aid)
  const entregar = useEntregarGeneracionPat(pid, aid)
  if (generacionActiva(g))
    return (
      <p role="status" className="flex items-center gap-2 text-sm">
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
        {ESTADO_GENERACION[g.estado]} Esta página se actualiza sola.
      </p>
    )
  if (g.estado === 'FALLIDO')
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo generar el PAT</AlertTitle>
        <AlertDescription>
          <p>{g.error || 'Ocurrió un error al generar el PDF.'}</p>
          <Button
            size="sm"
            className="mt-2"
            disabled={reintentar.isPending}
            onClick={() => reintentar.mutate(g.id)}
          >
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  return (
    <div className="space-y-3">
      <p role="status" className="text-sm">
        PDF listo{g.generadaEn ? ` (generado el ${formatFechaHora(g.generadaEn)})` : ''}.
      </p>
      <div className="flex flex-wrap gap-2">
        {puedeEntregar && !g.documentoPatId && (
          <ConfirmDialog
            trigger={<Button>Entregar sin firma</Button>}
            titulo="¿Entregar el PAT sin firma?"
            descripcion="Se entregará el PDF generado tal como está, sin firma. El administrador lo revisará y podrá aprobarlo, observarlo o rechazarlo. Mientras esté pendiente no podrás entregar otra versión."
            confirmar="Entregar"
            onConfirm={() => entregar.mutateAsync(g.id)}
          />
        )}
        <Button
          variant="outline"
          onClick={() =>
            descargarGeneracionPat(pid, aid, g.id).catch((e) => toast.error(mensajeErrorPat(e)))
          }
        >
          <DownloadIcon /> Descargar para imprimir y firmar
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            descargarGeneracionPatWord(pid, aid, g.id).catch((e) =>
              toast.error(mensajeErrorPat(e)),
            )
          }
        >
          <DownloadIcon /> Descargar Word
        </Button>
      </div>
      {puedeEntregar && <CargaFirmada generacionId={g.id} aid={aid} />}
    </div>
  )
}

function ListaGeneraciones({ generaciones }: { generaciones: GeneracionPatB[] }) {
  if (!generaciones.length) return null
  return (
    <section aria-labelledby="pat-generaciones" className="space-y-2">
      <h3 id="pat-generaciones" className="text-sm font-medium">
        Generaciones solicitadas
      </h3>
      <ul className="divide-y rounded-lg border text-sm">
        {generaciones.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span>{g.solicitadaEn ? formatFechaHora(g.solicitadaEn) : 'Generación'}</span>
            <span className="text-muted-foreground">
              {ESTADO_GENERACION[g.estado]}
              {g.documentoPatId ? ' · entregada' : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Paso 3: generar el PDF y entregarlo. La entrega principal es directa y sin firma; la carga del
 * PDF firmado queda como alternativa opcional.
 */
export function PasoEntregar({
  pid,
  aid,
  habilitado,
  listo,
}: {
  pid: string
  aid: string
  /** Período en POSTULACION_CERRADA/EN_CURSO y asignación vigente. */
  habilitado: boolean
  /** Sin pendientes. */
  listo: boolean
}) {
  const qc = useQueryClient()
  const generaciones = useGeneracionesPat(pid, aid)
  const documentos = useDocumentosPat(aid)
  const solicitar = useSolicitarGeneracionPat(pid, aid)
  const ultimaListada = generaciones.data?.[0]
  const sondeo = useGeneracionPat(
    pid,
    aid,
    generacionActiva(ultimaListada) ? ultimaListada?.id : undefined,
  )
  const ultima = sondeo.data ?? ultimaListada
  const estadoUltima = ultima?.estado
  const estadoListado = ultimaListada?.estado
  useEffect(() => {
    // Al terminar el sondeo, el historial vuelve a consultarse para reflejar el nuevo estado.
    if (estadoUltima && estadoListado && estadoUltima !== estadoListado)
      void qc.invalidateQueries({ queryKey: [...K.pat, 'me'] })
  }, [estadoUltima, estadoListado, qc])

  const ultimoDoc = documentos.data?.[0]
  const puedeEntregar =
    habilitado &&
    !!documentos.data &&
    (!ultimoDoc || ultimoDoc.estado === 'OBSERVADO' || ultimoDoc.estado === 'RECHAZADO')
  const puedeGenerar =
    puedeEntregar && listo && !generacionActiva(ultima) && ultima?.estado !== 'FALLIDO'

  return (
    <div className="space-y-5">
      {!habilitado && (
        <Alert variant="warning">
          <AlertDescription>
            La entrega del PAT solo se permite con postulaciones cerradas o durante la titulación, y
            con la asignación de tema vigente.
          </AlertDescription>
        </Alert>
      )}
      {ultimoDoc && <EstadoEntrega doc={ultimoDoc} />}
      <ConsultaEstado query={generaciones}>
        {(lista) => (
          <div className="space-y-4">
            {ultima && (!ultima.documentoPatId || generacionActiva(ultima)) && (
              <Generacion g={ultima} pid={pid} aid={aid} puedeEntregar={puedeEntregar} />
            )}
            {puedeGenerar && (
              <div className="space-y-2">
                <Button
                  variant={
                    ultima?.estado === 'LISTO' && !ultima.documentoPatId ? 'outline' : 'default'
                  }
                  disabled={solicitar.isPending}
                  onClick={() => solicitar.mutate()}
                >
                  {ultima ? 'Generar de nuevo' : 'Generar PAT'}
                </Button>
                {!ultima && (
                  <p className="text-sm text-muted-foreground">
                    Se creará el PDF con tus datos actuales. Luego podrás entregarlo.
                  </p>
                )}
              </div>
            )}
            {solicitar.error && (
              <Alert variant="destructive">
                <AlertDescription>{mensajeErrorPat(solicitar.error)}</AlertDescription>
              </Alert>
            )}
            <ListaGeneraciones generaciones={lista} />
          </div>
        )}
      </ConsultaEstado>
      <section aria-labelledby="pat-versiones" className="space-y-2">
        <h3 id="pat-versiones" className="text-sm font-medium">
          Versiones entregadas
        </h3>
        <ConsultaEstado query={documentos}>
          {(docs) => <HistorialVersionesPat documentos={docs} />}
        </ConsultaEstado>
      </section>
    </div>
  )
}
