import React, { useState } from 'react';
import { TaskLog, analyticsApi } from '../../lib/api-analytics';
import { X, Check, AlertCircle } from 'lucide-react';

interface ValidationPanelProps {
  task: TaskLog;
  onClose: () => void;
  onSuccess: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ task, onClose, onSuccess }) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const estimatedHours = Number(task.estimated_hours ?? task.duration_hours ?? 0);
  const actualHours = Number(task.duration_hours || 0);
  const hoursGap = Number((actualHours - estimatedHours).toFixed(2));

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'approve') {
        await analyticsApi.approveTask(task.id, comment);
      } else {
        if (!comment.trim()) {
          throw new Error("Un commentaire est obligatoire pour demander une correction.");
        }
        await analyticsApi.requestCorrection(task.id, comment);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">
            Validation de la tâche : {task.task_title}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAction} className="p-6 space-y-4">
          <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm mb-4">
            <p><strong>Collaborateur :</strong> {task.user_name}</p>
            <p><strong>Projet :</strong> {task.project_name || task.project_id}</p>
            <p><strong>Durée estimée :</strong> {estimatedHours.toFixed(2)} h</p>
            <p><strong>Temps réel :</strong> {actualHours.toFixed(2)} h</p>
            <p><strong>Écart :</strong> <span className={hoursGap >= 0 ? 'text-rose-600' : 'text-emerald-600'}>{hoursGap.toFixed(2)} h</span></p>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Observation / remarque</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-800">
                {task.task_description?.trim() || 'Aucune observation renseignée.'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Temps déclaré</p>
              <p className="mt-1 text-gray-800">{actualHours.toFixed(2)} h</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sous-tâches réalisées</p>
              {Array.isArray(task.subtasks) && task.subtasks.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {task.subtasks.map((subtask, index) => (
                    <div key={subtask.id || `${index}`} className="rounded-md border border-gray-200 bg-white px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-800">{subtask.title}</p>
                          {subtask.description ? (
                            <p className="mt-1 whitespace-pre-wrap text-gray-600">{subtask.description}</p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          {subtask.status || 'en_cours'}
                        </span>
                      </div>
                      {subtask.duration_hours != null ? (
                        <p className="mt-2 text-xs text-gray-500">{Number(subtask.duration_hours)} h</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-gray-500">Aucune sous-tâche renseignée.</p>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setMode('approve')}
              className={`flex-1 py-2 px-4 rounded-md border flex items-center justify-center gap-2 transition-colors ${
                mode === 'approve' 
                  ? 'bg-green-50 border-green-500 text-green-700 font-medium' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Check className="w-4 h-4" /> Approuver
            </button>
            <button
              type="button"
              onClick={() => setMode('reject')}
              className={`flex-1 py-2 px-4 rounded-md border flex items-center justify-center gap-2 transition-colors ${
                mode === 'reject' 
                  ? 'bg-red-50 border-red-500 text-red-700 font-medium' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-4 h-4" /> Demander correction
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Commentaire {mode === 'reject' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              required={mode === 'reject'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                mode === 'reject' ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              placeholder={mode === 'approve' ? "Optionnel..." : "Précisez ce qui doit être corrigé..."}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md flex items-center gap-2 ${
                mode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Traitement...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
