import {
  BarChart3,
  Container,
  Download,
  Film,
  Home,
  ListPlus,
  Search,
} from 'lucide-react'
import type { NavItem } from '../_types/navbar'

export const NAVIGATION_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Demander', href: '/dashboard/requests', icon: Search },
  { name: 'Mes demandes', href: '/dashboard/requests/list', icon: ListPlus },
  { name: 'Ma médiathèque', href: '/dashboard/media', icon: Film },
  { name: 'Statistiques', href: '/dashboard/stats', icon: BarChart3 },
  { name: 'Téléchargements', href: '/dashboard/downloads', icon: Download },
  { name: 'Docker', href: '/dashboard/docker', icon: Container },
]
