import { SettingsFormData } from './types'
import { useStorageTests } from './storage/useStorageTests'
import { StorageConnectionForm } from './storage/StorageConnectionForm'
import { LegacySmbMigration } from './storage/LegacySmbMigration'
import { UnraidSettings } from './storage/UnraidSettings'

interface Props {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string) => void
  readOnly?: boolean
}

export const StorageSettings = ({ formData, updateField }: Props) => {
  const protocol = formData.storage_protocol || 'smb'
  const {
    storageLoading,
    storageResult,
    unraidLoading,
    unraidResult,
    handleTestStorage,
    handleTestUnraid,
  } = useStorageTests(formData)

  const migrateFromLegacy = () => {
    if (formData.smb_host && !formData.storage_host) {
      updateField('storage_protocol', 'smb')
      updateField('storage_host', formData.smb_host)
      updateField('storage_username', formData.smb_username)
      updateField('storage_password', formData.smb_password)
      updateField('storage_share', formData.smb_share)
    }
  }

  if (formData.smb_host && !formData.storage_host) {
    migrateFromLegacy()
  }

  return (
    <div className="space-y-6">
      <StorageConnectionForm
        formData={formData}
        protocol={protocol}
        onUpdateField={updateField}
        onTest={handleTestStorage}
        loading={storageLoading}
        result={storageResult}
      />

      <LegacySmbMigration
        hasLegacy={!!(formData.smb_host && !formData.storage_host)}
        onMigrate={migrateFromLegacy}
      />

      <UnraidSettings
        formData={formData}
        onUpdateField={updateField}
        onTest={handleTestUnraid}
        loading={unraidLoading}
        result={unraidResult}
      />
    </div>
  )
}
