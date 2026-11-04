'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import FullCreditsButton from '../../FullCreditsButton'
import type { NormalizedCredits } from '../../_types/media-page'

export interface FanActor {
  id: number
  name: string
  character: string
  profile_path: string | null
  /** Séries : nombre d'épisodes où l'acteur joue */
  episodes?: number
}

interface MediaCastFanProps {
  actors: FanActor[]
  credits: NormalizedCredits
}

/** Conteneur plus étroit : 4 cartes (globals.css, @container de .onyx-fan-wrap) */
const NARROW = 600
const NARROW_COUNT = 4

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

function Face({ actor, size }: { actor: FanActor; size: 'card' | 'avatar' }) {
  if (actor.profile_path) {
    return (
      <img
        loading="lazy"
        decoding="async"
        src={`https://image.tmdb.org/t/p/w300${actor.profile_path}`}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden
      className={`absolute inset-0 grid place-items-center bg-gradient-to-b from-[#2a2c2c] to-[#161717] font-bold text-white/30 ${
        size === 'card' ? 'pb-[34%] text-2xl' : 'text-sm'
      }`}
    >
      {initials(actor.name)}
    </span>
  )
}

/**
 * Distribution en éventail : cartes placées en CSS selon la largeur (globals.css, onyx-fan-*).
 * La carte choisie se redresse et écarte ses voisines pour se montrer en entier ; un second clic
 * ouvre la fiche de l'acteur. La dernière carte ouvre tout le casting.
 */
export default function MediaCastFan({ actors, credits }: MediaCastFanProps) {
  const router = useRouter()
  const wrap = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(0)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < NARROW))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const total = credits.cast.length
  const narrowCount = Math.min(NARROW_COUNT, actors.length)
  const visible = narrow ? narrowCount : actors.length
  const current = Math.min(on, visible - 1)
  const plusWide = total > actors.length
  const plusNarrow = total > narrowCount
  const selected = actors[current]

  const move = (step: number) => setOn((current + step + visible) % visible)

  const deck = {
    '--n-wide': actors.length + (plusWide ? 1 : 0),
    '--n-narrow': narrowCount + (plusNarrow ? 1 : 0),
  } as CSSProperties

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Distribution</h2>
        <div className="flex items-center gap-2">
          {visible > 1 && (
            <>
              <button type="button" onClick={() => move(-1)} aria-label="Acteur précédent" className="onyx-fan-arrow">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Acteur suivant" className="onyx-fan-arrow">
                <ChevronRight className="size-4" />
              </button>
            </>
          )}
          <FullCreditsButton cast={credits.cast} crew={credits.crew}>
            <button
              type="button"
              className="ml-2 inline-flex items-center gap-1 whitespace-nowrap text-sm text-gray-400 transition-colors hover:text-white"
            >
              <span className="hidden sm:inline">Tout le casting</span>
              <span className="sm:hidden">Tous</span> ({total})
              <ChevronRight className="size-3.5" />
            </button>
          </FullCreditsButton>
        </div>
      </div>

      <div ref={wrap} className="onyx-fan-wrap">
        <div className="onyx-fan" style={deck}>
          {actors.map((actor, i) => {
            const [first, ...rest] = actor.name.split(' ')
            const isOn = i === current
            return (
              <button
                key={actor.id}
                type="button"
                data-on={isOn || undefined}
                aria-pressed={isOn}
                aria-label={`${actor.name}${actor.character ? `, ${actor.character}` : ''}`}
                onClick={() => (isOn ? router.push(`/dashboard/person/${actor.id}`) : setOn(i))}
                className={`onyx-fan-card ${i >= NARROW_COUNT ? 'onyx-fan-extra' : ''}`}
                style={{ '--i': i, '--after': i > current ? 1 : 0, zIndex: isOn ? 40 : i + 1 } as CSSProperties}
              >
                <Face actor={actor} size="card" />
                <span className="onyx-fan-name">
                  <b>{first}</b>
                  {rest.length > 0 && <span>{rest.join(' ')}</span>}
                </span>
              </button>
            )
          })}
          {(plusWide || plusNarrow) && (
            <FullCreditsButton cast={credits.cast} crew={credits.crew}>
              <button
                type="button"
                className="onyx-fan-card onyx-fan-plus"
                data-wide={plusWide || undefined}
                data-narrow={plusNarrow || undefined}
                aria-label={`Tout le casting (${total})`}
                style={{ '--after': 1, zIndex: 30 } as CSSProperties}
              >
                <span>
                  <b>
                    <span className="onyx-fan-more-wide">+{total - actors.length}</span>
                    <span className="onyx-fan-more-narrow">+{total - narrowCount}</span>
                  </b>
                  <small>Tout le casting</small>
                </span>
              </button>
            </FullCreditsButton>
          )}
        </div>
      </div>

      {selected && (
        <div className="mt-4 flex items-center justify-center gap-3.5">
          <Link
            href={`/dashboard/person/${selected.id}`}
            aria-hidden
            tabIndex={-1}
            className="relative size-11 shrink-0 overflow-hidden rounded-full bg-[#1f2121] ring-2 ring-[#f2f0ed]/85"
          >
            <Face actor={selected} size="avatar" />
          </Link>
          <div className="min-w-0">
            <Link
              href={`/dashboard/person/${selected.id}`}
              className="block truncate text-xl font-semibold tracking-tight text-white transition-colors hover:text-gray-300"
            >
              {selected.name}
            </Link>
            <p className="truncate text-sm text-gray-300">
              {selected.character}
              {selected.episodes ? (
                <span className="text-gray-500">
                  {selected.character ? ' · ' : ''}
                  {selected.episodes} épisode{selected.episodes > 1 ? 's' : ''}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
