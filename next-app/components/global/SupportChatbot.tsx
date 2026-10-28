'use client'

import { useRef, useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSupportChat } from '@/hooks/useSupportChat'
import { isPhoneScreen } from '@/lib/screen'
import { MessageCircle, X, Send, Bot, User, Loader2, ImagePlus, X as XIcon } from 'lucide-react'

const DROP_MS = 850
const DROP_FRAMES = 72

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

/** Ressort amorti : de 0 à 1, vitesse nulle au départ, léger dépassement puis repos */
function spring(t: number) {
  if (t <= 0) return 0
  const w = 10
  const z = 0.7
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}

/**
 * Traversée de la bulle en goutte (téléphone). La bulle se détache de son bord en y laissant
 * un reste qui se résorbe, file suivie de deux gouttelettes, dépasse un peu son bord d'arrivée,
 * puis les gouttelettes la rejoignent et elle tremble avant de se poser. Le filtre #onyx-goo
 * fusionne ces formes comme un liquide. Positions et déformations sont calculées image par
 * image (interpolation linéaire) : le mouvement ne marque aucun arrêt en route.
 */
function dropAnimations(blobs: HTMLElement[], from: number, to: number, size: number, bottom: number) {
  const [rest, tail2, tail1, main] = blobs
  const icon = main.firstElementChild
  const dir = Math.sign(to - from)
  const T = DROP_MS / 1000
  // Atterrissage exact : le reste d'oscillation s'éteint sur le dernier quart
  const land = (t: number) => 1 - smooth((t - 0.75 * T) / (0.25 * T))
  const travel = (t: number, lag: number) => 1 - (1 - spring(t - 0.06 - lag)) * land(t)
  // Prise d'élan : la goutte recule et se tasse avant de partir
  const windup = (t: number) => (t < 0.2 ? Math.sin((Math.PI * t) / 0.2) ** 2 : 0)
  const times = Array.from({ length: DROP_FRAMES }, (_, i) => (i / (DROP_FRAMES - 1)) * T)
  const h = 0.004
  const speed = times.map((t) => (travel(t + h, 0) - travel(t - h, 0)) / (2 * h))
  const vmax = Math.max(...speed.map(Math.abs))
  const arrival = times.find((t) => travel(t, 0) >= 1) ?? T

  const tails: [HTMLElement, number, number][] = [[tail1, 0.6, 0.035], [tail2, 0.42, 0.07]]
  const place = (el: HTMLElement, k: number) => {
    el.style.width = el.style.height = `${size * k}px`
    el.style.bottom = `${bottom + (size * (1 - k)) / 2}px`
  }
  place(rest, 1)
  place(main, 1)
  for (const [el, k] of tails) place(el, k)

  const mainFrames: Keyframe[] = []
  const iconFrames: Keyframe[] = []
  const restFrames: Keyframe[] = []
  const tailFrames: Keyframe[][] = tails.map(() => [])
  times.forEach((t, i) => {
    const v = speed[i] / vmax
    const after = t - arrival
    const wobble = after > 0 ? -0.14 * Math.exp(-7 * after) * Math.sin((2 * Math.PI * after) / 0.24) : 0
    const sx = 1 + (0.2 * Math.abs(v) - 0.1 * windup(t) + wobble) * land(t)
    const sy = 1 / sx
    const center = from + (to - from) * travel(t, 0) - dir * 6 * windup(t)
    mainFrames.push({ transform: `translateX(${center - size / 2}px) scale(${sx}, ${sy})` })
    iconFrames.push({ transform: `translateX(${-dir * 4 * v}px) scale(${1 / sx}, ${1 / sy})` })
    const shrink = t < 0.34 ? 0.5 + 0.5 * Math.cos((Math.PI * t) / 0.34) : 0
    restFrames.push({ transform: `translateX(${from + dir * 10 * smooth(t / 0.3) - size / 2}px) scale(${shrink})` })
    tails.forEach(([, k, lag], j) => {
      tailFrames[j].push({ transform: `translateX(${from + (to - from) * travel(t, lag) - (size * k) / 2}px)` })
    })
  })
  const timing = { duration: DROP_MS, easing: 'linear' }
  return [
    main.animate(mainFrames, timing),
    rest.animate(restFrames, timing),
    ...tails.map(([el], j) => el.animate(tailFrames[j], timing)),
    ...(icon ? [icon.animate(iconFrames, timing)] : []),
  ]
}

