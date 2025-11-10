// Importation de React pour pouvoir utiliser JSX et créer des composants React
import * as React from "react"

// Importation de la bibliothèque Radix UI pour les composants checkbox accessibles
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"

// Importation de l'icône Check depuis la bibliothèque lucide-react
import { Check } from "lucide-react"

// Importation d'une fonction utilitaire 'cn' pour combiner des classes CSS conditionnellement
import { cn } from "@/lib/utils"

// Création d'un composant Checkbox réutilisable avec support de ref
const Checkbox = React.forwardRef<

  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
