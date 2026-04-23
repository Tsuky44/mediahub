import { Settings as SettingsIcon } from 'lucide-react'
import { SectionHeader } from './SharedComponents'
import { SettingsFormData } from './types'
import { SystemUpdate } from './SystemUpdate'
import { NotificationTest } from './NotificationTest'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    readOnly?: boolean
}

export const MaintenanceSettings = ({ formData, updateField, readOnly }: Props) => {
    return (
        <div className="space-y-6">
            <SystemUpdate />
            <NotificationTest />
        </div>
    )
}
