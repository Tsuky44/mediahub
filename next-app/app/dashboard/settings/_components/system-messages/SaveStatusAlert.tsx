'use client'

import { CheckCircle, AlertCircle } from 'lucide-react'

interface SaveStatusAlertProps {
  status: { type: 'success' | 'error'; message: string } | null
}

export function SaveStatusAlert({ status }: SaveStatusAlertProps) {
  if (!status) return null

  const isSuccess = status.type === 'success'
  return (
    <div
      className={`p-4 rounded-lg flex items-center gap-3 ${
        isSuccess
          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      {isSuccess ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      <span>{status.message}</span>
    </div>
  )
}
