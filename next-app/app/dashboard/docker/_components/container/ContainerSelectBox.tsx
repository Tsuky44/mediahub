'use client'

import clsx from 'clsx'
import { Check } from 'lucide-react'

interface ContainerSelectBoxProps {
    checked: boolean
    onToggle: () => void
    label: string
}

/**
 * Case de sélection d'un conteneur.
 *
 * Discrète tant que rien n'est sélectionné (elle apparaît au survol), mais
 * toujours visible dès que la case est cochée — sinon on perd de vue ce qui
 * fait partie de la sélection en déplaçant la souris.
 */
export function ContainerSelectBox({ checked, onToggle, label }: ContainerSelectBoxProps) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={`Sélectionner ${label}`}
            onClick={e => {
                e.stopPropagation()
                onToggle()
            }}
            className={clsx(
                'w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all',
                checked
                    ? 'bg-indigo-500 border-indigo-400 text-white opacity-100'
                    : 'border-white/20 text-transparent hover:border-indigo-400/60 opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
        >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
    )
}
