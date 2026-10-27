'use client'

import { ViewTransition } from 'react'

/**
 * Remonté à chaque navigation. Les navigations de Next étant des transitions React,
 * l'ancienne et la nouvelle page forment une paire « onyx-page » animée par le
 * navigateur (View Transitions, voir app/motion.css) : l'ancienne recule et
 * s'estompe, la nouvelle monte. Les rafraîchissements de données ne déclenchent
 * rien (default="none"). Sans prise en charge, la page change simplement.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition name="onyx-page" default="none" share="auto">
      <div className="onyx-page">{children}</div>
    </ViewTransition>
  )
}
