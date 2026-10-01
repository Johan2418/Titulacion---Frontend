import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { GraduationCapIcon, LogOutIcon, MenuIcon, MoonIcon, SunIcon, XIcon } from 'lucide-react'
import { useAuth, useUsuario } from '@/auth/AuthProvider'
import { SelectSimple } from '@/components/Campo'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import { env } from '@/lib/env'
import { ESTADO_PERIODO, ROL } from '@/lib/estados'
import { cn } from '@/lib/utils'
import { useTema } from '../tema'
import { NAVEGACION } from '../navegacion'
import { CampanaNotificaciones } from './Notificaciones'

function Sidebar({ onNavegar }: { onNavegar?: () => void }) {
  const usuario = useUsuario()
  return (
    <nav
      aria-label="Navegación principal"
      className="flex h-full flex-col gap-4 overflow-y-auto p-3"
    >
      <div className="flex items-center gap-2 px-2 py-3">
        <GraduationCapIcon className="size-7" aria-hidden />
        <div className="leading-tight">
          <p className="font-semibold">Titulación</p>
          <p className="text-xs opacity-80">Gestión del proceso</p>
        </div>
      </div>
      {NAVEGACION[usuario.rol].map((seccion, i) => (
        <div key={i} className="space-y-1">
          {seccion.titulo && (
            <p className="px-3 pt-2 text-xs font-semibold tracking-wide uppercase opacity-70">
              {seccion.titulo}
            </p>
          )}
          <ul className="space-y-0.5">
            {seccion.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.fin}
                  onClick={onNavegar}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-white/70',
                      isActive && 'bg-sidebar-accent font-semibold',
                    )
                  }
                >
                  <it.icono className="size-4 shrink-0" aria-hidden />
                  {it.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SelectorPeriodo() {
  const usuario = useUsuario()
  const { periodos, periodo, seleccionar } = usePeriodo()
  if (!periodo) return <span className="text-sm text-muted-foreground">Sin período activo</span>
  if (usuario.rol !== 'ADMIN')
    return (
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate font-medium">{periodo.nombre}</span>
        <StatusBadge
          mapa={ESTADO_PERIODO}
          valor={periodo.estado}
          className="hidden sm:inline-flex"
        />
      </div>
    )
  return (
    <div className="flex min-w-0 items-center gap-2">
      <SelectSimple
        aria-label="Período de titulación"
        className="w-44 sm:w-64"
        value={periodo.id}
        onChange={seleccionar}
        opciones={periodos.map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
      />
      <StatusBadge mapa={ESTADO_PERIODO} valor={periodo.estado} className="hidden md:inline-flex" />
    </div>
  )
}

export function AppShell() {
  const usuario = useUsuario()
  const { cerrarSesion } = useAuth()
  const { oscuro, alternar } = useTema()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuAbierto(false), [location.pathname])

  return (
    <div className="flex min-h-svh">
      <a
        href="#contenido"
        className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <aside className="hidden w-64 shrink-0 bg-sidebar text-sidebar-foreground lg:block">
        <div className="sticky top-0 h-svh">
          <Sidebar />
        </div>
      </aside>

      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar text-sidebar-foreground shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
            >
              <XIcon />
            </Button>
            <Sidebar onNavegar={() => setMenuAbierto(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <SelectorPeriodo />
          </div>
          {env.useMocks && (
            <span className="hidden rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 sm:inline">
              Datos simulados
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={alternar}
            aria-label={oscuro ? 'Usar tema claro' : 'Usar tema oscuro'}
          >
            {oscuro ? <SunIcon /> : <MoonIcon />}
          </Button>
          <CampanaNotificaciones />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" aria-label="Menú de usuario">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {usuario.nombres[0]}
                  {usuario.apellidos[0]}
                </span>
                <span className="hidden text-left text-sm leading-tight md:block">
                  <span className="block font-medium">{usuario.nombres}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ROL[usuario.rol].label}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="font-medium">
                  {usuario.nombres} {usuario.apellidos}
                </p>
                <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void cerrarSesion()}>
                <LogOutIcon /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
