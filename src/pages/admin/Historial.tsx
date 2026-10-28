import { useEffect, useState } from 'react'
import { SelectSimple } from '@/components/Campo'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuditoria } from '@/features/auditoria/api'
import { formatFechaHora } from '@/lib/fechas'
import { nombreCompleto } from '@/lib/utils'
import type { Auditoria } from '@/types/dominio'

const ENTIDADES = [
  ['periodo_titulacion', 'Período'],
  ['estudiante_habilitado', 'Habilitación / ingreso'],
  ['tema', 'Tema'],
  ['grupo', 'Grupo'],
  ['invitacion', 'Invitación'],
  ['postulacion', 'Postulación'],
  ['resolucion_conflicto', 'Resolución de conflicto'],
  ['asignacion_tema', 'Asignación de tema'],
  ['asignacion_tutor', 'Asignación de tutor'],
  ['documento_pat', 'Documento PAT'],
  ['revision_pat', 'Revisión PAT'],
  ['plantilla_pat', 'Plantilla PAT'],
  ['config_carga_tutorial', 'Carga tutorial'],
  ['docente', 'Docente'],
  ['usuario', 'Usuario'],
  ['preparacion_importacion', 'Preparación de importación'],
  ['lote_importacion', 'Importación'],
  ['solicitud_exportacion', 'Exportación'],
] as const
const NOMBRE_ENTIDAD = Object.fromEntries(ENTIDADES) as Record<string, string>
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ACCION = /^[A-Z_]{1,60}$/

/** Retrasa un valor de texto para no consultar en cada pulsación. */
function useRetrasado(valor: string, ms = 350) {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return retrasado
}

