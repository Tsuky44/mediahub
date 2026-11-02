interface MediaBackdropProps {
  backdropUrl: string | null
  alt: string
}

/**
 * Image de fond de la fiche, bord à bord : elle passe sous la barre de navigation
 * (verre flouté) et se fond dans la page en bas et à gauche, derrière le titre.
 */
export default function MediaBackdrop({
  backdropUrl,
  alt,
}: MediaBackdropProps) {
  return (
    // data-onyx-backdrop : l'affiche cliquée s'y pose en arrivant (MotionDirector, envol)
    <div data-onyx-backdrop className="absolute inset-x-0 top-0 h-[70vh] md:h-[88vh] overflow-hidden z-0 pointer-events-none">
      {backdropUrl && (
        // lazy : React n'attend pas son décodage pour afficher la fiche ; elle reste chargée
        // en priorité (dans l'écran dès l'arrivée)
        <img
          loading="lazy"
          fetchPriority="high"
          src={backdropUrl}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-[center_25%] opacity-80 animate-onyx-kenburns"
        />
      )}
      {/* Vignettage et fondus (titre lisible à gauche, raccord sous la barre et avec la page) :
          un seul calque (globals.css, onyx-backdrop-shade), léger à faire apparaître */}
      <div className="onyx-backdrop-shade" />
    </div>
  )
}
