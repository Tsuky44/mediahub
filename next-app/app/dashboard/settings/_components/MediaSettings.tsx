import { useMediaSettingsTests } from './media/useMediaSettingsTests'
import { LocalAuthSection } from './media/LocalAuthSection'
import { EmbySettings } from './media/EmbySettings'
import { PlexSettings } from './media/PlexSettings'
import { JellyfinSettings } from './media/JellyfinSettings'
import { RequestSettings } from './media/RequestSettings'
import type { SettingsFormData } from './types'

interface Props {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  readOnly?: boolean
}

export const MediaSettings = ({ formData, updateField, readOnly }: Props) => {
  const {
    embyLoading,
    embyResult,
    plexLoading,
    plexResult,
    importPlexLoading,
    importPlexResult,
    jellyfinLoading,
    jellyfinResult,
    handleTestEmby,
    handleTestPlex,
    handleImportPlex,
    handleTestJellyfin,
  } = useMediaSettingsTests(
    formData.emby_url,
    formData.emby_api_key,
    formData.plex_url,
    formData.plex_token,
    formData.jellyfin_url,
    formData.jellyfin_api_key
  )

  return (
    <div className="space-y-6">
      <RequestSettings formData={formData} updateField={updateField} readOnly={readOnly} />
      <LocalAuthSection formData={formData} updateField={updateField} readOnly={readOnly} />
      <EmbySettings
        formData={formData}
        updateField={updateField}
        loading={embyLoading}
        result={embyResult}
        onTest={handleTestEmby}
        readOnly={readOnly}
      />
      <PlexSettings
        formData={formData}
        updateField={updateField}
        testLoading={plexLoading}
        testResult={plexResult}
        importLoading={importPlexLoading}
        importResult={importPlexResult}
        onTest={handleTestPlex}
        onImport={handleImportPlex}
        readOnly={readOnly}
      />
      <JellyfinSettings
        formData={formData}
        updateField={updateField}
        loading={jellyfinLoading}
        result={jellyfinResult}
        onTest={handleTestJellyfin}
        readOnly={readOnly}
      />
    </div>
  )
}
