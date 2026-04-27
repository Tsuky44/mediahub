interface MediaPosterImageProps {
  posterUrl: string
  alt: string
}

export default function MediaPosterImage({
  posterUrl,
  alt,
}: MediaPosterImageProps) {
  return (
    <div className="flex-shrink-0 mx-auto md:mx-0 w-full md:w-auto flex justify-center md:block">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.02] group-hover:rotate-1 w-[220px] sm:w-[320px]">
          <img
            src={posterUrl}
            alt={alt}
            className="w-full h-auto aspect-[2/3] object-cover"
          />
        </div>
      </div>
    </div>
  )
}
