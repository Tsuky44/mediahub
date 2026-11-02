'use client'

import type { MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useStoredNavigationOrigin } from '@/components/global/navbar/_hooks/useNavigationOrigin'

export default function MediaBackLink() {
  const router = useRouter()
  const origin = useStoredNavigationOrigin()

  // Going back through history restores the previous page as it was (tab, filters, scroll).
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!origin || window.history.length <= 1) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    router.back()
  }

  return (
    <Link href={origin ?? '/dashboard/media'} onClick={handleClick} className="mh-detail-back">
      <ArrowLeft className="w-4 h-4" />
      Retour
    </Link>
  )
}
