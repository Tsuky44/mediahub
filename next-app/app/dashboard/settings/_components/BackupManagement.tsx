'use client'

import { useState, useRef } from 'react'
import { Download, Upload, Lock, FileText, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function BackupManagement() {
  const router = useRouter()
  
  // Settings Export State
  const [settingsExportPassword, setSettingsExportPassword] = useState('')
  const [showSettingsExportPassword, setShowSettingsExportPassword] = useState(false)
  const [isSettingsExporting, setIsSettingsExporting] = useState(false)

  // Settings Import State
  const [settingsImportPassword, setSettingsImportPassword] = useState('')
  const [showSettingsImportPassword, setShowSettingsImportPassword] = useState(false)
  const [settingsImportFile, setSettingsImportFile] = useState<File | null>(null)
  const [isSettingsImporting, setIsSettingsImporting] = useState(false)
  const settingsFileInputRef = useRef<HTMLInputElement>(null)

  // Database Export State
  const [dbExportPassword, setDbExportPassword] = useState('')
  const [showDbExportPassword, setShowDbExportPassword] = useState(false)
  const [isDbExporting, setIsDbExporting] = useState(false)

  // Database Import State
  const [dbImportPassword, setDbImportPassword] = useState('')
  const [showDbImportPassword, setShowDbImportPassword] = useState(false)
  const [dbImportFile, setDbImportFile] = useState<File | null>(null)
  const [isDbImporting, setIsDbImporting] = useState(false)
  const dbFileInputRef = useRef<HTMLInputElement>(null)

  const handleSettingsExport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settingsExportPassword) {
        toast.error('Veuillez définir un mot de passe pour le fichier')
        return
    }

    setIsSettingsExporting(true)
    try {
      const res = await fetch('/api/admin/settings/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: settingsExportPassword })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'export')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0]
      a.download = `mediahub-settings-${date}.enc`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Configuration exportée avec succès')
      setSettingsExportPassword('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSettingsExporting(false)
    }
  }

  const handleSettingsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSettingsImportFile(e.target.files[0])
    }
  }

  const handleSettingsImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settingsImportFile || !settingsImportPassword) {
        toast.error('Veuillez sélectionner un fichier et entrer le mot de passe')
        return
    }

    if (!confirm('Attention : Cette action va écraser les paramètres existants. Voulez-vous continuer ?')) {
        return
    }

    setIsSettingsImporting(true)
    try {
      const text = await settingsImportFile.text()
      
      const res = await fetch('/api/admin/settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: text, password: settingsImportPassword })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de l\'import')
      }

      toast.success(`Import réussi ! ${result.count} paramètres mis à jour.`)
      setSettingsImportFile(null)
      setSettingsImportPassword('')
      if (settingsFileInputRef.current) settingsFileInputRef.current.value = ''
      
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSettingsImporting(false)
    }
  }

  const handleDbExport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dbExportPassword) {
        toast.error('Veuillez définir un mot de passe pour le fichier')
        return
    }

    setIsDbExporting(true)
    try {
      const res = await fetch('/api/admin/database/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: dbExportPassword })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'export')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0]
      a.download = `mediahub-database-${date}.enc`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Base de données exportée avec succès')
      setDbExportPassword('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDbExporting(false)
    }
  }

  const handleDbFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDbImportFile(e.target.files[0])
    }
  }

  const handleDbImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dbImportFile || !dbImportPassword) {
        toast.error('Veuillez sélectionner un fichier et entrer le mot de passe')
        return
    }

    if (!confirm('ATTENTION CRITIQUE : Cette action va supprimer TOUTES les données actuelles (utilisateurs, requêtes, configurations) et les remplacer par celles du fichier de sauvegarde. Cette action est irréversible. Voulez-vous vraiment continuer ?')) {
        return
    }

    setIsDbImporting(true)
    try {
      const text = await dbImportFile.text()
      
      const res = await fetch('/api/admin/database/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: text, password: dbImportPassword })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de l\'import')
      }

      toast.success('Restauration de la base de données réussie !')
      setDbImportFile(null)
      setDbImportPassword('')
      if (dbFileInputRef.current) dbFileInputRef.current.value = ''
      
      router.refresh()
      // Force reload to ensure all states (session etc) are clean
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDbImporting(false)
    }
  }

  return (
    <div className="space-y-12">
      {/* Settings Backup Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4">Sauvegarde des Paramètres</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Download className="text-blue-400" />
                Exporter la configuration
                </h3>
                <p className="text-gray-400 mb-6 text-sm">
                Sauvegardez uniquement vos paramètres (URL, clés API, etc.) dans un fichier sécurisé.
                </p>

                <form onSubmit={handleSettingsExport} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe de chiffrement</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input 
                            type={showSettingsExportPassword ? "text" : "password"}
                            value={settingsExportPassword}
                            onChange={(e) => setSettingsExportPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Définissez un mot de passe..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowSettingsExportPassword(!showSettingsExportPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showSettingsExportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isSettingsExporting}
                    className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSettingsExporting ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                    Exporter les paramètres
                </button>
                </form>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="text-emerald-400" />
                Importer la configuration
                </h3>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="text-yellow-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-200">
                        L'importation mettra à jour vos paramètres actuels.
                    </p>
                </div>

                <form onSubmit={handleSettingsImport} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fichier (.enc)</label>
                    <input 
                        ref={settingsFileInputRef}
                        type="file"
                        accept=".enc"
                        onChange={handleSettingsFileChange}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input 
                            type={showSettingsImportPassword ? "text" : "password"}
                            value={settingsImportPassword}
                            onChange={(e) => setSettingsImportPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-10 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Mot de passe du fichier..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowSettingsImportPassword(!showSettingsImportPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showSettingsImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSettingsImporting}
                    className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSettingsImporting ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    Importer les paramètres
                </button>
                </form>
            </div>
        </div>
      </div>

      {/* Database Backup Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 flex items-center gap-2">
            Sauvegarde Complète (Base de données)
            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">Zone Critique</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Download className="text-purple-400" />
                Sauvegarde Complète
                </h3>
                <p className="text-gray-400 mb-6 text-sm">
                Sauvegardez TOUTES les données (Utilisateurs, Requêtes, Historique, Paramètres, etc.).
                </p>

                <form onSubmit={handleDbExport} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe de chiffrement</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input 
                            type={showDbExportPassword ? "text" : "password"}
                            value={dbExportPassword}
                            onChange={(e) => setDbExportPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-10 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Définissez un mot de passe..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowDbExportPassword(!showDbExportPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showDbExportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isDbExporting}
                    className="w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDbExporting ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                    Sauvegarder la BDD
                </button>
                </form>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="text-red-400" />
                Restauration Complète
                </h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-200">
                        ATTENTION: Cette action supprimera TOUTES les données actuelles pour les remplacer par celles de la sauvegarde.
                    </p>
                </div>

                <form onSubmit={handleDbImport} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fichier de sauvegarde (.enc)</label>
                    <input 
                        ref={dbFileInputRef}
                        type="file"
                        accept=".enc"
                        onChange={handleDbFileChange}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input 
                            type={showDbImportPassword ? "text" : "password"}
                            value={dbImportPassword}
                            onChange={(e) => setDbImportPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-10 text-white focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Mot de passe du fichier..."
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowDbImportPassword(!showDbImportPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showDbImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isDbImporting}
                    className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDbImporting ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    Restaurer la BDD
                </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  )
}
