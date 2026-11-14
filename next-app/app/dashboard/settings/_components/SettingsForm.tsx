'use client'

import { MediaSettings } from './MediaSettings'
import { DownloadSettings } from './DownloadSettings'
import { AutomationSettings } from './AutomationSettings'
import { StorageSettings } from './StorageSettings'
import { MaintenanceSettings } from './MaintenanceSettings'
import { SettingsFormData } from './types'
import { useSettingsForm } from './settings-form/useSettingsForm'
import { SettingsFormFooter } from './settings-form/SettingsFormFooter'

interface SettingsFormProps {
  settings: Partial<SettingsFormData>
  readOnly?: boolean
}

export default function SettingsForm({ settings, readOnly = false }: SettingsFormProps) {
  const { activeTab, formData, loading, statusMessage, updateField, handleSubmit } =
    useSettingsForm(settings)

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div>
        {activeTab === 'media' && <MediaSettings formData={formData} updateField={updateField} readOnly={readOnly} />}
        {activeTab === 'downloads' && (
          <DownloadSettings formData={formData} updateField={updateField} readOnly={readOnly} />
        )}
        {activeTab === 'automation' && (
          <AutomationSettings formData={formData} updateField={updateField} readOnly={readOnly} />
        )}
        {activeTab === 'storage' && (
          <StorageSettings formData={formData} updateField={updateField} readOnly={readOnly} />
        )}
        {activeTab === 'maintenance' && (
          <MaintenanceSettings formData={formData} updateField={updateField} readOnly={readOnly} />
        )}
      </div>

      {activeTab !== 'maintenance' && (
        <SettingsFormFooter readOnly={readOnly} loading={loading} statusMessage={statusMessage} />
      )}
    </form>
  )
}
