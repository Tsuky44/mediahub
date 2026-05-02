'use client'

import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/providers/AbilityContext'

export function useDockerPermissions() {
    const ability = useAbility(AbilityContext)

    return {
        canView: ability.can('read', 'Docker'),
        canReadDetails: ability.can('read_details', 'Docker'),
        canReadLogs: ability.can('read_logs', 'Docker'),
        canReadStats: ability.can('read_stats', 'Docker'),
        canManageState: ability.can('manage_state', 'Docker'),
        canAccessConsole: ability.can('access_console', 'Docker'),
        canManageGroups: ability.can('manage_groups', 'Docker'),
    }
}
