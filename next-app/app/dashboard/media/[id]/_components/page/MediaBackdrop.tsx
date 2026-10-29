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
      {/* Vignettage léger, comme un écran de cinéma (sous les fondus : le bas
          rejoint exactement la couleur de la page) */}
      <div className="absolute inset-0 shadow-[inset_0_0_180px_rgb(0_0_0/0.55)]" />
      {/* Lisibilité du titre et des boutons, à gauche (sur mobile, le texte est
          sous l'image : seul le fondu du bas est utile) */}
      <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-[#0c0d0d] via-[#0c0d0d]/75 to-transparent md:w-[70%]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d0d]/50 to-transparent" />
      {/* Haut : l'image se fond sous la barre de navigation */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#0c0d0d]/85 to-transparent" />
      {/* Bas : raccord avec le contenu de la page */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d0d] via-[#0c0d0d]/55 to-transparent" />
    </div>
  )
}
