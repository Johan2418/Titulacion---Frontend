import { useState } from 'react'
import { LockIcon, LogOutIcon, MailIcon, SendIcon, UsersIcon } from 'lucide-react'
import { useUsuario } from '@/auth/AuthProvider'
import { Campo, SelectSimple } from '@/components/Campo'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ConsultaEstado, Vacio } from '@/components/Estados'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useHabilitados } from '@/features/catalogos/api'
import {
  useCrearGrupo,
  useInvitacionesGrupo,
  useInvitar,
  useMiGrupo,
  useMisInvitaciones,
  useResponderInvitacion,
  useSalirGrupo,
} from '@/features/grupos/api'
import { esRepresentante } from '@/features/postulaciones/reglas'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { formatFechaHora } from '@/lib/fechas'
import { ESTADO_GRUPO, ESTADO_INTEGRANTE, ESTADO_INVITACION, ROL_EN_GRUPO } from '@/lib/estados'
import { nombreCompleto } from '@/lib/utils'
import type { Grupo } from '@/types/dominio'

function InvitacionesRecibidas() {
  const query = useMisInvitaciones()
  const responder = useResponderInvitacion()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailIcon className="size-4" aria-hidden /> Invitaciones recibidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ConsultaEstado query={query}>
          {(invs) =>
            invs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No has recibido invitaciones.</p>
            ) : (
              <ul className="divide-y">
                {invs.map((i) => (
                  <li key={i.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 text-sm">
                      <p>
                        <strong>{nombreCompleto(i.emisor)}</strong> te invitó a{' '}
                        <strong>{i.grupo.nombre}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enviada {formatFechaHora(i.fechaEnvio)}
                        {i.estado === 'PENDIENTE' &&
                          i.expiraEn &&
                          ` · expira ${formatFechaHora(i.expiraEn)}`}
                      </p>
                    </div>
                    {i.estado === 'PENDIENTE' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => responder.mutate({ id: i.id, accion: 'aceptar' })}
                          disabled={responder.isPending}
                        >
                          Aceptar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => responder.mutate({ id: i.id, accion: 'rechazar' })}
                          disabled={responder.isPending}
                        >
                          Rechazar
                        </Button>
                      </div>
                    ) : (
                      <StatusBadge mapa={ESTADO_INVITACION} valor={i.estado} />
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </ConsultaEstado>
      </CardContent>
    </Card>
  )
}

function CrearGrupo({ periodoId }: { periodoId: string }) {
  const [nombre, setNombre] = useState('')
  const crear = useCrearGrupo()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conformar un grupo</CardTitle>
        <CardDescription>
          Pertenecer a un grupo es opcional: solo se requiere para postular de forma grupal. Al
          crearlo quedarás como representante y podrás invitar a otros estudiantes habilitados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            crear.mutate({ periodoId, nombre })
          }}
        >
          <Campo etiqueta="Nombre del grupo" className="flex-1 space-y-1.5">
            {(p) => (
              <Input
                {...p}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={120}
                placeholder="Ej.: Equipo Innovación"
              />
            )}
          </Campo>
          <Button type="submit" disabled={crear.isPending}>
            <UsersIcon /> Crear grupo
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Invitar({ grupo }: { grupo: Grupo }) {
  const { periodoId } = usePeriodo()
  const [destino, setDestino] = useState('')
  const candidatos = useHabilitados(periodoId, { sinGrupo: true })
  const invitar = useInvitar()
  const enviadas = useInvitacionesGrupo(grupo.id)
  const responder = useResponderInvitacion()
  const pendientes = new Set(
    (enviadas.data ?? []).filter((i) => i.estado === 'PENDIENTE').map((i) => i.destino.id),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitaciones</CardTitle>
        <CardDescription>
          Invita a estudiantes habilitados del mismo período que no pertenezcan a otro grupo
          (RN-06).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!grupo.composicionCerrada && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <SelectSimple
              aria-label="Estudiante a invitar"
              className="sm:w-96"
              value={destino}
              onChange={setDestino}
              placeholder={candidatos.isPending ? 'Cargando…' : 'Seleccione un estudiante…'}
              opciones={(candidatos.data ?? []).map((h) => ({
                value: h.estudiante.id,
                label: `${nombreCompleto(h.estudiante)} · ${h.estudiante.matricula}`,
                disabled: pendientes.has(h.estudiante.id),
              }))}
            />
            <Button
              disabled={!destino || invitar.isPending}
              onClick={() =>
                invitar.mutate(
                  { grupoId: grupo.id, estudianteId: destino },
                  { onSuccess: () => setDestino('') },
                )
              }
            >
              <SendIcon /> Invitar
            </Button>
          </div>
        )}
        <ConsultaEstado query={enviadas}>
          {(invs) =>
            invs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no has enviado invitaciones.</p>
            ) : (
              <Table aria-label="Invitaciones enviadas">
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Enviada</TableHead>
                    <TableHead className="sr-only">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invs.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{nombreCompleto(i.destino)}</TableCell>
                      <TableCell>
                        <StatusBadge mapa={ESTADO_INVITACION} valor={i.estado} />
                      </TableCell>
                      <TableCell>{formatFechaHora(i.fechaEnvio)}</TableCell>
                      <TableCell className="text-right">
                        {i.estado === 'PENDIENTE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => responder.mutate({ id: i.id, accion: 'cancelar' })}
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          }
        </ConsultaEstado>
      </CardContent>
    </Card>
  )
}

function DetalleGrupo({ grupo }: { grupo: Grupo }) {
  const usuario = useUsuario()
  const salir = useSalirGrupo()
  const rep = esRepresentante(grupo, usuario.estudianteId ?? '')
  const activos = grupo.integrantes.filter((i) => i.estado === 'ACTIVO')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              {grupo.nombre} <StatusBadge mapa={ESTADO_GRUPO} valor={grupo.estado} />
            </CardTitle>
            <CardDescription>{activos.length} integrante(s) activo(s)</CardDescription>
          </div>
          {!grupo.composicionCerrada && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <LogOutIcon /> {rep ? 'Disolver grupo' : 'Salir del grupo'}
                </Button>
              }
              titulo={rep ? '¿Disolver el grupo?' : '¿Salir del grupo?'}
              descripcion={
                rep
                  ? 'Todos los integrantes quedarán sin grupo y las invitaciones pendientes se cancelarán. El historial se conserva.'
                  : 'Dejarás de pertenecer a este grupo.'
              }
              destructivo
              confirmar={rep ? 'Disolver' : 'Salir'}
              onConfirm={() => salir.mutateAsync(grupo.id)}
            />
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {grupo.composicionCerrada && (
            <Alert variant="info">
              <LockIcon />
              <AlertTitle>Composición cerrada</AlertTitle>
              <AlertDescription>
                El grupo ya postuló; no se pueden agregar ni retirar integrantes (RF-03).
              </AlertDescription>
            </Alert>
          )}
          {activos.length < 2 && (
            <Alert variant="warning">
              <AlertDescription>
                Un grupo necesita al menos 2 integrantes para postular (RN-05).
              </AlertDescription>
            </Alert>
          )}
          <Table aria-label="Integrantes del grupo">
            <TableHeader>
              <TableRow>
                <TableHead>Integrante</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupo.integrantes.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <span className="font-medium">{nombreCompleto(i.estudiante)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {i.estudiante.email}
                    </span>
                  </TableCell>
                  <TableCell>{i.estudiante.matricula}</TableCell>
                  <TableCell>
                    <StatusBadge mapa={ROL_EN_GRUPO} valor={i.rolEnGrupo} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge mapa={ESTADO_INTEGRANTE} valor={i.estado} />
                    {i.motivoSalida && (
                      <span className="block text-xs text-muted-foreground">{i.motivoSalida}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {rep && <Invitar grupo={grupo} />}
    </div>
  )
}

/** RF-01 a RF-03 */
export default function MiGrupo() {
  const { periodoId } = usePeriodo()
  const query = useMiGrupo(periodoId)
  return (
    <>
      <PageHeader
        titulo="Mi grupo"
        descripcion="Conforma un grupo, invita compañeros y gestiona tus invitaciones."
      />
      <div className="space-y-4">
        {!periodoId ? (
          <Vacio titulo="No hay un período activo" />
        ) : (
          <ConsultaEstado query={query}>
            {(g) => (g ? <DetalleGrupo grupo={g} /> : <CrearGrupo periodoId={periodoId} />)}
          </ConsultaEstado>
        )}
        <InvitacionesRecibidas />
      </div>
    </>
  )
}
