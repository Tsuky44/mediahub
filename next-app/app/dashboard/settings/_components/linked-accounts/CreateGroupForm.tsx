'use client'

interface CreateGroupFormProps {
  newGroupName: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function CreateGroupForm({ newGroupName, onChange, onSubmit, onCancel }: CreateGroupFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-center animate-fade-in"
    >
      <input
        type="text"
        value={newGroupName}
        onChange={e => onChange(e.target.value)}
        placeholder="Nom du groupe (ex: Mathis)"
        className="flex-1 bg-black/40 border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        autoFocus
      />
      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
        Créer
      </button>
      <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">
        Annuler
      </button>
    </form>
  )
}
