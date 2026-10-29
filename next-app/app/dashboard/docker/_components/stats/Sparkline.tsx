'use client'

import { useId } from 'react'

interface SparklineProps {
    /** Valeurs les plus anciennes en premier. */
    values: number[]
    /** Couleur du tracé (n'importe quelle couleur CSS). */
    color: string
    /** Borne haute forcée. Sans elle, l'échelle suit le maximum observé. */
    max?: number
    height?: number
    label: string
}

/**
 * Courbe compacte d'une série temporelle.
 *
 * L'échelle démarre toujours à zéro : un graphe qui recadre sur l'amplitude
 * observée fait passer une oscillation de 2 % pour une envolée.
 */
export function Sparkline({ values, color, max, height = 44, label }: SparklineProps) {
    const gradientId = useId()

    if (values.length < 2) {
        return (
            <div
                className="flex items-center justify-center text-[10px] text-gray-600 font-medium"
                style={{ height }}
            >
                Mesure en cours...
            </div>
        )
    }

    const width = 100
    const ceiling = Math.max(max ?? 0, ...values, 1)
    const step = width / (values.length - 1)

    const points = values.map((value, i) => {
        const x = i * step
        const y = height - (Math.min(value, ceiling) / ceiling) * height
        return `${x.toFixed(2)},${y.toFixed(2)}`
    })

    const line = `M ${points.join(' L ')}`
    const area = `${line} L ${width},${height} L 0,${height} Z`

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height }}
            role="img"
            aria-label={label}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            <path d={area} fill={`url(#${gradientId})`} />
            <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}
