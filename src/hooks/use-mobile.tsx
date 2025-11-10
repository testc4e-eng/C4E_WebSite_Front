// Importation de React pour utiliser les hooks et JSX
import * as React from "react"

// Définition d'un point de rupture pour mobile (768px)
const MOBILE_BREAKPOINT = 768

// Hook personnalisé pour savoir si l'écran est mobile ou non
export function useIsMobile() {
  // État local : true si mobile, false sinon, undefined initialement
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Création d'un MediaQueryList pour détecter les écrans plus petits que MOBILE_BREAKPOINT
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    // Fonction appelée quand la taille de l'écran change
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT) // Met à jour l'état selon la largeur actuelle
    }

    // Ajout du listener pour les changements de taille
    mql.addEventListener("change", onChange)

    // Définition initiale de l'état dès le premier rendu
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // Nettoyage : suppression du listener à la destruction du composant
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Retourne un booléen définitif (true si mobile, false sinon)
  return !!isMobile
}
