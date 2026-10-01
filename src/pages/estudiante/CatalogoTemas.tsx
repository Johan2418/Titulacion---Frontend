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
import { useDocentes, useLineas } from '@/features/catalogos/api'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { useTemas } from '@/features/temas/api'
import { nombreCompleto } from '@/lib/utils'
import { DisponibilidadTema } from './componentes'

/** RF-05 / RF-07: catálogo de temas publicados con filtros y disponibilidad. */
export default function CatalogoTemas() {
  const { periodoId } = usePeriodo()
  const [lineaId, setLineaId] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [numIntegrantes, setNum] = useState<number | ''>('')
  const [disponible, setDisponible] = useState(true)
  const [texto, setTexto] = useState('')
  const lineas = useLineas()
  const docentes = useDocentes()
  const query = useTemas({
    periodoId,
    lineaId,
    docenteId,
    numIntegrantes,
    disponible: disponible || undefined,
  })

  return (
    <>
      <PageHeader
        titulo="Temas de titulación"
        descripcion="Temas publicados en el período. Filtra y revisa su disponibilidad antes de postular."
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
        <Input
          type="number"
          min={1}
          max={10}
          placeholder="Nº integrantes"
          aria-label="Número de integrantes"
          value={numIntegrantes}
          onChange={(e) => setNum(e.target.value ? Number(e.target.value) : '')}
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
                        {t.maxIntegrantes > 1 ? (
                          <UsersIcon className="size-4" aria-hidden />
                        ) : (
                          <UserIcon className="size-4" aria-hidden />
                        )}
                        {t.minIntegrantes === t.maxIntegrantes
                          ? t.minIntegrantes
                          : `${t.minIntegrantes}–${t.maxIntegrantes}`}{' '}
                        integrante(s)
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
