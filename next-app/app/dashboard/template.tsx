/**
 * Remonté à chaque navigation : joue l'entrée de page (fondu du contenu, mise au
 * point du titre). Animation CSS seule, voir app/motion.css.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="onyx-page">{children}</div>
}
