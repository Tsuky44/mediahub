'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Step1 } from './_components/Step1'
import { Step2 } from './_components/Step2'
import { Step3 } from './_components/Step3'
import { useRequestAccess } from './_components/useRequestAccess'

export default function RequestAccessPage() {
  const { step, formData, setFormData, loading, error, handleNext, handleSubmit, goBack } =
    useRequestAccess()

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 1 && <Step1 onNext={handleNext} />}

              {step === 2 && (
                <Step2
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleSubmit}
                  loading={loading}
                  error={error}
                  onBack={goBack}
                />
              )}

              {step === 3 && <Step3 email={formData.email} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          MediaHub &bull; Accès Sécurisé
        </p>
      </div>
    </div>
  )
}
