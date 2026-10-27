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
      <div className="absolute top-0 left-0 w-full h-[70vh] overflow-hidden z-0 pointer-events-none bg-gradient-to-b from-[#0c0d0d] to-[#0c0d0d]" />
    )
  }
  return (
    <div className="absolute top-0 left-0 w-full h-[65vh] md:h-[80vh] overflow-hidden z-0 pointer-events-none">
      <img
        src={backdropUrl}
        alt={alt}
        className="absolute right-0 top-0 w-full md:w-[75%] h-full object-cover opacity-75 animate-onyx-kenburns"
      />
      {/* Deep dark blue/black gradient blending on the left for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d0d] via-[#0c0d0d]/95 to-transparent w-full md:w-[60%]"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d0d] via-[#0c0d0d]/45 to-transparent"></div>
      {/* Bottom fade blending into the main page content */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d0d] via-[#0c0d0d]/50 to-transparent"></div>
    </div>
  )
}
