interface MediaBackdropProps {
  backdropUrl: string | null
  alt: string
}

export default function MediaBackdrop({
  backdropUrl,
  alt,
}: MediaBackdropProps) {
  if (!backdropUrl) {
    return (
      <div className="fixed inset-0 h-screen w-full overflow-hidden z-0 pointer-events-none" />
    )
  }
  return (
    <div className="fixed inset-0 h-screen w-full overflow-hidden z-0 pointer-events-none">
      <img
        src={backdropUrl}
        alt={alt}
        className="h-full w-full object-cover opacity-40 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/40 to-transparent"></div>
      <div className="absolute inset-0 backdrop-blur-[1px]"></div>
    </div>
  )
}