function Diferencias({
  antes,
  despues,
}: {
  antes?: Record<string, unknown> | null
  despues?: Record<string, unknown> | null
}) {
  const claves = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})])]
  if (!claves.length) return null
  const fmt = (v: unknown) =>
    v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return (
    <dl className="mt-2 grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[auto_1fr]">
      {claves.map((k) => (
        <div key={k} className="contents">
          <dt className="font-medium text-muted-foreground">{k}</dt>
          <dd className="break-all">
            {antes && k in antes && (
              <>
                <s className="text-muted-foreground">{fmt(antes[k])}</s> →{' '}
              </>
            )}
            {fmt(despues?.[k])}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function BloqueJson({ titulo, valor }: { titulo: string; valor?: Record<string, unknown> | null }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{titulo}</p>
      <pre className="max-h-72 overflow-auto rounded-md bg-muted p-2 text-xs break-all whitespace-pre-wrap">
        {valor ? JSON.stringify(valor, null, 2) : '—'}
      </pre>
    </div>
  )
}

function DetalleAuditoria({
  registro,
  onClose,
}: {
  registro: Auditoria | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!registro} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        {registro && (
          <>
            <DialogHeader>
              <DialogTitle>{registro.accion.replaceAll('_', ' ').toLowerCase()}</DialogTitle>
              <DialogDescription>
                Registro #{registro.id} · {formatFechaHora(registro.fechaHora)}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Entidad</dt>
              <dd>
                {NOMBRE_ENTIDAD[registro.entidadTipo] ?? registro.entidadTipo}{' '}
                <code className="text-xs break-all">{registro.entidadId}</code>
              </dd>
              <dt className="text-muted-foreground">Usuario</dt>
              <dd className="break-all">
                {registro.usuario
                  ? `${nombreCompleto(registro.usuario)} · ${registro.usuario.email} · ${registro.usuario.rol}`
                  : 'Sistema'}
              </dd>
              <dt className="text-muted-foreground">IP de origen</dt>
              <dd>{registro.ipOrigen ?? '—'}</dd>
            </dl>
            <div className="grid gap-3 sm:grid-cols-2">
              <BloqueJson titulo="Valores anteriores" valor={registro.valoresAnteriores} />
              <BloqueJson titulo="Valores nuevos" valor={registro.valoresNuevos} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** RF-34: trazabilidad completa del proceso (RNF-34). Paginación y filtros en el servidor. */
export default function Historial() {
  const [entidadTipo, setEntidad] = useState('')
  const [entidadIdTexto, setEntidadId] = useState('')
  const [accionTexto, setAccion] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [qTexto, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [detalle, setDetalle] = useState<Auditoria | null>(null)
  const pageSize = 20
  const q = useRetrasado(qTexto.trim())
  const accion = useRetrasado(accionTexto.trim().toUpperCase().replaceAll(' ', '_'))
  const entidadId = entidadIdTexto.trim()
  const entidadIdValido = !entidadId || UUID.test(entidadId)
  const accionValida = !accion || ACCION.test(accion)
  const rangoValido = !desde || !hasta || desde <= hasta
  const query = useAuditoria({
    entidadTipo: entidadTipo || undefined,
    entidadId: entidadId && entidadIdValido ? entidadId : undefined,
    accion: accion && accionValida ? accion : undefined,
    desde: rangoValido && desde ? desde : undefined,
    hasta: rangoValido && hasta ? hasta : undefined,
    q: q || undefined,
    page,
    pageSize,
  })
  /** Cambiar un filtro vuelve a la primera página. */
  const conReinicio = (set: (v: string) => void) => (v: string) => {
    set(v)
    setPage(1)
  }
  const aviso = !entidadIdValido
    ? 'El ID de la entidad debe ser un UUID válido.'
    : !accionValida
      ? 'La acción solo admite letras y guion bajo.'
      : !rangoValido
        ? 'La fecha inicial debe ser anterior o igual a la final.'
        : null

  return (
    <>
      <PageHeader
        titulo="Historial y auditoría"
        descripcion="Cambios de estado, postulaciones rechazadas, asignaciones anuladas, tutores reemplazados, versiones del PAT y resoluciones de ingreso. Ningún registro se elimina."
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <SelectSimple
          aria-label="Filtrar por entidad"
          value={entidadTipo}
          onChange={conReinicio(setEntidad)}
          todos="Todas las entidades"
          opciones={ENTIDADES.map(([value, label]) => ({ value, label }))}
        />
        <Input
          placeholder="Buscar (acción, entidad o correo)"
          aria-label="Buscar en la auditoría"
          value={qTexto}
          maxLength={100}
          onChange={(e) => conReinicio(setQ)(e.target.value)}
        />
        <Input
          placeholder="Acción exacta (p. ej. CREAR_TEMA)"
          aria-label="Filtrar por acción"
          aria-invalid={!accionValida}
          value={accionTexto}
          maxLength={60}
          onChange={(e) => conReinicio(setAccion)(e.target.value)}
        />
        <Input
          placeholder="ID de la entidad (UUID)"
          aria-label="Filtrar por ID de entidad"
          aria-invalid={!entidadIdValido}
          value={entidadIdTexto}
          onChange={(e) => conReinicio(setEntidadId)(e.target.value)}
        />
        <Input
          type="date"
          aria-label="Desde"
          value={desde}
          max={hasta || undefined}
          onChange={(e) => conReinicio(setDesde)(e.target.value)}
        />
        <Input
          type="date"
          aria-label="Hasta"
          aria-invalid={!rangoValido}
          value={hasta}
          min={desde || undefined}
          onChange={(e) => conReinicio(setHasta)(e.target.value)}
        />
      </div>
      {aviso && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {aviso}
        </p>
      )}
      <ConsultaEstado query={query}>
        {(r) =>
          r.items.length === 0 ? (
            <Vacio titulo="Sin registros" />
          ) : (
            <>
              <Card className="divide-y">
                {r.items.map((a) => (
                  <div key={a.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tono="info">{a.accion.replaceAll('_', ' ').toLowerCase()}</Badge>
                      <span className="font-medium">
                        {NOMBRE_ENTIDAD[a.entidadTipo] ?? a.entidadTipo}
                      </span>
                      {a.entidadId && (
                        <code className="text-xs text-muted-foreground">
                          {a.entidadId.slice(0, 8)}
                        </code>
                      )}
                      <Button
                        variant="link"
                        size="sm"
                        className="ml-auto h-auto p-0"
                        onClick={() => setDetalle(a)}
                      >
                        Ver detalle
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFechaHora(a.fechaHora)} ·{' '}
                      {a.usuario ? nombreCompleto(a.usuario) : 'Sistema'}
                      {a.ipOrigen && ` · IP ${a.ipOrigen}`}
                    </p>
                    <Diferencias antes={a.valoresAnteriores} despues={a.valoresNuevos} />
                  </div>
                ))}
              </Card>
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {r.total} registro(s) · página {r.page} de{' '}
                  {Math.max(1, Math.ceil(r.total / r.pageSize))}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * pageSize >= r.total}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )
        }
      </ConsultaEstado>
      <DetalleAuditoria registro={detalle} onClose={() => setDetalle(null)} />
    </>
  )
}
