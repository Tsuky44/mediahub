import { fetchUserRequests } from './actions'
import { InfiniteRequestList } from './InfiniteRequestList'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { defineAbilityFor } from '@/lib/ability'
import { MediaManagerButton } from '../_components/MediaManagerButton'

export const dynamic = 'force-dynamic'

export default async function RequestsListPage() {
  const session = await getSession()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any
  const ability = defineAbilityFor(user)

  const canView = ability.can('read', 'MediaRequest')
  const canSync = ability.can('sync', 'MediaRequest')
  const canDelete = ability.can('delete', 'MediaRequest')
  const canManageStorage = ability.can('manage_storage', 'Stats') || user?.role === 'admin'
  const canDeleteMedia = ability.can('delete_media', 'Stats') || user?.role === 'admin'

  if (!canView) {
      redirect('/dashboard')
  }

  const initialData = await fetchUserRequests(1, 20)

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Mes demandes</h2>
            <p className="text-gray-400 mt-1">Suivez l'état de vos demandes de médias</p>
        </div>
        {canManageStorage && (
            <MediaManagerButton canDelete={canDeleteMedia} />
        )}
      </div>

      <InfiniteRequestList initialData={initialData} canSync={canSync} canDelete={canDelete} />
    </div>
  )
}
