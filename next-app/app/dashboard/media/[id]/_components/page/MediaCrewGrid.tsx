interface MediaCrewGridProps {
  director?: string
  writers: string[]
  editors: string[]
}

export default function MediaCrewGrid({
  director,
  writers,
  editors,
}: MediaCrewGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4 pt-4">
      {director && (
        <div>
          <h4 className="font-bold text-white text-sm">Réalisateur</h4>
          <p className="text-gray-400 text-sm">{director}</p>
        </div>
      )}
      {writers.length > 0 &&
        writers.map((w, i) => (
          <div key={i}>
            <h4 className="font-bold text-white text-sm">Scénario</h4>
            <p className="text-gray-400 text-sm">{w}</p>
          </div>
        ))}
      {editors.length > 0 &&
        editors.map((e, i) => (
          <div key={i}>
            <h4 className="font-bold text-white text-sm">Montage</h4>
            <p className="text-gray-400 text-sm">{e}</p>
          </div>
        ))}
    </div>
  )
}
