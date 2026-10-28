'use client'

import React, { useState, useEffect } from 'react'

interface RequestPosterProps {
  src: string | null
  alt: string
  fallbackSrc?: string | null
  placeholder: React.ReactNode
}

export function RequestPoster({ src, alt, fallbackSrc, placeholder }: RequestPosterProps) {
  const [error, setError] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const [imgSrc, setImgSrc] = useState<string | null>(src)

  useEffect(() => {
    setImgSrc(src)
    setError(false)
    setUsingFallback(false)
  }, [src])

  const handleError = () => {
    if (!usingFallback && fallbackSrc && fallbackSrc !== src) {
      setUsingFallback(true)
      setImgSrc(fallbackSrc)
    } else {
      setError(true)
    }
  }

  if (!imgSrc || error) {
    return <>{placeholder}</>
  }

  return (
    <img
      loading="lazy"
      decoding="async"
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className="h-full w-full object-cover"
    />
  )
}
