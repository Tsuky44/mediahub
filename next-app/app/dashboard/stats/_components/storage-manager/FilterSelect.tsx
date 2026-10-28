'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export interface FilterSelectOption<T extends string | number> {
    value: T
    label: string
    /** Précision affichée sous le libellé dans le menu */
    hint?: string
}

interface FilterSelectProps<T extends string | number> {
    value: T
    options: FilterSelectOption<T>[]
    onChange: (value: T) => void
    ariaLabel: string
    /** Élément sur lequel aligner le menu (par défaut : le bouton) */
    anchorRef?: React.RefObject<HTMLElement | null>
    /** Contenu affiché avant la valeur dans le bouton (icône, libellé du filtre) */
    children?: React.ReactNode
}

const MENU_MIN_WIDTH = 300
const VIEWPORT_MARGIN = 8

/**
 * Liste déroulante aux couleurs de l'application (remplace le <select> natif).
 * Le menu est rendu dans <body> : il n'est ni coupé par la barre de filtres qui
 * défile horizontalement sur mobile, ni décalé par le flou de la barre collée.
 * Clavier : flèches, Début/Fin, Entrée/Espace, Échap.
 */
export function FilterSelect<T extends string | number>({
    value,
    options,
    onChange,
    ariaLabel,
    anchorRef,
    children,
}: FilterSelectProps<T>) {
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [position, setPosition] = useState({ top: 0, left: 0, width: MENU_MIN_WIDTH })
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const listId = useId()

    const selectedIndex = Math.max(0, options.findIndex(o => o.value === value))
    const selected = options[selectedIndex]

    const openMenu = () => {
        const anchor = anchorRef?.current ?? triggerRef.current
        if (!anchor) return
        const rect = anchor.getBoundingClientRect()
        const width = Math.max(rect.width, MENU_MIN_WIDTH)
        setPosition({
            top: rect.bottom + 6,
            left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN)),
            width,
        })
        setActiveIndex(selectedIndex)
        setOpen(true)
    }

    const choose = (index: number) => {
        const option = options[index]
        setOpen(false)
        triggerRef.current?.focus()
        if (option && option.value !== value) onChange(option.value)
    }

    // Fermeture : clic à l'extérieur, défilement de la page ou de la liste, redimensionnement
    useEffect(() => {
        if (!open) return
        const isInside = (target: EventTarget | null) =>
            target instanceof Node && (menuRef.current?.contains(target) || triggerRef.current?.contains(target))
        const onPointerDown = (e: PointerEvent) => {
            if (isInside(e.target)) return
            setOpen(false)
            // Comme un <select> natif : le clic qui ferme le menu n'ouvre pas aussi la
            // fiche ou la case située dessous (sauf un autre menu de filtre).
            if (e.target instanceof Element && e.target.closest('[role="combobox"]')) return
            const swallow = (ev: MouseEvent) => {
                ev.stopPropagation()
                ev.preventDefault()
            }
            document.addEventListener('click', swallow, { capture: true, once: true })
            setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 500)
        }
        const onScroll = (e: Event) => { if (!isInside(e.target)) setOpen(false) }
        const onResize = () => setOpen(false)
        document.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('scroll', onScroll, true)
        window.addEventListener('resize', onResize)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', onResize)
        }
    }, [open])

    const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault()
                openMenu()
            }
            return
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setActiveIndex(i => Math.min(options.length - 1, i + 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setActiveIndex(i => Math.max(0, i - 1))
                break
            case 'Home':
                e.preventDefault()
                setActiveIndex(0)
                break
            case 'End':
                e.preventDefault()
                setActiveIndex(options.length - 1)
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                choose(activeIndex)
                break
            case 'Escape':
                e.preventDefault()
                setOpen(false)
                break
            case 'Tab':
                setOpen(false)
                break
        }
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => (open ? setOpen(false) : openMenu())}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
                className="group inline-flex items-center gap-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 rounded-md"
            >
                {children}
                <span className="whitespace-nowrap">{selected?.label}</span>
                <ChevronDown
                    className={`w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-transform duration-200 ${open ? 'rotate-180 text-purple-300' : ''}`}
                />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    id={listId}
                    role="listbox"
                    aria-label={ariaLabel}
                    style={{ top: position.top, left: position.left, width: position.width }}
                    className="fixed z-[70] origin-top p-1.5 rounded-2xl border border-white/10 bg-gray-950/95 backdrop-blur-xl shadow-2xl shadow-black/60 ring-1 ring-purple-500/10 animate-pop-in"
                >
                    {options.map((option, index) => {
                        const isSelected = index === selectedIndex
                        const isActive = index === activeIndex
                        return (
                            <div
                                key={String(option.value)}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={isSelected}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => choose(index)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer select-none transition-colors ${
                                    isActive ? 'bg-white/[0.07]' : ''
                                } ${isSelected ? 'text-white' : 'text-gray-300'}`}
                            >
                                <span className="flex-1 min-w-0">
                                    <span className={`block text-sm ${isSelected ? 'font-semibold' : ''}`}>{option.label}</span>
                                    {option.hint && (
                                        <span className="block text-xs text-gray-500 mt-0.5">{option.hint}</span>
                                    )}
                                </span>
                                <Check className={`w-4 h-4 shrink-0 text-purple-400 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                            </div>
                        )
                    })}
                </div>,
                document.body
            )}
        </>
    )
}
