import type { ReactNode } from 'react'
import MediaBackdrop from './MediaBackdrop'
import MediaBackLink from './MediaBackLink'

export default function MediaHero({ title, posterUrl, backdropUrl, children }: {
  title: string
  posterUrl: string
  backdropUrl: string | null
  children: ReactNode
}) {
  return <section className="mh-detail-hero">
    <MediaBackdrop backdropUrl={backdropUrl} alt={title} />
    <MediaBackLink />
    <div className="mh-detail-hero-content">
      <img src={posterUrl} alt={`Affiche de ${title}`} className="mh-detail-poster" />
      <div className="min-w-0 space-y-5">{children}</div>
    </div>
  </section>
}
