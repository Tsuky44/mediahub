'use client'

import { Edit2, Layers, Trash } from 'lucide-react'
import clsx from 'clsx'

import type { DockerGroup } from '../../_types/docker'
import GroupEditForm from './GroupEditForm'

interface GroupRowProps {
    group: DockerGroup
    isEditing: boolean
    canManage: boolean
    isLoading: boolean
    editingName: string | null
    onEdit: (group: DockerGroup) => void
    onDelete: (groupId: string) => void
    onConfirmEdit: (groupId: string, name: string) => void
    onCancelEdit: () => void
    onEditNameChange: (name: string) => void
}

export default function GroupRow({
    group,
    isEditing,
    canManage,
    isLoading,
    editingName,
    onEdit,
    onDelete,
    onConfirmEdit,
    onCancelEdit,
    onEditNameChange,
}: GroupRowProps) {
    return (
        <div
            className={clsx(
                'group/card relative rounded-3xl transition-all duration-300 backdrop-blur-md overflow-hidden',
                isEditing
                    ? 'bg-indigo-500/10 border border-indigo-500/30 p-5 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/20'
                    : 'bg-black/20 border border-white/5 p-5 hover:border-indigo-500/20 hover:bg-white/[0.03] hover:shadow-2xl hover:shadow-indigo-500/5'
            )}
        >
            <div
                className={clsx(
                    'absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none',
                    'bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent'
                )}
            />

            {isEditing ? (
                <GroupEditForm
                    groupId={group.id}
                    name={editingName ?? group.name}
                    isLoading={isLoading}
                    onNameChange={onEditNameChange}
                    onConfirm={onConfirmEdit}
                    onCancel={onCancelEdit}
                />
            ) : (
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-5">
                        <div
                            className={clsx(
                                'w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg transition-all duration-300',
                                'bg-black/40 border-white/5 group-hover/card:border-indigo-500/30 group-hover/card:bg-indigo-500/10'
                            )}
                        >
                            <Layers className="w-7 h-7 text-gray-500 group-hover/card:text-indigo-400 transition-colors duration-300" />
                        </div>
                        <div>
                            <h3 className="font-black text-lg transition-colors duration-300 text-white group-hover/card:text-indigo-100">
                                {group.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span
                                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all duration-300 bg-white/5 border-white/5 text-gray-400 group-hover/card:bg-indigo-500/10 group-hover/card:border-indigo-500/20 group-hover/card:text-indigo-300"
                                >
                                    {group.members.length} conteneurs
                                </span>
                            </div>
                        </div>
                    </div>

                    {canManage && (
                        <div className="flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/card:translate-x-0">
                            <button
                                onClick={() => onEdit(group)}
                                className="p-2.5 bg-white/5 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-300 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDelete(group.id)}
                                className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl border border-white/5 hover:border-red-500/30 transition-all"
                            >
                                <Trash className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
