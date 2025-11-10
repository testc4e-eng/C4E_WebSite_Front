// Import React pour utiliser les hooks et types
import * as React from "react"

// Import des types pour les toasts (props et action)
import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

// Constantes de configuration
const TOAST_LIMIT = 1 // Nombre maximum de toasts affichés simultanément
const TOAST_REMOVE_DELAY = 1000000 // Délai avant suppression automatique (ms)

// Type représentant un toast dans notre système, avec id unique
type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

// Types d'action pour notre reducer
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

// Compteur pour générer des IDs uniques
let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

// Type des actions possibles dans le reducer
type ActionType = typeof actionTypes
type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] }

// État du store toast
interface State {
  toasts: ToasterToast[]
}

// Map pour stocker les timeouts de suppression automatique des toasts
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

// Ajoute un toast à la file de suppression après TOAST_REMOVE_DELAY
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

// Reducer pour gérer les toasts (ajout, mise à jour, dismissal, suppression)
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Ajoute un toast en début de liste et limite le nombre de toasts
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      // Met à jour les propriétés d'un toast existant
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // Side effect: planifie la suppression après un délai
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => addToRemoveQueue(toast.id))
      }

      // Ferme les toasts concernés (open = false)
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      }
    }

    case "REMOVE_TOAST":
      // Supprime définitivement les toasts
      if (action.toastId === undefined) {
        return { ...state, toasts: [] }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// Liste de listeners pour notifier les composants abonnés
const listeners: Array<(state: State) => void> = []

// État global en mémoire
let memoryState: State = { toasts: [] }

// Dispatch pour mettre à jour l'état global et notifier les listeners
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

// Type simplifié pour créer un toast (sans l'ID)
type Toast = Omit<ToasterToast, "id">

// Fonction pour créer un toast
function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return { id, dismiss, update }
}

// Hook React pour utiliser les toasts dans un composant
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    // Abonne le composant aux changements de l'état global
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

// Export des fonctions
export { useToast, toast }
