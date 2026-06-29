'use client'

import { useRef, useEffect } from 'react'
import { useSupportChat } from '@/hooks/useSupportChat'
import { MessageCircle, X, Send, Bot, User, Loader2, ImagePlus, X as XIcon } from 'lucide-react'

export default function SupportChatbot() {
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
          onClick={open}
          className="fixed bottom-6 left-6 z-50 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-4 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
          aria-label="Ouvrir le support"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
