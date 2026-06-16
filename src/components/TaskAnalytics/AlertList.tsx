import React from 'react';
import { AlertTriangle, Clock3, Cpu } from 'lucide-react';
import type { BlockingTask, TaskAlert } from '../../lib/api-analytics';
import { formatDateForDisplay } from '../../lib/date';

interface AlertListProps {
  alerts: Array<BlockingTask | TaskAlert>;
  loading?: boolean;
  maxItems?: number;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, loading = false, maxItems = 10 }) => {
  const getAccent = (alert: BlockingTask | TaskAlert) => {
    switch ((alert as TaskAlert).alert_type) {
      case 'DELAY_RISK':
        return {
          wrap: 'bg-orange-50 border-orange-100',
          icon: 'text-orange-500',
          pill: 'bg-orange-100 text-orange-700',
          label: 'Risque de retard',
          iconNode: Clock3,
        };
      case 'AUTOMATION_CANDIDATE':
        return {
          wrap: 'bg-indigo-50 border-indigo-100',
          icon: 'text-indigo-500',
          pill: 'bg-indigo-100 text-indigo-700',
          label: 'Automatisation',
          iconNode: Cpu,
        };
      case 'BLOCKING_TASK':
      default:
        return {
          wrap: 'bg-red-50 border-red-100',
          icon: 'text-red-500',
          pill: 'bg-red-100 text-red-700',
          label: 'Bloquante',
          iconNode: AlertTriangle,
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
        <span className="ml-3 text-gray-500">Chargement des alertes...</span>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-green-400" />
        <p className="text-sm">Aucune alerte active</p>
      </div>
    );
  }

  const displayed = alerts.slice(0, maxItems);

  return (
    <div className="space-y-3">
      {displayed.map((alert) => {
        const accent = getAccent(alert);
        const Icon = accent.iconNode;
        const taskAlert = alert as TaskAlert;
        const dateValue = taskAlert.task_date || (alert as BlockingTask).task_date;
        const title = taskAlert.task_title || (alert as BlockingTask).task_title || 'Alerte';
        const projectName = taskAlert.project_name || (alert as BlockingTask).project_name || 'Projet inconnu';
        const userName = taskAlert.user_name || (alert as BlockingTask).user_name || '';
        const message = taskAlert.message || (alert as BlockingTask).blocking_reason || '';

        return (
          <div
            key={alert.id}
            className={`flex items-start space-x-3 p-3 border rounded-lg ${accent.wrap}`}
          >
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${accent.icon}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                {taskAlert.alert_type && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${accent.pill}`}>
                    {accent.label}
                  </span>
                )}
                {typeof taskAlert.is_read === 'boolean' && !taskAlert.is_read && (
                  <span className="h-2 w-2 rounded-full bg-blue-500" title="Non lu" />
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {projectName}{userName ? ` - ${userName}` : ''}
              </p>
              <p className="text-xs text-gray-600 mt-1">{message || 'Aucune description'}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatDateForDisplay(dateValue)}
            </span>
          </div>
        );
      })}
      {alerts.length > maxItems && (
        <p className="text-xs text-gray-400 text-center">
          +{alerts.length - maxItems} autres alertes
        </p>
      )}
    </div>
  );
};

export default AlertList;
