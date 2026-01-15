'use client'

import { useState } from 'react'
import { X, User } from 'lucide-react'
import Link from 'next/link'

const DEPT_TRANSLATIONS: Record<string, string> = {
    "Directing": "Réalisation",
    "Writing": "Scénario",
    "Production": "Production",
    "Camera": "Image",
    "Editing": "Montage",
    "Art": "Direction Artistique",
    "Costume & Make-Up": "Costumes et Maquillage",
    "Sound": "Son",
    "Visual Effects": "Effets Visuels",
    "Crew": "Équipe Technique",
    "Lighting": "Lumière"
}

const JOB_TRANSLATIONS: Record<string, string> = {
    "Director": "Réalisateur",
    "Writer": "Scénariste",
    "Screenplay": "Scénariste",
    "Producer": "Producteur",
    "Executive Producer": "Producteur Délégué",
    "Editor": "Monteur",
    "Director of Photography": "Directeur de la Photographie",
    "Original Music Composer": "Compositeur",
    "Casting": "Casting",
    "Art Direction": "Direction Artistique",
    "Costume Design": "Costumes",
    "Make-up Artist": "Maquilleur",
    "Stunt Coordinator": "Coordinateur des Cascades"
}

interface CastMember {
    id: number
    name: string
    character?: string
    profile_path: string | null
}

interface CrewMember {
    id: number
    name: string
    job: string
    department: string
    profile_path: string | null
}

interface FullCreditsButtonProps {
    cast: CastMember[]
    crew: CrewMember[]
    children?: React.ReactNode
}

export default function FullCreditsButton({ cast, crew, children }: FullCreditsButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Group crew by department
    const departments = crew.reduce((acc, member) => {
        const dept = DEPT_TRANSLATIONS[member.department] || member.department
        if (!acc[dept]) {
            acc[dept] = []
        }
        acc[dept].push(member)
        return acc
    }, {} as Record<string, CrewMember[]>)

    return (
        <>
            {children ? (
                <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                    {children}
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1"
                >
                    Voir l'équipe complète <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1e293b] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-2xl font-bold text-white">Équipe complète</h2>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-12">
                            {/* Cast */}
                            <section>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <User className="w-5 h-5 text-indigo-400" />
                                    Acteurs ({cast.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {cast.map((actor) => (
                                        <Link 
                                            key={`${actor.id}-${actor.character}`} 
                                            href={`/dashboard/person/${actor.id}`}
                                            className="flex items-center gap-4 group hover:bg-white/5 p-2 rounded-xl transition"
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 border border-white/5">
                                                {actor.profile_path ? (
                                                    <img 
                                                        src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} 
                                                        alt={actor.name}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                        <User className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white text-sm group-hover:text-indigo-400 transition">{actor.name}</div>
                                                <div className="text-xs text-gray-400">{actor.character}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            {/* Crew by Department */}
                            {Object.entries(departments).sort(([a], [b]) => a.localeCompare(b)).map(([dept, members]) => (
                                <section key={dept}>
                                    <h3 className="text-xl font-bold text-white mb-6 border-l-4 border-indigo-500 pl-3">
                                        {dept} ({members.length})
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                        {members.map((member) => (
                                            <Link 
                                                key={`${member.id}-${member.job}`} 
                                                href={`/dashboard/person/${member.id}`}
                                                className="flex items-center gap-4 group hover:bg-white/5 p-2 rounded-xl transition"
                                            >
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 border border-white/5">
                                                    {member.profile_path ? (
                                                        <img 
                                                            src={`https://image.tmdb.org/t/p/w185${member.profile_path}`} 
                                                            alt={member.name}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                                    />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                                                            <User className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white text-sm group-hover:text-indigo-400 transition">{member.name}</div>
                                                    <div className="text-xs text-gray-400">{JOB_TRANSLATIONS[member.job] || member.job}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