export default function SupportChatbot() {
  // Écran large : à gauche. Téléphone : à droite, sauf sur Demander où le bouton des filtres occupe la droite
  const pathname = usePathname()
  const phoneLeft = pathname === '/dashboard/requests'
  const side = phoneLeft ? 'left-6' : 'right-6 md:right-auto md:left-6'
  const {
    isOpen,
    messages,
    isLoading,
    isUploading,
    step,
    attachments,
    open,
    close,
    reset,
    selectCategory,
    selectSubcategory,
    sendMessage,
    uploadFile,
    removeAttachment,
  } = useSupportChat()

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const gooRef = useRef<HTMLDivElement>(null)
  const lastPhoneLeft = useRef(phoneLeft)
  const stopDrop = useRef<(() => void) | null>(null)

  // Changement de bord sur téléphone : la bulle traverse l'écran en goutte
  useLayoutEffect(() => {
    if (lastPhoneLeft.current === phoneLeft) return
    lastPhoneLeft.current = phoneLeft
    stopDrop.current?.()
    const button = buttonRef.current
    const goo = gooRef.current
    if (!button || !goo || !isPhoneScreen() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const box = button.getBoundingClientRect()
    // left-6 et right-6 sont symétriques : l'ancienne place est le reflet de la nouvelle
    const oldLeft = document.documentElement.clientWidth - box.right
    if (Math.abs(box.left - oldLeft) < 1) return
    const anims = dropAnimations(
      Array.from(goo.children) as HTMLElement[],
      oldLeft + box.width / 2,
      box.left + box.width / 2,
      box.width,
      parseFloat(getComputedStyle(button).bottom)
    )
    // La vraie bulle attend à l'arrivée pendant que sa goutte traverse
    goo.dataset.on = ''
    button.style.visibility = 'hidden'
    let live = true
    const stop = () => {
      if (!live) return
      live = false
      stopDrop.current = null
      anims.forEach((a) => a.cancel())
      delete goo.dataset.on
      button.style.visibility = ''
    }
    stopDrop.current = stop
    anims[0].onfinish = stop
  }, [phoneLeft])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (isOpen && step === 'message' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, step])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputRef.current?.value.trim() || ''
    if (!text && attachments.length === 0) return
    if (inputRef.current) inputRef.current.value = ''
    sendMessage(text)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) await uploadFile(file)
      }
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onClick={open}
          className={`onyx-breathe fixed bottom-6 ${side} z-50 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-4 shadow-lg shadow-indigo-500/20 transition-[scale,rotate] duration-300 ease-spring hover:scale-110 hover:-rotate-6`}
          aria-label="Ouvrir le support"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Goutte de la traversée (téléphone) : reste, gouttelettes, goutte principale */}
      <div ref={gooRef} aria-hidden className="onyx-goo">
        <span className="bg-indigo-500" />
        <span className="bg-indigo-500" />
        <span className="bg-indigo-500" />
        <span className="bg-indigo-500 text-white">
          <MessageCircle size={24} />
        </span>
      </div>
      <svg aria-hidden className="pointer-events-none fixed h-0 w-0">
        <filter id="onyx-goo" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>

      {/* Chat Panel */}
      {isOpen && (
        <div className={`fixed bottom-6 ${side} z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-500/10 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-indigo-400" />
              <span className="text-white font-semibold text-sm">Support</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                className="text-white/40 hover:text-white p-1.5 rounded-md transition-colors text-xs"
                title="Recommencer"
              >
                Nouveau
              </button>
              <button
                onClick={close}
                className="text-white/40 hover:text-white p-1.5 rounded-md transition-colors"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-white/10 text-white'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-none'
                      : 'bg-white/5 text-white/90 rounded-bl-none'
                  }`}
                >
                  <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />

                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (opt.type === 'category') selectCategory(opt.value)
                            else if (opt.type === 'subcategory') selectSubcategory(opt.value)
                            else if (opt.type === 'action' && opt.value === 'restart') reset()
                          }}
                          className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'bot' && (
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Bot size={14} />
                </div>
                <div className="bg-white/5 rounded-xl rounded-bl-none px-3 py-2 flex items-center gap-2">
                  <Loader2 size={14} className="text-white/40 animate-spin" />
                  <span className="text-xs text-white/40">Écriture...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          {step === 'message' && (
            <div className="border-t border-white/5 p-3 space-y-2">
              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {attachments.map((url) => (
                    <div key={url} className="relative group">
                      <img
                        src={url}
                        alt="Pièce jointe"
                        className="h-12 w-12 object-cover rounded-lg border border-white/10"
                      />
                      <button
                        onClick={() => removeAttachment(url)}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={attachments.length > 0 ? 'Ajoutez un message (optionnel)...' : 'Décrivez votre problème...'}
                  className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isLoading || isUploading}
                  onPaste={handlePaste}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading || attachments.length >= 10}
                  className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-lg px-3 py-2 transition-colors disabled:opacity-30"
                  title="Ajouter une image"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isUploading}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
              <div className="text-[10px] text-white/20 text-right">
                {attachments.length}/10 images · Ctrl+V pour coller
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
