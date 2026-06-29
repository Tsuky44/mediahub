'use client'

import { useState } from 'react'
import { useSupportCategories } from './useSupportCategories'
import { MessageCircle, Trash2, Plus, ChevronDown, ChevronUp, GripVertical, Pencil, Check, X as XIcon, Shield, User, AtSign, Users } from 'lucide-react'
import type { SupportCategoryWithSubcategories, SupportSubcategory } from '@/types/support'

interface MentionItem {
  id: string;
  type: 'role' | 'user' | 'raw';
  raw: string;
}

function parseMentions(val: string | null | undefined): MentionItem[] {
  if (!val) return [];
  const tokens = val.split(/[\s,]+/).filter(Boolean);
  return tokens.map((token) => {
    if (token.startsWith('<@&') && token.endsWith('>')) {
      return { id: token.slice(3, -1), type: 'role', raw: token };
    }
    if (token.startsWith('<@') && token.endsWith('>')) {
      return { id: token.slice(2, -1), type: 'user', raw: token };
    }
    return { id: token, type: 'raw', raw: token };
  });
}

function serializeMentions(items: MentionItem[]): string {
  return items
    .map((item) => {
      if (item.type === 'role') return `<@&${item.id}>`;
      if (item.type === 'user') return `<@${item.id}>`;
      return item.id;
    })
    .join(' ');
}

