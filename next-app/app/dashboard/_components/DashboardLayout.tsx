import type { ReactNode } from 'react'

/** The same content order on desktop and mobile: overview, activity, then discovery last. */
export function DashboardLayout({ overview, calendar, requests, discover }: {
  overview: ReactNode
  calendar: ReactNode
  requests?: ReactNode
  discover?: ReactNode
}) {
  return <div className="dashboard-home mh-page">
    {overview}
    <div className={`mh-home-activity ${requests ? '' : 'mh-home-activity-wide'}`}>
      <section className="min-w-0">{calendar}</section>
      {requests && <aside className="mh-home-requests">{requests}</aside>}
    </div>
    {discover && <div className="mh-home-discover">{discover}</div>}
  </div>
}
