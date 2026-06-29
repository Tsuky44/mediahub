import { useState, useCallback } from 'react'

export interface ChatMessage {
  id: string
  role: 'bot' | 'user'
  text: string
  options?: { label: string; value: string; type: 'category' | 'subcategory' | 'action' }[]
}

interface Category {
  id: string
  name: string
  subcategories: Subcategory[]
}

interface Subcategory {
  id: string
  name: string
}

export function useSupportChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'category' | 'subcategory' | 'message' | 'sent'>('category')
  const [attachments, setAttachments] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const open = useCallback(async () => {
    setIsOpen(true)
    if (messages.length === 0) {
      setIsLoading(true)
      try {
        const res = await fetch('/api/support/categories')
        if (res.ok) {
          const data = (await res.json()) as Category[]
          setCategories(data)
          setMessages([
            {
              id: 'welcome',
              role: 'bot',
              text: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
            },
            {
              id: 'categories',
              role: 'bot',
              text: 'Veuillez choisir une catégorie :',
              options: data.map((c) => ({ label: c.name, value: c.id, type: 'category' as const })),
            },
          ])
        } else {
          setMessages([
            {
              id: 'error',
              role: 'bot',
              text: 'Impossible de charger le support. Veuillez réessayer plus tard.',
            },
          ])
        }
      } catch {
        setMessages([
          {
            id: 'error',
            role: 'bot',
            text: 'Impossible de charger le support. Veuillez réessayer plus tard.',
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }
  }, [messages.length])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const reset = useCallback(() => {
    setMessages([])
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setStep('category')
    setAttachments([])
  }, [])

  const selectCategory = useCallback(
    (categoryId: string) => {
      const category = categories.find((c) => c.id === categoryId)
      if (!category) return

      setSelectedCategory(category)
      setMessages((prev) => [
        ...prev,
        {
          id: `user-cat-${Date.now()}`,
          role: 'user',
          text: category.name,
        },
      ])

      if (category.subcategories.length > 0) {
        setStep('subcategory')
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-sub-${Date.now()}`,
            role: 'bot',
            text: `Quel type de problème rencontrez-vous dans **${category.name}** ?`,
            options: category.subcategories.map((s) => ({
              label: s.name,
              value: s.id,
              type: 'subcategory' as const,
            })),
          },
        ])
      } else {
        setStep('message')
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-msg-${Date.now()}`,
            role: 'bot',
            text: 'Décrivez votre problème en détail :',
          },
        ])
      }
    },
    [categories]
  )

  const selectSubcategory = useCallback(
    (subcategoryId: string) => {
      if (!selectedCategory) return
      const sub = selectedCategory.subcategories.find((s) => s.id === subcategoryId)
      if (!sub) return

      setSelectedSubcategory(sub)
      setStep('message')
      setMessages((prev) => [
        ...prev,
        {
          id: `user-sub-${Date.now()}`,
          role: 'user',
          text: sub.name,
        },
        {
          id: `bot-msg-${Date.now()}`,
          role: 'bot',
          text: 'Décrivez votre problème en détail :',
        },
      ])
    },
    [selectedCategory]
  )

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/support/upload', {
          method: 'POST',
          body: formData,
        })
        if (res.ok) {
          const data = (await res.json()) as { url: string }
          setAttachments((prev) => [...prev, data.url])
          return data.url
        }
        return null
      } catch {
        return null
      } finally {
        setIsUploading(false)
      }
    },
    []
  )

  const removeAttachment = useCallback((url: string) => {
    setAttachments((prev) => prev.filter((u) => u !== url))
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!selectedCategory) return

      setMessages((prev) => [
        ...prev,
        {
          id: `user-msg-${Date.now()}`,
          role: 'user',
          text: attachments.length > 0 ? `${text}\n\n(${attachments.length} pièce${attachments.length > 1 ? 's' : ''} jointe${attachments.length > 1 ? 's' : ''})` : text,
        },
      ])
      setIsLoading(true)

      try {
        const res = await fetch('/api/support/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: selectedCategory.id,
            subcategoryId: selectedSubcategory?.id,
            message: text,
            attachments: attachments.length > 0 ? attachments : undefined,
          }),
        })

        if (res.ok) {
          setStep('sent')
          setAttachments([])
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-sent-${Date.now()}`,
              role: 'bot',
              text: 'Votre message a bien été envoyé ! Notre équipe vous répondra dans les plus brefs délais.',
              options: [{ label: 'Nouvelle demande', value: 'restart', type: 'action' as const }],
            },
          ])
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-err-${Date.now()}`,
              role: 'bot',
              text: 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.',
            },
          ])
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            role: 'bot',
            text: 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.',
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [selectedCategory, selectedSubcategory, attachments]
  )

  return {
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
  }
}
