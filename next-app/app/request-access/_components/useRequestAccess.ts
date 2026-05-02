'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface FormData {
  firstName: string
  email: string
  inviter: string
}

export function useRequestAccess() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    email: '',
    inviter: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleNext = () => {
    setStep(step + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/public/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      setSuccess(true)
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return {
    step,
    formData,
    setFormData,
    loading,
    error,
    success,
    handleNext,
    handleSubmit,
    goBack: () => setStep(1),
  }
}
