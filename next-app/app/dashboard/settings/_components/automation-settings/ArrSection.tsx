import { Bot } from 'lucide-react'
import { InputField, SectionHeader } from '../SharedComponents'
import type { SettingsFormData } from '../types'

interface ArrSectionProps {
  title: string
  description: string
  urlField: keyof SettingsFormData
  keyField: keyof SettingsFormData
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string) => void
  readOnly?: boolean
  placeholder?: string
}

export function ArrSection({
  title,
  description,
  urlField,
  keyField,
  formData,
  updateField,
  placeholder,
}: ArrSectionProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader icon={Bot} title={title} description={description} />
      <div className="grid gap-6 md:grid-cols-2">
        <InputField
          label="URL"
          value={formData[urlField] as string}
          onChange={v => updateField(urlField, v)}
          placeholder={placeholder}
        />
        <InputField
          label="Clé API"
          value={formData[keyField] as string}
          onChange={v => updateField(keyField, v)}
          type="password"
        />
      </div>
    </div>
  )
}
