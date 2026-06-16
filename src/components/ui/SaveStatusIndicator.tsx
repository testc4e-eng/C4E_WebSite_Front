// ==============================================
// Fichier : components/ui/SaveStatusIndicator.tsx
// Indicateur de sauvegarde : idle / saving / saved / error
// ==============================================

import { Check, Loader2, AlertCircle } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  errorMessage?: string;
}

export default function SaveStatusIndicator({ status, errorMessage }: SaveStatusIndicatorProps) {
  if (status === 'idle') return null;

  const config = {
    saving: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: 'Sauvegarde en cours…',
      className: 'text-blue-600 bg-blue-50',
    },
    saved: {
      icon: <Check className="w-4 h-4" />,
      label: 'Sauvegardé ✓',
      className: 'text-green-600 bg-green-50',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: errorMessage || 'Erreur de sauvegarde',
      className: 'text-red-600 bg-red-50',
    },
  }[status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </div>
  );
}