function DiscordMentionsManager({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const items = parseMentions(value);
  const [newId, setNewId] = useState('');
  const [type, setType] = useState<'role' | 'user'>('role');

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const idTrimmed = newId.trim();
    if (!idTrimmed) return;
    
    if (items.some(item => item.id === idTrimmed)) {
      setNewId('');
      return;
    }

    const newItem: MentionItem = {
      id: idTrimmed,
      type: type,
      raw: type === 'role' ? `<@&${idTrimmed}>` : `<@${idTrimmed}>`,
    };

    onChange(serializeMentions([...items, newItem]));
    setNewId('');
  };

  const handleRemove = (idToRemove: string) => {
    const updated = items.filter((item) => item.id !== idToRemove);
    onChange(serializeMentions(updated));
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center p-2 bg-black/40 rounded-lg border border-white/5">
          {items.map((item) => {
            const isRole = item.type === 'role';
            const isUser = item.type === 'user';
            return (
              <span
                key={item.id}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                  isRole
                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                    : isUser
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-white/5 text-white/70 border-white/10'
                }`}
              >
                {isRole ? (
                  <Shield size={10} className="shrink-0 text-indigo-400" />
                ) : isUser ? (
                  <User size={10} className="shrink-0 text-emerald-400" />
                ) : (
                  <AtSign size={10} className="shrink-0" />
                )}
                <span>
                  {isRole ? 'Rôle' : isUser ? 'Membre' : 'Ping'} ({item.id})
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="hover:text-rose-400 transition-colors cursor-pointer shrink-0 ml-1"
                >
                  <XIcon size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'role' | 'user')}
          className="bg-black/40 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8 font-sans"
        >
          <option value="role">Rôle (@&)</option>
          <option value="user">Membre (@)</option>
        </select>
        <input
          type="text"
          placeholder="ID Discord (numérique)"
          value={newId}
          onChange={(e) => setNewId(e.target.value.replace(/\D/g, ''))}
          onBlur={() => handleAdd()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8"
        />
        <button
          type="button"
          onClick={() => handleAdd()}
          disabled={!newId.trim()}
          className="h-8 w-8 flex items-center justify-center bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
          title="Ajouter"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default function SupportCategoriesConfig() {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    refresh,
  } = useSupportCategories()

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryWebhook, setNewCategoryWebhook] = useState('')
  const [newCategoryMentions, setNewCategoryMentions] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [newSubWebhook, setNewSubWebhook] = useState('')
  const [newSubMentions, setNewSubMentions] = useState('')
  const [activeCategoryForSub, setActiveCategoryForSub] = useState<string | null>(null)
  const [editingCategoryWebhook, setEditingCategoryWebhook] = useState<string | null>(null)
  const [editCatNameValue, setEditCatNameValue] = useState('')
  const [editCatWebhookValue, setEditCatWebhookValue] = useState('')
  const [editCatMentionsValue, setEditCatMentionsValue] = useState('')
  const [editingSubcategoryWebhook, setEditingSubcategoryWebhook] = useState<string | null>(null)
  const [editSubNameValue, setEditSubNameValue] = useState('')
  const [editSubWebhookValue, setEditSubWebhookValue] = useState('')
  const [editSubMentionsValue, setEditSubMentionsValue] = useState('')

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    await createCategory({
      name: newCategoryName,
      discordWebhook: newCategoryWebhook || undefined,
      discordMentions: newCategoryMentions || undefined,
    })
    setNewCategoryName('')
    setNewCategoryWebhook('')
    setNewCategoryMentions('')
  }

  const handleAddSubcategory = async (categoryId: string) => {
    if (!newSubName.trim()) return
    await createSubcategory({
      categoryId,
      name: newSubName,
      discordWebhook: newSubWebhook || undefined,
      discordMentions: newSubMentions || undefined,
    })
    setNewSubName('')
    setNewSubWebhook('')
    setNewSubMentions('')
    setActiveCategoryForSub(null)
  }

  return (
    <div className="space-y-6">
      {/* Add Category */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <Plus size={16} className="text-indigo-400" />
          Nouvelle catégorie de support
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <label className="text-xs font-medium text-white/60">Nom de la catégorie</label>
            <input
              type="text"
              placeholder="Ex: Problème Technique, Facturation..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/60">Webhook Discord (optionnel)</label>
            <input
              type="text"
              placeholder="https://discord.com/api/webhooks/..."
              value={newCategoryWebhook}
              onChange={(e) => setNewCategoryWebhook(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/60">Mentions Discord à pinguer</label>
            <DiscordMentionsManager
              value={newCategoryMentions}
              onChange={setNewCategoryMentions}
            />
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/10"
          >
            <Plus size={16} />
            Créer la catégorie
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center text-white/40 py-8">Chargement...</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            Aucune catégorie configurée. Créez-en une pour activer le chatbot de support.
          </div>
        ) : (
          categories.map((cat: SupportCategoryWithSubcategories) => (
            <div
              key={cat.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              {editingCategoryWebhook === cat.id ? (
                /* Full Category Edit Form */
                <div className="p-5 space-y-4 bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      <Pencil size={14} />
                      Modifier la catégorie
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCategoryWebhook(null)}
                        className="bg-white/5 hover:bg-white/10 text-white/85 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10"
                      >
                        <XIcon size={14} /> Annuler
                      </button>
                      <button
                        onClick={async () => {
                          await updateCategory({
                            id: cat.id,
                            name: editCatNameValue.trim() || undefined,
                            discordWebhook: editCatWebhookValue.trim() || null,
                            discordMentions: editCatMentionsValue.trim() || null,
                          })
                          setEditingCategoryWebhook(null)
                        }}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-500/10"
                      >
                        <Check size={14} /> Enregistrer
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-xs font-medium text-white/60">Nom de la catégorie</label>
                      <input
                        type="text"
                        value={editCatNameValue}
                        onChange={(e) => setEditCatNameValue(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Webhook Discord (optionnel)</label>
                      <input
                        type="text"
                        value={editCatWebhookValue}
                        onChange={(e) => setEditCatWebhookValue(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Mentions Discord à pinguer</label>
                      <DiscordMentionsManager
                        value={editCatMentionsValue}
                        onChange={setEditCatMentionsValue}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Category Card */
                <>
                  <div className="flex items-center gap-3 p-4">
                    <GripVertical size={16} className="text-white/20" />
                    <MessageCircle size={18} className="text-indigo-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium">{cat.name}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {cat.discordWebhook ? (
                          <span className="text-xs text-emerald-400 truncate max-w-[300px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Webhook configuré
                          </span>
                        ) : (
                          <span className="text-xs text-white/30">Aucun webhook</span>
                        )}
                        {cat.discordMentions && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <Users size={12} className="text-amber-400/80" />
                            {parseMentions(cat.discordMentions).length} pings
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setEditingCategoryWebhook(cat.id)
                        setEditCatNameValue(cat.name)
                        setEditCatWebhookValue(cat.discordWebhook || '')
                        setEditCatMentionsValue(cat.discordMentions || '')
                      }}
                      className="text-white/30 hover:text-white/60 transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                      title="Modifier la catégorie"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                      className="text-white/40 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                    >
                      {expandedCategory === cat.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="text-rose-400/50 hover:text-rose-400 transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {expandedCategory === cat.id && (
                    <div className="border-t border-white/5 p-4 space-y-3 bg-black/[0.05]">
                      <div className="text-xs font-semibold text-white/45 uppercase tracking-wider">
                        Sous-catégories
                      </div>

                      {cat.subcategories.length > 0 && (
                        <div className="space-y-2">
                          {cat.subcategories.map((sub: SupportSubcategory) => (
                            <div
                              key={sub.id}
                              className="flex flex-col bg-black/20 rounded-xl border border-white/5 p-3"
                            >
                              {editingSubcategoryWebhook === sub.id ? (
                                /* Full Subcategory Edit Form */
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                                    <span className="text-xs font-semibold text-indigo-400">Modifier la sous-catégorie</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setEditingSubcategoryWebhook(null)}
                                        className="bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors border border-white/5"
                                      >
                                        <XIcon size={12} /> Annuler
                                      </button>
                                      <button
                                        onClick={async () => {
                                          await updateSubcategory({
                                            id: sub.id,
                                            name: editSubNameValue.trim() || undefined,
                                            discordWebhook: editSubWebhookValue.trim() || null,
                                            discordMentions: editSubMentionsValue.trim() || null,
                                          })
                                          setEditingSubcategoryWebhook(null)
                                        }}
                                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors"
                                      >
                                        <Check size={12} /> Enregistrer
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <label className="text-[10px] font-medium text-white/50">Nom</label>
                                      <input
                                        type="text"
                                        value={editSubNameValue}
                                        onChange={(e) => setEditSubNameValue(e.target.value)}
                                        className="w-full bg-black/25 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-medium text-white/50">Webhook (Optionnel)</label>
                                      <input
                                        type="text"
                                        value={editSubWebhookValue}
                                        onChange={(e) => setEditSubWebhookValue(e.target.value)}
                                        className="w-full bg-black/25 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-medium text-white/50">Mentions à pinguer</label>
                                      <DiscordMentionsManager
                                        value={editSubMentionsValue}
                                        onChange={setEditSubMentionsValue}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Standard Subcategory Row */
                                <div className="flex items-center gap-3">
                                  <MessageCircle size={14} className="text-white/40 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white/80">{sub.name}</div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                      {sub.discordWebhook ? (
                                        <span className="text-[10px] text-emerald-400/90 truncate max-w-[200px] flex items-center gap-1">
                                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                                          Webhook personnalisé
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-white/20">Webhook hérité</span>
                                      )}
                                      {sub.discordMentions && (
                                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                                          <Users size={10} />
                                          {parseMentions(sub.discordMentions).length} pings
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingSubcategoryWebhook(sub.id)
                                        setEditSubNameValue(sub.name)
                                        setEditSubWebhookValue(sub.discordWebhook || '')
                                        setEditSubMentionsValue(sub.discordMentions || '')
                                      }}
                                      className="text-white/30 hover:text-white/75 p-1.5 hover:bg-white/5 rounded transition-colors"
                                      title="Modifier la sous-catégorie"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => deleteSubcategory(sub.id)}
                                      className="text-rose-400/50 hover:text-rose-400 p-1.5 hover:bg-white/5 rounded transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeCategoryForSub === cat.id ? (
                        /* Beautiful Subcategory Addition Form */
                        <div className="bg-black/35 border border-white/5 rounded-xl p-4 mt-3 space-y-4">
                          <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                            <Plus size={14} />
                            Nouvelle sous-catégorie
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="space-y-1 col-span-1 md:col-span-2">
                              <label className="text-[10px] font-medium text-white/50">Nom de la sous-catégorie</label>
                              <input
                                type="text"
                                placeholder="Ex: Facturation mensuelle, Problème Emby..."
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-white/50">Webhook Discord (optionnel)</label>
                              <input
                                type="text"
                                placeholder="Webhook spécifique à cette sous-catégorie"
                                value={newSubWebhook}
                                onChange={(e) => setNewSubWebhook(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-white/50">Mentions Discord à pinguer (optionnel)</label>
                              <DiscordMentionsManager
                                value={newSubMentions}
                                onChange={setNewSubMentions}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                            <button
                              onClick={() => setActiveCategoryForSub(null)}
                              className="text-white/40 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleAddSubcategory(cat.id)}
                              disabled={!newSubName.trim()}
                              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveCategoryForSub(cat.id)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors mt-2 p-1 hover:bg-indigo-500/5 rounded"
                        >
                          <Plus size={14} />
                          Ajouter une sous-catégorie
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
