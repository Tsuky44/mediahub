'use client'

import { useState, useEffect } from 'react'
import { getWebhooks, saveWebhooks, testWebhook } from './webhook-actions'
import { Plus, Trash2, Save, BellRing, Webhook, MessageSquare, Send, CheckCircle2, XCircle, Info } from 'lucide-react'

export default function ExternalNotifications() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{id: string, success: boolean, message?: string} | null>(null)
  const [showVariablesModal, setShowVariablesModal] = useState(false)
  const [selectedTestEvent, setSelectedTestEvent] = useState<Record<string, string>>({})

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      const res = await getWebhooks()
      if (res.success) {
        setWebhooks(res.webhooks || [])
        // Initialiser les événements de test sélectionnés
        const initialEvents: Record<string, string> = {}
        res.webhooks?.forEach((w: any) => {
            initialEvents[w.id] = w.events?.[0] || 'request_approved'
        })
        setSelectedTestEvent(initialEvents)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setTestResult(null)
    try {
      const res = await saveWebhooks(webhooks)
      if (res.success) {
        alert('Configuration sauvegardée avec succès')
      } else {
        alert('Erreur lors de la sauvegarde: ' + res.error)
      }
    } catch (e) {
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (index: number, testType: 'movie' | 'tv' | 'default' = 'default') => {
    const webhook = webhooks[index]
    const eventType = selectedTestEvent[webhook.id] || 'request_approved'

    if (!webhook.url && webhook.type !== 'evolution') {
        alert('Veuillez renseigner une URL')
        return
    }
    if (webhook.type === 'evolution' && (!webhook.evolutionUrl || !webhook.evolutionInstance || !webhook.evolutionApiKey)) {
        alert('Veuillez renseigner l\'URL, l\'instance et la clé API pour Evolution API')
        return
    }
    
    setTestingId(webhook.id)
    setTestResult(null)
    
    try {
        const res = await testWebhook(webhook, testType, eventType)
        setTestResult({
            id: webhook.id,
            success: res.success,
            message: res.error || 'Test réussi !'
        })
    } catch (e: any) {
        setTestResult({
            id: webhook.id,
            success: false,
            message: e.message || 'Erreur lors du test'
        })
    } finally {
        setTestingId(null)
    }
  }

  const addWebhook = () => {
    setWebhooks([
      ...webhooks,
      {
        id: Date.now().toString(),
        name: 'Nouveau Webhook',
        type: 'discord',
        url: '',
        events: ['media_request', 'account_request'],
        enabled: true
      }
    ])
  }

  const removeWebhook = (index: number) => {
    const newWebhooks = [...webhooks]
    newWebhooks.splice(index, 1)
    setWebhooks(newWebhooks)
  }

  const updateWebhook = (index: number, field: string, value: any) => {
    const newWebhooks = [...webhooks]
    newWebhooks[index] = { ...newWebhooks[index], [field]: value }
    setWebhooks(newWebhooks)
  }

  const toggleEvent = (index: number, event: string) => {
    const newWebhooks = [...webhooks]
    const events = newWebhooks[index].events || []
    if (events.includes(event)) {
      newWebhooks[index].events = events.filter((e: string) => e !== event)
    } else {
      newWebhooks[index].events = [...events, event]
    }
    setWebhooks(newWebhooks)
  }

  const updateTemplate = (index: number, eventId: string, value: string) => {
      const newWebhooks = [...webhooks]
      if (!newWebhooks[index].templates) {
          newWebhooks[index].templates = {}
      }
      newWebhooks[index].templates[eventId] = value
      setWebhooks(newWebhooks)
  }

  const toggleImage = (index: number, eventId: string) => {
      const newWebhooks = [...webhooks]
      if (!newWebhooks[index].includeImage) {
          newWebhooks[index].includeImage = {}
      }
      // Si c'est undefined, on considère que c'est true par défaut, donc on le passe à false
      const currentValue = newWebhooks[index].includeImage[eventId] !== undefined ? newWebhooks[index].includeImage[eventId] : true;
      newWebhooks[index].includeImage[eventId] = !currentValue;
      setWebhooks(newWebhooks)
  }

  const getDefaultEvolutionTemplate = (eventId: string) => {
      switch(eventId) {
          case 'media_request': return "🎬 *Nouvelle Demande de Média*\n\n👤 *Demandé par:* {user}\n📌 *Titre:* {title} ({year})\n🎭 *Genres:* {genres}\n⭐ *Note:* {rating}\n\n📖 *Synopsis:*\n{overview}";
          case 'media_grabbed': return "🎬 *{title}*\n\n📥 Envoi au téléchargement\n\n*Résumé:*\n{overview}\n\n⭐ *Note:* {rating}\n👤 *Demandé par:* {user}";
          case 'media_downloaded': return "🎬 *{title}*\n\n✅ Téléchargement terminé\n\nLe fichier est en cours d'importation...";
          case 'media_available': 
          case 'request_approved': return "🎬 *{title}*\n\n🍿 Disponible sur le serveur !\n\n*Résumé:*\n{overview}\n\n⭐ *Note:* {rating}\n👤 *Demandé par:* {user}\n\n🏷️ *Qualité:* {quality}\n💾 *Taille:* {size}";
          case 'media_deleted': return "🎬 *{title}*\n\n🗑️ Média Supprimé du serveur.";
          default: return "🎬 *{title}*\n\n{message}";
      }
  }

  const getDefaultDiscordTemplate = (eventId: string) => {
      switch(eventId) {
          case 'media_request': return "**Nouvelle Demande de Média**\n\n👤 Demandé par : {user}\n📌 Titre : **{title}** ({year})\n🎭 Genres : {genres}\n⭐ Note : {rating}/10\n\n📖 **Synopsis :**\n{overview}";
          case 'media_grabbed': return "**{title}** a été trouvé !\n\n📥 Envoi au client de téléchargement en cours...\n\nDemandé par : {user}";
          case 'media_downloaded': return "**{title}** a été téléchargé !\n\n✅ Importation en cours sur le serveur...";
          case 'media_available': 
          case 'request_approved': return "**{title}** est maintenant disponible !\n\n{overview}\n\n🎬 {year} | ⭐ {rating}/10\nDemandé par : {user}";
          case 'media_deleted': return "**{title}** a été supprimé du serveur.\n\n🗑️ Libération d'espace effectuée.";
          default: return "**{title}**\n\n{message}";
      }
  }

  const [usersList, setUsersList] = useState<any[]>([])

  useEffect(() => {
    // Charger la liste des utilisateurs pour le dropdown
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsersList(data)
        }
      })
      .catch(console.error)
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement...</div>

  const eventTypes = [
    { id: 'media_request', label: 'Nouvelle demande de média (Utilisateur)' },
    { id: 'request_approved', label: 'Demande de média approuvée (Admin)' },
    { id: 'media_grabbed', label: 'Média envoyé au téléchargement (Grab)' },
    { id: 'media_downloaded', label: 'Téléchargement terminé (Download)' },
    { id: 'media_available', label: 'Média disponible sur le serveur (Emby)' },
    { id: 'media_deleted', label: 'Média supprimé du serveur' },
    { id: 'account_request', label: 'Nouvelle demande de compte' },
    { id: 'user_created', label: 'Nouvel utilisateur créé' }
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Notifications Externes</h2>
          <p className="text-sm text-gray-400">Configurez l'envoi de notifications vers Discord, Telegram, ou des webhooks personnalisés.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowVariablesModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors text-sm font-medium border border-indigo-500/20"
          >
            <Info size={16} />
            Variables
          </button>
          <button
            onClick={addWebhook}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/10"
          >
            <Plus size={16} />
            Ajouter
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {showVariablesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info size={20} className="text-indigo-400" />
                Variables de Template
              </h3>
              <button 
                onClick={() => setShowVariablesModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <p className="text-sm text-gray-300">
                Vous pouvez utiliser ces variables dans vos templates. Elles seront automatiquement remplacées par les vraies valeurs lors de l'envoi de la notification.
              </p>
              
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-black/40 px-4 py-2 border-b border-white/10 font-medium text-sm text-indigo-300">Informations Générales</div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{title}`}</code> <span className="text-xs text-gray-400">Titre du film ou de la série</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{message}`}</code> <span className="text-xs text-gray-400">Message système par défaut</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{user}`}</code> <span className="text-xs text-gray-400">Nom ou Ping de l'utilisateur</span></div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-black/40 px-4 py-2 border-b border-white/10 font-medium text-sm text-emerald-300">Informations du Média (TMDB)</div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{overview}`}</code> <span className="text-xs text-gray-400">Résumé (synopsis)</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{year}`}</code> <span className="text-xs text-gray-400">Année de sortie</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{rating}`}</code> <span className="text-xs text-gray-400">Note (ex: 8.5)</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{genres}`}</code> <span className="text-xs text-gray-400">Genres (ex: Action, Drame)</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{episodes}`}</code> <span className="text-xs text-gray-400">Saison/Episode (ex: S01E01)</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{poster}`}</code> <span className="text-xs text-gray-400">Lien URL de l'affiche (image)</span></div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="bg-black/40 px-4 py-2 border-b border-white/10 font-medium text-sm text-blue-300">Informations Techniques (Radarr/Sonarr)</div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{quality}`}</code> <span className="text-xs text-gray-400">Qualité (ex: Bluray-1080p)</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{size}`}</code> <span className="text-xs text-gray-400">Taille du fichier (ex: 4.2 GB)</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{indexer}`}</code> <span className="text-xs text-gray-400">Indexeur/Tracker (ex: YGG)</span></div>
                    <div><code className="text-xs bg-black/50 px-1.5 py-0.5 rounded text-pink-400">{`{release}`}</code> <span className="text-xs text-gray-400">Nom de la release (fichier)</span></div>
                  </div>
                </div>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-indigo-300 mb-2">Astuces de formatage</h4>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside ml-4">
                    <li><strong>WhatsApp :</strong> Utilisez <code>*texte*</code> pour le gras, <code>_texte_</code> pour l'italique, <code>~texte~</code> pour barré.</li>
                    <li><strong>Discord :</strong> Utilisez <code>**texte**</code> pour le gras, <code>*texte*</code> pour l'italique.</li>
                    <li>L'affiche du film/série est toujours envoyée automatiquement avec le message si elle est disponible.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-black/40 text-right">
              <button 
                onClick={() => setShowVariablesModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {webhooks.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
            <BellRing size={48} className="mx-auto text-gray-500 mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">Aucune notification externe</h3>
            <p className="text-gray-400 mb-6">Ajoutez un webhook pour recevoir des alertes sur vos plateformes préférées.</p>
            <button onClick={addWebhook} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium">
              Ajouter une notification
            </button>
          </div>
        ) : (
          webhooks.map((webhook, index) => (
            <div key={webhook.id} className="bg-gray-900/50 border border-white/10 rounded-xl p-6 relative group">
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/20">
                  <select
                    value={selectedTestEvent[webhook.id] || ''}
                    onChange={(e) => setSelectedTestEvent(prev => ({ ...prev, [webhook.id]: e.target.value }))}
                    className="bg-transparent text-[10px] text-indigo-300 outline-none border-none cursor-pointer pr-1"
                  >
                    {webhook.events?.map((e: string) => (
                      <option key={e} value={e} className="bg-gray-900 text-white">{eventTypes.find(t => t.id === e)?.label || e}</option>
                    ))}
                  </select>
                  <div className="flex rounded-md overflow-hidden border border-indigo-500/20 bg-indigo-500/10">
                    <button
                      onClick={() => handleTest(index, 'default')}
                      disabled={testingId === webhook.id}
                      className="px-2 py-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors border-r border-indigo-500/20 disabled:opacity-50"
                      title="Test basique"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleTest(index, 'movie')}
                      disabled={testingId === webhook.id}
                      className="px-2 py-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors border-r border-indigo-500/20 disabled:opacity-50"
                      title="Test Film"
                    >
                      Film
                    </button>
                    <button
                      onClick={() => handleTest(index, 'tv')}
                      disabled={testingId === webhook.id}
                      className="px-2 py-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                      title="Test Série"
                    >
                      Série
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeWebhook(index)}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nom (identifiant)</label>
                    <input
                      type="text"
                      value={webhook.name}
                      onChange={(e) => updateWebhook(index, 'name', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="Ex: Mon serveur Discord"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Type de service</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateWebhook(index, 'type', 'discord')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${webhook.type === 'discord' ? 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2]' : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'}`}
                      >
                        <MessageSquare size={16} /> Discord
                      </button>
                      <button
                        onClick={() => updateWebhook(index, 'type', 'evolution')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${webhook.type === 'evolution' ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]' : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'}`}
                      >
                        <MessageSquare size={16} /> Evolution API
                      </button>
                      <button
                        onClick={() => updateWebhook(index, 'type', 'custom')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${webhook.type === 'custom' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'}`}
                      >
                        <Webhook size={16} /> Webhook
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={webhook.enabled}
                        onChange={(e) => updateWebhook(index, 'enabled', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      <span className="ml-3 text-sm font-medium text-gray-300">Activer cette notification</span>
                    </label>
                  </div>

                  <div className="mt-6 p-4 bg-black/20 rounded-lg border border-white/5">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <BellRing size={14} className="text-indigo-400" />
                      Destinataires (Qui reçoit cette notification ?)
                    </h4>
                    
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={webhook.notifyRequester !== false} // Default to true if undefined
                        onChange={(e) => updateWebhook(index, 'notifyRequester', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-black/40 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                      />
                      <span className="text-sm text-gray-300">
                        Notifier automatiquement l'utilisateur qui a demandé le média
                      </span>
                    </label>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-400">Ajouter des destinataires fixes (ex: Admin) :</label>
                      <select 
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const currentTargets = webhook.targetUsers || [];
                          if (!currentTargets.includes(val)) {
                            updateWebhook(index, 'targetUsers', [...currentTargets, val]);
                          }
                          e.target.value = ""; // reset
                        }}
                      >
                        <option value="">-- Sélectionner un utilisateur --</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id.toString()}>{u.name || u.email}</option>
                        ))}
                      </select>
                      
                      {webhook.targetUsers && webhook.targetUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {webhook.targetUsers.map((targetId: string) => {
                            const user = usersList.find(u => u.id.toString() === targetId);
                            return (
                              <span key={targetId} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30">
                                {user ? (user.name || user.email) : `User #${targetId}`}
                                <button 
                                  onClick={() => updateWebhook(index, 'targetUsers', webhook.targetUsers.filter((id: string) => id !== targetId))}
                                  className="hover:text-white ml-1"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {webhook.type === 'evolution' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">URL de l'API (ex: https://evo.tondomaine.com)</label>
                        <input
                          type="url"
                          value={webhook.evolutionUrl || ''}
                          onChange={(e) => updateWebhook(index, 'evolutionUrl', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nom de l'instance</label>
                        <input
                          type="text"
                          value={webhook.evolutionInstance || ''}
                          onChange={(e) => updateWebhook(index, 'evolutionInstance', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="Ex: mediahub-bot"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Global API Key</label>
                        <input
                          type="password"
                          value={webhook.evolutionApiKey || ''}
                          onChange={(e) => updateWebhook(index, 'evolutionApiKey', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="Votre clé API"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Numéro WhatsApp destinataire (fallback)</label>
                        <input
                          type="text"
                          value={webhook.whatsappNumber || ''}
                          onChange={(e) => updateWebhook(index, 'whatsappNumber', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="Ex: 33612345678 (sans + ni espace)"
                        />
                        <p className="text-xs text-gray-500 mt-1">Utilisé si le destinataire fixe n'a pas de numéro WhatsApp dans son profil.</p>
                      </div>
                      {webhook.events && webhook.events.length > 0 && (
                        <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
                          <label className="block text-sm font-medium text-gray-400">Templates WhatsApp par événement (Optionnel)</label>
                          {webhook.events.map((eventId: string) => {
                              const eventLabel = eventTypes.find(e => e.id === eventId)?.label || eventId;
                              const defaultValue = getDefaultEvolutionTemplate(eventId);
                              const includeImage = webhook.includeImage?.[eventId] !== undefined ? webhook.includeImage[eventId] : true;
                              return (
                                  <div key={eventId} className="bg-black/20 p-3 rounded-lg border border-white/5 relative">
                                      <div className="flex justify-between items-center mb-1">
                                          <label className="block text-xs font-medium text-indigo-300">{eventLabel}</label>
                                          <label className="flex items-center gap-1.5 cursor-pointer" title="Joindre l'affiche du média à ce message">
                                              <input 
                                                  type="checkbox" 
                                                  checked={includeImage}
                                                  onChange={() => toggleImage(index, eventId)}
                                                  className="w-3 h-3 rounded border-gray-600 bg-black/40 text-indigo-500 focus:ring-indigo-500"
                                              />
                                              <span className="text-[10px] text-gray-400">Inclure l'image</span>
                                          </label>
                                      </div>
                                      <textarea
                                        value={webhook.templates?.[eventId] !== undefined ? webhook.templates[eventId] : defaultValue}
                                        onChange={(e) => updateTemplate(index, eventId, e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[80px] text-xs"
                                        placeholder={defaultValue}
                                      />
                                  </div>
                              )
                          })}
                          <p className="text-xs text-gray-500 mt-1">Variables: {`{title}`}, {`{message}`}, {`{year}`}, {`{overview}`}, {`{rating}`}, {`{genres}`}, {`{user}`}, {`{quality}`}, {`{size}`}, {`{indexer}`}, {`{release}`}, {`{poster}`}. Format autorisé (*gras*, _italique_).</p>
                        </div>
                      )}
                    </>
                  ) : webhook.type === 'discord' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">URL du Webhook Discord</label>
                        <input
                          type="url"
                          value={webhook.url || ''}
                          onChange={(e) => updateWebhook(index, 'url', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                          placeholder="https://discord.com/api/webhooks/..."
                        />
                      </div>
                      {webhook.events && webhook.events.length > 0 && (
                        <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
                          <label className="block text-sm font-medium text-gray-400">Templates Discord par événement (Optionnel)</label>
                          {webhook.events.map((eventId: string) => {
                              const eventLabel = eventTypes.find(e => e.id === eventId)?.label || eventId;
                              const defaultValue = getDefaultDiscordTemplate(eventId);
                              const includeImage = webhook.includeImage?.[eventId] !== undefined ? webhook.includeImage[eventId] : true;
                              return (
                                  <div key={eventId} className="bg-black/20 p-3 rounded-lg border border-white/5 relative">
                                      <div className="flex justify-between items-center mb-1">
                                          <label className="block text-xs font-medium text-indigo-300">{eventLabel}</label>
                                          <label className="flex items-center gap-1.5 cursor-pointer" title="Joindre l'affiche du média à ce message">
                                              <input 
                                                  type="checkbox" 
                                                  checked={includeImage}
                                                  onChange={() => toggleImage(index, eventId)}
                                                  className="w-3 h-3 rounded border-gray-600 bg-black/40 text-indigo-500 focus:ring-indigo-500"
                                              />
                                              <span className="text-[10px] text-gray-400">Inclure l'image</span>
                                          </label>
                                      </div>
                                      <textarea
                                        value={webhook.templates?.[eventId] !== undefined ? webhook.templates[eventId] : defaultValue}
                                        onChange={(e) => updateTemplate(index, eventId, e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[80px] text-xs"
                                        placeholder={defaultValue}
                                      />
                                  </div>
                              )
                          })}
                          <p className="text-xs text-gray-500 mt-1">Variables: {`{title}`}, {`{message}`}, {`{year}`}, {`{overview}`}, {`{rating}`}, {`{genres}`}, {`{user}`}, {`{quality}`}, {`{size}`}, {`{indexer}`}, {`{release}`}, {`{poster}`}. Laisser vide pour le format par défaut.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">URL du Webhook</label>
                      <input
                        type="url"
                        value={webhook.url || ''}
                        onChange={(e) => updateWebhook(index, 'url', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="https://..."
                      />
                      {webhook.type === 'custom' && (
                        <p className="text-xs text-gray-500 mt-2">Le payload envoyé sera un JSON contenant: title, message, event, data</p>
                      )}
                    </div>
                  )}

                  {testResult && testResult.id === webhook.id && (
                    <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${testResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {testResult.success ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                      <span className="break-all">{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="block text-sm font-medium text-gray-400 mb-3">Événements déclencheurs</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {eventTypes.map(event => (
                    <label key={event.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={(webhook.events || []).includes(event.id)}
                        onChange={() => toggleEvent(index, event.id)}
                        className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500/50 bg-black/40"
                      />
                      <span className="text-sm text-gray-300">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
