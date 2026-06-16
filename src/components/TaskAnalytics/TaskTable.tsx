import React from 'react';
import { TaskLog } from '../../lib/api-analytics';
import { StatusBadge } from './StatusBadge';
import { Edit2, AlertCircle, Lock, Trash2 } from 'lucide-react';
import { formatDateForDisplay } from '../../lib/date';

interface TaskTableProps {
  tasks: TaskLog[];
  onEdit?: (task: TaskLog) => void;
  onDelete?: (task: TaskLog) => void;
  readOnly?: boolean;
  currentUserId?: number | null;
  showComparativeHours?: boolean;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onEdit,
  onDelete,
  readOnly = false,
  currentUserId = null,
  showComparativeHours = true,
}) => {
  const getHourBreakdown = (task: TaskLog) => {
    const estimated = Number(task.estimated_hours ?? task.duration_hours ?? 0);
    const actual = Number(task.duration_hours || 0);
    return {
      estimated,
      actual,
      gap: Number((actual - estimated).toFixed(2)),
    };
  };

  const getTaskSource = (task: TaskLog) => {
    const ownerId = Number(task.user_id);
    const assigneeId = Number(task.assigned_to ?? task.user_id);
    const me = Number(currentUserId);

    if (Number.isFinite(me) && me > 0) {
      if (assigneeId === me && ownerId === me) {
        return {
          label: 'Creee par moi',
          tone: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      }
      if (assigneeId === me && ownerId !== me) {
        return {
          label: 'Affectee a moi',
          tone: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        };
      }
      if (ownerId === me && assigneeId !== me) {
        return {
          label: 'Creee pour l equipe',
          tone: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        };
      }
    }

    if (assigneeId !== ownerId) {
      return {
        label: 'Affectee par manager',
        tone: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    }

    return {
      label: 'Creee par moi',
      tone: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-gray-500">
        <p className="text-lg font-medium">Aucune tache enregistree</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tache</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Projet / Categorie</th>
            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
              {showComparativeHours ? 'Temps' : 'Temps realise'}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Statut</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {tasks.map((task) => {
            const hours = getHourBreakdown(task);
            return (
              <tr key={task.id} className="transition-colors hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                  {formatDateForDisplay(task.task_date)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    {task.task_title}
                    {task.is_blocking && (
                      <span title={`Bloquant: ${task.blocking_reason || ''}`}>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(() => {
                      const source = getTaskSource(task);
                      return (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${source.tone}`}>
                          {source.label}
                        </span>
                      );
                    })()}
                  </div>
                  {task.task_description && <div className="mt-1 text-xs text-gray-500">{task.task_description}</div>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.is_blocking && (
                      <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        Tache bloquante
                      </span>
                    )}
                    {(task.is_delay_risk || task.has_delay_risk) && (
                      <span className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                        Risque de retard
                      </span>
                    )}
                    {(task.is_automation_candidate || task.automation_candidate) && (
                      <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                        Candidat a l'automatisation
                      </span>
                    )}
                  </div>
                  {task.validation_comment && task.status === 'to_correct' && (
                    <div className="mt-1 inline-block rounded border border-red-100 bg-red-50 p-1 text-xs text-red-600">
                      Motif de correction : {task.validation_comment}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div>{task.project_name || `Projet #${task.project_id}`}</div>
                  <div className="text-xs text-gray-500">
                    {task.mission_name || task.project_module_name || 'Mission non liee'}
                  </div>
                  <div className="text-xs text-gray-500">{task.category_name || `Categorie #${task.category_id}`}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-center text-xs text-gray-700">
                  {showComparativeHours ? (
                    <div className="inline-flex flex-col items-center gap-0.5 rounded-lg bg-slate-50 px-2.5 py-2">
                      <span className="font-medium text-slate-500">Est. {hours.estimated.toFixed(2)} h</span>
                      <span className="font-semibold text-slate-900">Reel {hours.actual.toFixed(2)} h</span>
                      <span className={`font-semibold ${hours.gap >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Ecart {hours.gap.toFixed(2)} h
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                      Temps realise {hours.actual.toFixed(2)} h
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                  {readOnly || !['draft', 'in_progress', 'completed', 'to_correct'].includes(task.status) ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
                      <Lock className="h-3.5 w-3.5" />
                      Verrouille
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => onEdit && onEdit(task)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 transition-colors hover:bg-blue-100"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                        Modifier
                      </button>
                      {onDelete ? (
                        <button
                          onClick={() => onDelete(task)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-red-700 transition-colors hover:bg-red-100"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
