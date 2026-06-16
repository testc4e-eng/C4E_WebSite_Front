import React from 'react';

type Status = 'draft' | 'in_progress' | 'completed' | 'submitted' | 'validated' | 'manager_validated' | 'to_correct' | 'closed';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; colorClass: string }> = {
  draft: { label: 'Brouillon', colorClass: 'bg-gray-100 text-gray-800 border-gray-200' },
  in_progress: { label: 'En cours', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Terminée', colorClass: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  submitted: { label: 'Soumis', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  validated: { label: 'Validé', colorClass: 'bg-green-100 text-green-800 border-green-200' },
  manager_validated: { label: 'Validé manager', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  to_correct: { label: 'À corriger', colorClass: 'bg-red-100 text-red-800 border-red-200' },
  closed: { label: 'Clôturé', colorClass: 'bg-purple-100 text-purple-800 border-purple-200' }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.colorClass} ${className}`}>
      {config.label}
    </span>
  );
};
