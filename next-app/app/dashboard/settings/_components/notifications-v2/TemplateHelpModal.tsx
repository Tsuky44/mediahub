'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, X, Copy, Check } from 'lucide-react'

const PLACEHOLDERS = [
  { key: 'title', desc: 'Titre du média', example: 'Avatar : La voie de l\'eau' },
  { key: 'year', desc: 'Année de sortie', example: '2024' },
  { key: 'mediaType', desc: 'Type (Film / Série)', example: 'Film' },
  { key: 'season', desc: 'Numéro de saison (séries seulement)', example: 'S01' },
  { key: 'seasonNumber', desc: 'Numéro de saison brut (1, 2, 3...)', example: '1' },
  { key: 'episode', desc: 'Numéro d\'épisode (séries seulement)', example: 'E03' },
  { key: 'episodeNumber', desc: 'Numéro d\'épisode brut (1, 2, 3...)', example: '3' },
  { key: 'overview', desc: 'Synopsis / résumé', example: 'Jake Sully vit avec sa famille...' },
  { key: 'genres', desc: 'Genres du média', example: 'Science-fiction, Aventure' },
  { key: 'rating', desc: 'Note / score', example: '7.8' },
  { key: 'user', desc: 'Nom du demandeur', example: 'Mathis' },
  { key: 'userEmail', desc: 'Email du demandeur', example: 'mathis@mediahub.test' },
  { key: 'userWhatsapp', desc: 'Numéro WhatsApp du demandeur', example: '33612345678' },
  { key: 'quality', desc: 'Qualité de la release', example: '2160p' },
  { key: 'size', desc: 'Taille du téléchargement', example: '18.4 GB' },
  { key: 'progress', desc: 'Progression en % (si DL en cours)', example: '65%' },
  { key: 'progressRaw', desc: 'Progression brute 0-1', example: '0.65' },
  { key: 'release', desc: 'Nom de la release', example: 'Avatar.2024.2160p.WEB-DL...' },
  { key: 'releaseName', desc: 'Alias de {release}', example: 'Avatar.2024.2160p.WEB-DL...' },
  { key: 'reason', desc: 'Raison de l\'échec (MEDIA_FAILED)', example: 'Aucune release trouvée' },
  { key: 'stage', desc: 'Étape de l\'échec (MEDIA_FAILED)', example: 'download' },
  { key: 'event', desc: 'Nom technique de l\'événement', example: 'MEDIA_DOWNLOADING' },
  { key: 'timestamp', desc: 'Date/heure ISO de l\'événement', example: '2024-06-15T14:30:00Z' },
  { key: 'correlationId', desc: 'ID interne de traçage', example: 'req-42' },
]

export default function TemplateHelpModal() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (key: string) => {
    navigator.clipboard.writeText(`{${key}}`)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        title="Voir les placeholders disponibles"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Aide placeholders
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-[#121414] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white">Placeholders disponibles</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-2 text-sm">
                <p className="text-gray-400 mb-3">
                  Insère ces balises dans ton template. Elles seront remplacées par les vraies valeurs à l&apos;envoi.
                </p>
                {PLACEHOLDERS.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center justify-between gap-3 p-2 rounded border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <code className="text-indigo-600 dark:text-indigo-400 font-semibold">{'{' + p.key + '}'}</code>
                      <span className="text-gray-500 ml-2">— {p.desc}</span>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">Ex: {p.example}</div>
                    </div>
                    <button
                      onClick={() => copy(p.key)}
                      className="shrink-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="Copier"
                    >
                      {copied === p.key ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
