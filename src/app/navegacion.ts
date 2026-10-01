import {
  BarChart3Icon,
  BellIcon,
  BookOpenIcon,
  CalendarRangeIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  FilesIcon,
  GaugeIcon,
  GitMergeIcon,
  GraduationCapIcon,
  HistoryIcon,
  HomeIcon,
  LayersIcon,
  ListChecksIcon,
  type LucideIcon,
  SendIcon,
  UserCheckIcon,
  UsersIcon,
} from 'lucide-react'
import type { Rol } from '@/types/dominio'

export interface ItemNav {
  to: string
  label: string
  icono: LucideIcon
  fin?: boolean
}
export interface SeccionNav {
  titulo?: string
  items: ItemNav[]
}

export const NAVEGACION: Record<Rol, SeccionNav[]> = {
  ESTUDIANTE: [
    {
      items: [
        { to: '/estudiante', label: 'Mi seguimiento', icono: HomeIcon, fin: true },
        { to: '/estudiante/temas', label: 'Temas', icono: BookOpenIcon },
        { to: '/estudiante/grupo', label: 'Mi grupo', icono: UsersIcon },
        { to: '/estudiante/postulaciones', label: 'Mis postulaciones', icono: SendIcon },
        { to: '/estudiante/pat', label: 'PAT', icono: FileTextIcon },
      ],
    },
  ],
  DOCENTE: [
    {
      items: [
        { to: '/docente', label: 'Mis temas', icono: BookOpenIcon, fin: true },
        { to: '/docente/tutorias', label: 'Mis tutorías', icono: GraduationCapIcon },
        { to: '/docente/carga', label: 'Mi carga tutorial', icono: GaugeIcon },
      ],
    },
  ],
  ADMIN: [
    { items: [{ to: '/admin', label: 'Panel', icono: HomeIcon, fin: true }] },
    {
      titulo: 'Configuración',
      items: [
        { to: '/admin/periodos', label: 'Períodos', icono: CalendarRangeIcon },
        { to: '/admin/habilitados', label: 'Estudiantes habilitados', icono: UserCheckIcon },
        { to: '/admin/docentes', label: 'Docentes', icono: GraduationCapIcon },
        { to: '/admin/lineas', label: 'Líneas de investigación', icono: LayersIcon },
        { to: '/admin/carga', label: 'Carga tutorial', icono: GaugeIcon },
      ],
    },
    {
      titulo: 'Proceso',
      items: [
        { to: '/admin/temas', label: 'Temas', icono: BookOpenIcon },
        { to: '/admin/postulaciones', label: 'Postulaciones', icono: SendIcon },
        { to: '/admin/conflictos', label: 'Conflictos', icono: GitMergeIcon },
        { to: '/admin/asignaciones', label: 'Asignaciones y tutores', icono: ListChecksIcon },
      ],
    },
    {
      titulo: 'PAT',
      items: [
        { to: '/admin/pat/revision', label: 'Revisión de PAT', icono: ClipboardCheckIcon },
        { to: '/admin/pat/plantillas', label: 'Plantillas PAT', icono: FilesIcon },
      ],
    },
    {
      titulo: 'Seguimiento',
      items: [
        { to: '/admin/historial', label: 'Historial y auditoría', icono: HistoryIcon },
        { to: '/admin/reportes', label: 'Reportes', icono: BarChart3Icon },
      ],
    },
  ],
}

export const ITEM_NOTIFICACIONES: ItemNav = {
  to: '/notificaciones',
  label: 'Notificaciones',
  icono: BellIcon,
}
