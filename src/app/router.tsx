import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Outlet } from 'react-router'
import { RedireccionInicio, RequiereSesion, RoleGuard } from '@/auth/RoleGuard'
import { CargandoPagina } from '@/components/Estados'
import { PeriodoProvider } from '@/features/periodos/PeriodoContext'
import { AppShell } from './layout/AppShell'

/** Carga diferida por pantalla para reducir el bundle inicial. */
function perezosa(cargar: () => Promise<{ default: ComponentType }>) {
  const C = lazy(cargar)
  return (
    <Suspense fallback={<CargandoPagina />}>
      <C />
    </Suspense>
  )
}

function ConPeriodo() {
  return (
    <PeriodoProvider>
      <Outlet />
    </PeriodoProvider>
  )
}

export const rutas = [
  { path: '/login', element: perezosa(() => import('@/pages/comun/Login')) },
  { path: '/auth/callback', element: perezosa(() => import('@/pages/comun/AuthCallback')) },
  {
    element: <RequiereSesion />,
    children: [
      {
        element: <ConPeriodo />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <RedireccionInicio /> },
              {
                path: 'notificaciones',
                element: perezosa(() => import('@/pages/comun/Notificaciones')),
              },
              { path: 'sin-permiso', element: perezosa(() => import('@/pages/comun/SinPermiso')) },
              {
                path: 'estudiante',
                element: <RoleGuard roles={['ESTUDIANTE']} />,
                children: [
                  {
                    index: true,
                    element: perezosa(() => import('@/pages/estudiante/Seguimiento')),
                  },
                  {
                    path: 'temas',
                    element: perezosa(() => import('@/pages/estudiante/CatalogoTemas')),
                  },
                  {
                    path: 'temas/:id',
                    element: perezosa(() => import('@/pages/estudiante/DetalleTema')),
                  },
                  {
                    path: 'temas/:id/postular',
                    element: perezosa(() => import('@/pages/estudiante/Postular')),
                  },
                  { path: 'grupo', element: perezosa(() => import('@/pages/estudiante/MiGrupo')) },
                  {
                    path: 'postulaciones',
                    element: perezosa(() => import('@/pages/estudiante/MisPostulaciones')),
                  },
                  { path: 'pat', element: perezosa(() => import('@/pages/estudiante/Pat')) },
                ],
              },
              {
                path: 'docente',
                element: <RoleGuard roles={['DOCENTE']} />,
                children: [
                  { index: true, element: perezosa(() => import('@/pages/docente/MisTemas')) },
                  {
                    path: 'tutorias',
                    element: perezosa(() => import('@/pages/docente/MisTutorias')),
                  },
                  { path: 'carga', element: perezosa(() => import('@/pages/docente/MiCarga')) },
                ],
              },
              {
                path: 'admin',
                element: <RoleGuard roles={['ADMIN']} />,
                children: [
                  { index: true, element: perezosa(() => import('@/pages/admin/Panel')) },
                  { path: 'periodos', element: perezosa(() => import('@/pages/admin/Periodos')) },
                  {
                    path: 'habilitados',
                    element: perezosa(() => import('@/pages/admin/Habilitados')),
                  },
                  { path: 'docentes', element: perezosa(() => import('@/pages/admin/Docentes')) },
                  { path: 'lineas', element: perezosa(() => import('@/pages/admin/Lineas')) },
                  { path: 'carga', element: perezosa(() => import('@/pages/admin/CargaTutorial')) },
                  { path: 'temas', element: perezosa(() => import('@/pages/admin/Temas')) },
                  {
                    path: 'temas/:id',
                    element: perezosa(() => import('@/pages/admin/DetalleTema')),
                  },
                  {
                    path: 'postulaciones',
                    element: perezosa(() => import('@/pages/admin/Postulaciones')),
                  },
                  {
                    path: 'conflictos',
                    element: perezosa(() => import('@/pages/admin/Conflictos')),
                  },
                  {
                    path: 'asignaciones',
                    element: perezosa(() => import('@/pages/admin/Asignaciones')),
                  },
                  {
                    path: 'asignaciones/:id',
                    element: perezosa(() => import('@/pages/admin/DetalleAsignacion')),
                  },
                  {
                    path: 'pat/revision',
                    element: perezosa(() => import('@/pages/admin/RevisionPat')),
                  },
                  {
                    path: 'pat/plantillas',
                    element: perezosa(() => import('@/pages/admin/PlantillasPat')),
                  },
                  { path: 'historial', element: perezosa(() => import('@/pages/admin/Historial')) },
                  { path: 'reportes', element: perezosa(() => import('@/pages/admin/Reportes')) },
                ],
              },
              { path: '*', element: perezosa(() => import('@/pages/comun/NoEncontrado')) },
            ],
          },
        ],
      },
    ],
  },
]

export const crearRouter = () => createBrowserRouter(rutas)
