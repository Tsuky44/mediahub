import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export interface NavbarConfigStatus {
  hasDownloads: boolean
  hasDocker: boolean
}

export interface NavbarImpersonation {
  role: string
}
