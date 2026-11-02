import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

/** The page title, its context, and its primary actions always share one layout. */
export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return <header className={cn('mh-page-header', className)}>
    <div className="mh-page-heading">
      <div className="min-w-0">
        <h1 className="mh-page-title">{title}</h1>
        {description && <div className="mh-page-description">{description}</div>}
      </div>
      {actions && <div className="mh-page-actions">{actions}</div>}
    </div>
    {children && <div className="mh-page-tools">{children}</div>}
  </header>
}

export function SectionHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="mh-section-heading">
    <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
}

export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return <div className="mh-empty-state">
    {icon && <div className="mh-empty-icon" aria-hidden="true">{icon}</div>}
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
}
