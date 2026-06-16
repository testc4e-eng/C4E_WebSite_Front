import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone?: 'blue' | 'violet' | 'emerald' | 'amber';
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, { shell: string; icon: string }> = {
  blue: {
    shell: 'from-white via-blue-50/80 to-indigo-50/80 border-blue-100/80',
    icon: 'bg-blue-100 text-blue-600',
  },
  violet: {
    shell: 'from-white via-violet-50/80 to-indigo-50/80 border-violet-100/80',
    icon: 'bg-violet-100 text-violet-600',
  },
  emerald: {
    shell: 'from-white via-emerald-50/80 to-teal-50/80 border-emerald-100/80',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  amber: {
    shell: 'from-white via-amber-50/80 to-orange-50/80 border-amber-100/80',
    icon: 'bg-amber-100 text-amber-600',
  },
};

export default function StatCard({
  label,
  value,
  helper,
  icon,
  tone = 'blue',
}: StatCardProps) {
  const toneClass = toneClasses[tone];

  return (
    <Card
      className={cn(
        'rounded-[1.15rem] border bg-gradient-to-br shadow-sm shadow-slate-200/60 backdrop-blur-sm',
        toneClass.shell
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl', toneClass.icon)}>
          {icon}
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}
