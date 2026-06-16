import { useMemo } from 'react';
import { Database, Download, ShieldAlert, ShieldCheck, History, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

export default function SecurityBackupPage() {
  const items = useMemo(
    () => [
      { label: 'Historique des connexions', value: '128', tone: 'from-sky-500 to-indigo-600' },
      { label: 'Actions sensibles', value: '24', tone: 'from-amber-500 to-orange-500' },
      { label: 'Exports réalisés', value: '6', tone: 'from-emerald-500 to-teal-600' },
      { label: 'Sauvegarde manuelle', value: 'Prête', tone: 'from-slate-700 to-slate-900' },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sécurité & Sauvegarde"
        description="Surveillance des accès, export des données et préparation des sauvegardes."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r ${item.tone} text-white`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-slate-900">Alertes sécurité</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">Aucune alerte critique active.</div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">Historique des connexions conservé sur 90 jours.</div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">Journaux sensibles disponibles pour audit.</div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Sauvegarde & export</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Export des données
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" />
              Sauvegarde manuelle
            </button>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <History className="mr-2 inline h-4 w-4 text-slate-400" />
            Les exports et backups peuvent être branchés sur les services d’infrastructure dès que le flux sera exposé.
          </div>
        </div>
      </div>
    </div>
  );
}
