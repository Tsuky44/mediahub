'use client'

import { Save } from 'lucide-react'
import { useSystemMessages } from './system-messages/useSystemMessages'
import { SystemMessageHeader } from './system-messages/SystemMessageHeader'
import { SaveStatusAlert } from './system-messages/SaveStatusAlert'
import { WelcomeToggle } from './system-messages/WelcomeToggle'
import { PopupMessageSection } from './system-messages/PopupMessageSection'
import { BannerMessageSection } from './system-messages/BannerMessageSection'

export default function SystemMessageManagement() {
  const {
    content, setContent,
    enabled, setEnabled,
    welcomeEnabled, setWelcomeEnabled,
    bannerContent, setBannerContent,
    bannerEnabled, setBannerEnabled,
    bannerSpeed, setBannerSpeed,
    version,
    loading,
    saving,
    status,
    handleSave,
  } = useSystemMessages()

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-black/20 border border-white/10 rounded-xl p-4 sm:p-6">
        <SystemMessageHeader />

        <div className="space-y-8">
          <SaveStatusAlert status={status} />

          <WelcomeToggle enabled={welcomeEnabled} onChange={setWelcomeEnabled} />

          <hr className="border-white/10" />

          {/* Côte à côte sur très grand écran, pour occuper la largeur */}
          <div className="grid items-start gap-8 2xl:grid-cols-2 [&>*]:min-w-0">
          <PopupMessageSection
            enabled={enabled}
            onToggle={() => setEnabled(!enabled)}
            content={content}
            onContentChange={setContent}
            version={version}
          />

          <BannerMessageSection
            enabled={bannerEnabled}
            onToggle={() => setBannerEnabled(!bannerEnabled)}
            content={bannerContent}
            onContentChange={setBannerContent}
            speed={bannerSpeed}
            onSpeedChange={setBannerSpeed}
          />
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex min-h-11 items-center justify-center gap-2 px-6 py-2.5 max-sm:w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                saving ? 'animate-pulse' : ''
              }`}
            >
              <Save size={18} />
              {saving ? 'Sauvegarde...' : 'Sauvegarder et Publier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
