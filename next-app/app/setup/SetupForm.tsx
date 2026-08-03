'use client'

import { useSetupForm } from './_hooks/useSetupForm'
import { SetupModeToggle } from './_components/SetupModeToggle'
import { SetupConfigureForm } from './_components/SetupConfigureForm'
import { SetupRestoreForm } from './_components/SetupRestoreForm'

export default function SetupForm() {
  const {
    loading,
    mode,
    setMode,
    formData,
    setServerType,
    restorePassword,
    showRestorePassword,
    setShowRestorePassword,
    handleChange,
    handleFileChange,
    handleSubmit,
    handleRestore,
    setRestorePassword,
  } = useSetupForm()

  return (
    <div className="space-y-6">
      <SetupModeToggle mode={mode} onChange={setMode} />

      {mode === 'configure' ? (
        <SetupConfigureForm
          formData={formData}
          loading={loading}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onServerTypeChange={setServerType}
        />
      ) : (
        <SetupRestoreForm
          restorePassword={restorePassword}
          showPassword={showRestorePassword}
          loading={loading}
          onTogglePassword={() => setShowRestorePassword(prev => !prev)}
          onPasswordChange={setRestorePassword}
          onFileChange={handleFileChange}
          onSubmit={handleRestore}
        />
      )}
    </div>
  )
}
