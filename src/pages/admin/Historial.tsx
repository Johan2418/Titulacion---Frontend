import { useState } from 'react'
import { SelectSimple } from '@/components/Campo'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuditoria } from '@/features/auditoria/api'
import { formatFechaHora } from '@/lib/fechas'
import { nombreCompleto } from '@/lib/utils'

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
  ['lote_importacion', 'Importación'],
  ['solicitud_exportacion', 'Exportación'],
] as const
const NOMBRE_ENTIDAD = Object.fromEntries(ENTIDADES) as Record<string, string>

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

/** RF-34: trazabilidad completa del proceso (RNF-34). */
export default function Historial() {
  const [entidadTipo, setEntidad] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const query = useAuditoria({ entidadTipo, q, page, pageSize })
  return (
    <>
      <PageHeader
        titulo="Historial y auditoría"
        descripcion="Cambios de estado, postulaciones rechazadas, asignaciones anuladas, tutores reemplazados, versiones del PAT y resoluciones de ingreso. Ningún registro se elimina."
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SelectSimple
          aria-label="Filtrar por entidad"
          className="sm:w-64"
          value={entidadTipo}
          onChange={(v) => {
            setEntidad(v)
            setPage(1)
          }}
          todos="Todas las entidades"
          opciones={ENTIDADES.map(([value, label]) => ({ value, label }))}
        />
        <Input
          className="sm:w-72"
          placeholder="Buscar (acción, id, valor…)"
          aria-label="Buscar en la auditoría"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
        />
      </div>
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
    </>
  )
}
