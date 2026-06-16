import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPIBoxProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'indigo' | 'purple';
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-700' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', text: 'text-green-700' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',     text: 'text-red-700' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-700' },
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-700' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
};

const KPIBox: React.FC<KPIBoxProps> = ({ icon: Icon, label, value, subtitle, color = 'blue' }) => {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} rounded-xl shadow-md p-4 border border-white/60 transition-shadow duration-200 hover:shadow-lg`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${c.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className={`text-xl font-bold leading-none ${c.text}`}>{value}</p>
          {subtitle && <p className="mt-1 text-[11px] text-gray-400 leading-tight">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default KPIBox;
