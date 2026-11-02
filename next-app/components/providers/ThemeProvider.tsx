'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isThemeId,
  type ThemeId,
} from '@/lib/theme'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)

  useEffect(() => {
    // L'attribut a déjà été posé par le script inline du layout, avant le
    // premier paint. On ne fait que relire pour aligner l'état React dessus :
    // c'est le DOM qui fait foi, pas ce state.
    const applied = document.documentElement.getAttribute('data-theme')
    if (isThemeId(applied)) setThemeState(applied)
  }, [])

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Navigation privée ou stockage refusé : le thème s'applique quand même
      // pour la session en cours, il ne sera simplement pas retenu.
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
