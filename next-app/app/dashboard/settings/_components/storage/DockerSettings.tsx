'use client'

import { Database } from 'lucide-react'
import { InputField, SectionHeader } from '../SharedComponents'
import type { SettingsFormData } from '../types'

interface DockerSettingsProps {
  formData: SettingsFormData
  onUpdateField: (field: keyof SettingsFormData, value: string) => void
}

export function DockerSettings({ formData, onUpdateField }: DockerSettingsProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <SectionHeader icon={Database} title="Docker" description="Gestion des conteneurs" />
      <InputField
        label="Hôte Docker"
        value={formData.docker_host}
        onChange={v => onUpdateField('docker_host', v)}
        placeholder="/var/run/docker.sock"
      />
    </div>
  )
}
