import { useState } from 'react';
import { Save, Settings2, Mail, CalendarDays } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

export default function PlatformSettingsPage() {
  const [form, setForm] = useState({
    platformName: 'C4E Africa Workspace',
    systemEmail: 'noreply@c4e-africa.com',
    hrEmail: 'rh@c4e-africa.com',
    defaultProjectDuration: '6',
    notificationsEnabled: true,
    logoUrl: '',
    description: 'Paramètres techniques de la plateforme.',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres Plateforme"
        description="Configuration générale, RH, projets et notifications système."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Configuration générale</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Nom plateforme</Label>
              <Input className="mt-2" value={form.platformName} onChange={(e) => setForm((current) => ({ ...current, platformName: e.target.value }))} />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input className="mt-2" value={form.logoUrl} onChange={(e) => setForm((current) => ({ ...current, logoUrl: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-2" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Emails et modules</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Email système</Label>
              <Input className="mt-2" value={form.systemEmail} onChange={(e) => setForm((current) => ({ ...current, systemEmail: e.target.value }))} />
            </div>
            <div>
              <Label>Email RH</Label>
              <Input className="mt-2" value={form.hrEmail} onChange={(e) => setForm((current) => ({ ...current, hrEmail: e.target.value }))} />
            </div>
            <div>
              <Label>Durée par défaut des projets (mois)</Label>
              <Input className="mt-2" type="number" min="1" value={form.defaultProjectDuration} onChange={(e) => setForm((current) => ({ ...current, defaultProjectDuration: e.target.value }))} />
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <CalendarDays className="mr-2 inline h-4 w-4 text-slate-400" />
              Les statuts projets et notifications restent configurables depuis les modules métiers.
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Save className="h-4 w-4" />
          Enregistrer
        </button>
      </div>
    </div>
  );
}
