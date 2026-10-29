'use client'

import { FolderInput } from 'lucide-react'
import type { ImportInfo } from '../download-status-actions'
import { useSmoothProgress } from '../_hooks/useSmoothProgress'

function SmoothBar({ progress, failed }: { progress: number; failed?: boolean }) {
  const smooth = useSmoothProgress(progress)
  return <div className={`h-full ${failed ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${smooth}%` }} />
}

/** Où en est l'import dans la bibliotheque : ce que sorraa a deja copie et ce qui reste. */
export function ImportProgressList({ imports }: { imports: ImportInfo[] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-2">
        <FolderInput className="h-4 w-4" />
        <span>Importation</span>
      </h4>
      <div className="space-y-3 bg-white/5 border border-white/5 rounded-xl p-4">
        {imports.map((item) => (
          <div key={item.releaseName} className="space-y-1.5">
            <p className="text-[10px] text-gray-500 truncate font-mono" title={item.releaseName}>
              {item.releaseName}
            </p>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 bg-gray-700/50 rounded-full overflow-hidden">
                <SmoothBar progress={item.progress} failed={item.failed} />
              </div>
              <span className="text-sm font-bold text-white shrink-0">{item.progress}%</span>
            </div>
            <p className="text-[10px] text-gray-400">
              {item.filesDone} fichier{item.filesDone > 1 ? 's' : ''} sur {item.files} copié{item.filesDone > 1 ? 's' : ''}
              {' • '}
              {item.sizeDone} sur {item.size}
              {' • '}
              reste {item.sizeLeft}
            </p>
            {item.current && !item.failed && (
              <p className="text-[10px] text-gray-500 truncate" title={item.current}>
                Copie de {item.current}
              </p>
            )}
            {item.failed && (
              <p className="text-[10px] text-red-400">
                Import échoué{item.message ? ` : ${item.message}` : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
