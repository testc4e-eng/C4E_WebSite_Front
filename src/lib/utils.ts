// Importation de 'clsx' pour combiner des classes CSS conditionnellement
// 'ClassValue' est le type accepté par clsx (string, array, objet, etc.)
import { clsx, type ClassValue } from "clsx"

// Importation de 'twMerge' pour fusionner proprement des classes Tailwind conflictuelles
import { twMerge } from "tailwind-merge"

// Fonction utilitaire 'cn' pour combiner des classes CSS
export function cn(...inputs: ClassValue[]) {
  // clsx combine les classes conditionnelles en une seule string
  // twMerge fusionne ensuite les classes Tailwind conflictuelles
  return twMerge(clsx(inputs))
}