import { ArrSection } from './automation-settings/ArrSection'
import { SettingsFormData } from './types'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    readOnly?: boolean
}

export const AutomationSettings = ({ formData, updateField, readOnly }: Props) => {
    return (
        <div className="space-y-6">
            <ArrSection
                title="Radarr"
                description="Automatisation des films"
                urlField="radarr_url"
                keyField="radarr_api_key"
                formData={formData}
                updateField={updateField}
                placeholder="http://localhost:7878"
                readOnly={readOnly}
            />

            <ArrSection
                title="Sonarr"
                description="Automatisation des séries"
                urlField="sonarr_url"
                keyField="sonarr_api_key"
                formData={formData}
                updateField={updateField}
                placeholder="http://localhost:8989"
                readOnly={readOnly}
            />
        </div>
    )
}
