import React from 'react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  actions?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  loading = false,
  empty = false,
  emptyMessage = 'Aucune donnée disponible',
  className = '',
  actions,
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {actions && <div>{actions}</div>}
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            <span className="ml-3 text-gray-500">Chargement...</span>
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ChartCard;
