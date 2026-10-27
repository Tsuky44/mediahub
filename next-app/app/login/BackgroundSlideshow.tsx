'use client'

import { useState, useEffect } from 'react'

export default function BackgroundSlideshow({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!images || images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 10000) // 10 secondes par image

    return () => clearInterval(interval)
  }, [images])

  if (!images || images.length === 0) return null

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {images.map((src, index) => {
        const isActive = index === currentIndex
        
        return (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
            style={{
              backgroundImage: `url(${src})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              // On utilise une opacité de 0.7 max pour que l'image soit déjà un peu sombre de base
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 1 : 0,
              // Lent travelling avant pendant les 10 s où l'image est affichée
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transitionProperty: 'opacity, transform',
              transitionDuration: isActive ? '2000ms, 12000ms' : '2000ms, 0ms',
              transitionTimingFunction: 'ease-in-out, linear',
            }}
          />
        )
      })}
    </div>
  )
}
