'use client'

import { HardDrive, Globe, FolderOpen } from 'lucide-react'
import { InputField, SectionHeader, TestButton } from '../SharedComponents'
import { StorageProtocolSelector } from './StorageProtocolSelector'
import type { SettingsFormData } from '../types'
import type { TestResult } from './useStorageTests'

interface StorageConnectionFormProps {
  formData: SettingsFormData
  protocol: string
  onUpdateField: (field: keyof SettingsFormData, value: string) => void
  onTest: () => void
  loading: boolean
  result: TestResult | null
}

export function StorageConnectionForm({
  formData,
  protocol,
  onUpdateField,
  onTest,
  loading,
  result,
}: StorageConnectionFormProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader
        icon={protocol === 'ftp' ? Globe : protocol === 'local' ? FolderOpen : HardDrive}
        title={protocol === 'local' ? 'Dossier Local' : `Partage ${protocol.toUpperCase()}`}
        description="Accès aux fichiers médias"
      />

      <StorageProtocolSelector protocol={protocol} onChange={p => onUpdateField('storage_protocol', p)} />

      {protocol === 'local' ? (
        <div className="grid gap-6">
          <InputField
            label="Chemin local du dossier"
            value={formData.storage_root_path}
            onChange={v => onUpdateField('storage_root_path', v)}
            placeholder="/mnt/downloads"
            description="Chemin absolu du dossier monté dans le conteneur Docker (ex: /mnt/downloads)"
          />
          <div className="rounded-lg border border-blue-700/30 bg-blue-900/10 p-4">
            <p className="text-sm text-blue-300/80 leading-relaxed">
              <strong>Mode Local :</strong> Le dossier doit être monté dans le conteneur Docker via un volume.
              Aucune connexion réseau nécessaire - l'accès se fait directement via le système de fichiers.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <InputField
            label="Hôte"
            value={formData.storage_host}
            onChange={v => onUpdateField('storage_host', v)}
            placeholder={protocol === 'smb' ? '192.168.1.100' : 'ftp.example.com'}
          />
          <InputField
            label="Port (optionnel)"
            value={formData.storage_port}
            onChange={v => onUpdateField('storage_port', v)}
            placeholder={protocol === 'smb' ? '445' : '21'}
            description="Laissez vide pour utiliser le port par défaut"
          />
          {protocol === 'smb' && (
            <InputField
              label="Partage (Share)"
              value={formData.storage_share}
              onChange={v => onUpdateField('storage_share', v)}
              placeholder="media"
            />
          )}
          <InputField
            label="Utilisateur"
            value={formData.storage_username}
            onChange={v => onUpdateField('storage_username', v)}
          />
          <InputField
            label="Mot de passe"
            value={formData.storage_password}
            onChange={v => onUpdateField('storage_password', v)}
            type="password"
          />
          <InputField
            label={protocol === 'ftp' ? 'Dossier de départ' : 'Dossier racine (restriction)'}
            value={formData.storage_root_path}
            onChange={v => onUpdateField('storage_root_path', v)}
            placeholder={protocol === 'ftp' ? '/downloads/qbittorrent' : '/films'}
            description={
              protocol === 'ftp'
                ? "Chemin où tu arrives quand tu te connectes (ex: /downloads/qbittorrent)"
                : "L'utilisateur ne verra que ce dossier et ses sous-dossiers"
            }
          />
        </div>
      )}

      {protocol === 'ftp' && (
        <div className="mt-4 mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.storage_secure === 'true'}
              onChange={e => onUpdateField('storage_secure', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-300">Utiliser FTPS (chiffrement TLS)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            Active si ton serveur FTP requiert une connexion sécurisée
          </p>
        </div>
      )}

      <TestButton onClick={onTest} loading={loading} result={result} />
    </div>
  )
}
