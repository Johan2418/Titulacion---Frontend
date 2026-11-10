import { useState } from 'react'
import { Link } from 'react-router'
import { UserIcon, UsersIcon } from 'lucide-react'
import { SelectSimple } from '@/components/Campo'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLineas } from '@/features/catalogos/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useProponentes, useTemas } from '@/features/temas/api'
import { maxIntegrantes, textoIntegrantes } from '@/features/temas/integrantes'
import { opciones, TIPO_TEMA } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { TipoTema } from '@/types/dominio'
import { DisponibilidadTema } from './componentes'

/** RF-05 / RF-07: temas publicados del banco de la carrera del estudiante, con filtros y disponibilidad. */
export default function CatalogoTemas() {
  const { periodoId } = usePeriodo()
  const [lineaId, setLineaId] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [tipo, setTipo] = useState<TipoTema | ''>('')
  const [disponible, setDisponible] = useState(true)
  const [texto, setTexto] = useState('')
  const lineas = useLineas()
  const docentes = useProponentes(periodoId)
  const query = useTemas(
    { periodoId, lineaId, docenteId, tipo, disponible: disponible || undefined },
    !!periodoId,
  )

  return (
    <>
      <PageHeader
        titulo="Temas de titulación"
        descripcion="Temas publicados de tu carrera. Filtra y revisa su disponibilidad antes de postular."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Buscar por título…"
          aria-label="Buscar por título"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="lg:col-span-2"
        />
        <SelectSimple
          aria-label="Línea de investigación"
          value={lineaId}
          onChange={setLineaId}
          todos="Todas las líneas"
          opciones={(lineas.data ?? [])
            .filter((l) => l.activa)
            .map((l) => ({ value: l.id, label: l.nombre }))}
        />
        <SelectSimple
          aria-label="Docente proponente"
          value={docenteId}
          onChange={setDocenteId}
          todos="Todos los docentes"
          opciones={(docentes.data ?? []).map((d) => ({ value: d.id, label: nombreCompleto(d) }))}
        />
        <SelectSimple
          aria-label="Tipo de tema"
          value={tipo}
          onChange={(v) => setTipo(v as TipoTema | '')}
          todos="Todos los tipos"
          opciones={opciones(TIPO_TEMA)}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="solo-disponibles"
            checked={disponible}
            onCheckedChange={(v) => setDisponible(v === true)}
          />
          <Label htmlFor="solo-disponibles">Solo disponibles</Label>
        </div>
      </div>
      <ConsultaEstado query={query} filas={4}>
        {(temas) => {
          const lista = temas.filter(
            (t) => !texto || t.titulo.toLowerCase().includes(texto.toLowerCase()),
          )
          if (!lista.length)
            return (
              <Vacio titulo="No hay temas que coincidan" descripcion="Prueba con otros filtros." />
            )
          return (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {lista.map((t) => (
                <li key={t.id}>
                  <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                    <CardHeader>
                      <div className="flex flex-wrap gap-2">
                        <Badge tono="info">{t.linea.nombre}</Badge>
                        <DisponibilidadTema tema={t} />
                      </div>
                      <CardTitle className="pt-1 text-base leading-snug">
                        <Link
                          to={`/estudiante/temas/${t.id}`}
                          className="hover:underline focus-visible:underline"
                        >
                          {t.titulo}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        Propuesto por {nombreCompleto(t.docenteProponente)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        {maxIntegrantes(t) > 1 ? (
                          <UsersIcon className="size-4" aria-hidden />
                        ) : (
                          <UserIcon className="size-4" aria-hidden />
                        )}
                        {TIPO_TEMA[t.tipo].label} · {textoIntegrantes(t)} integrante(s)
                      </span>
                      <span className="whitespace-nowrap">
                        {t.postulacionesAbiertas} postulación(es) abierta(s)
                      </span>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }}
      </ConsultaEstado>
    </>
  )
}
