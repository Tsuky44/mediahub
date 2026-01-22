import { Settings as SettingsIcon } from 'lucide-react'
import { SectionHeader } from './SharedComponents'
import { SettingsFormData } from './types'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
}

export const MaintenanceSettings = ({ formData, updateField }: Props) => {
    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={SettingsIcon} 
                    title="Configuration Système" 
                    description="Paramètres globaux de l'instance" 
                />
                
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-300">Type d'instance</label>
                    <div className="grid grid-cols-3 gap-4">
                        {['emby', 'plex', 'jellyfin'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => updateField('type', type)}
                                className={`flex items-center justify-center rounded-lg border p-4 text-sm font-medium capitalize transition-colors ${
                                    formData.type === type
                                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
