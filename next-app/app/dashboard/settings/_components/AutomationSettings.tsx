import { JellyseerrSection } from './automation-settings/JellyseerrSection'
import { ArrSection } from './automation-settings/ArrSection'
import { useAutomationSettings } from './automation-settings/useAutomationSettings'
import { SettingsFormData } from './types'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    readOnly?: boolean
}

export const AutomationSettings = ({ formData, updateField, readOnly }: Props) => {
    const {
        jellyseerrLoading,
        jellyseerrResult,
        importRequestsLoading,
        importRequestsResult,
        fixTitlesLoading,
        fixTitlesResult,
        handleTestJellyseerr,
        handleImportRequests,
        handleFixTitles,
    } = useAutomationSettings()

    return (
        <div className="space-y-6">
            <JellyseerrSection
                formData={formData}
                updateField={updateField}
                onTest={handleTestJellyseerr}
                testLoading={jellyseerrLoading}
                testResult={jellyseerrResult}
                onImport={handleImportRequests}
                importLoading={importRequestsLoading}
                importResult={importRequestsResult}
                onFix={handleFixTitles}
                fixLoading={fixTitlesLoading}
                fixResult={fixTitlesResult}
            />

            <ArrSection
                title="Radarr"
                description="Automatisation des films"
                urlField="radarr_url"
                keyField="radarr_api_key"
                formData={formData}
                updateField={updateField}
                placeholder="http://localhost:7878"
            />

            <ArrSection
                title="Sonarr"
                description="Automatisation des séries"
                urlField="sonarr_url"
                keyField="sonarr_api_key"
                formData={formData}
                updateField={updateField}
                placeholder="http://localhost:8989"
            />
        </div>
    )
}
