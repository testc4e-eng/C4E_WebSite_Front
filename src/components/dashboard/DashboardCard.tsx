import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  accentClass: string;
  iconClass: string;
  badge?: string;
}

export default function DashboardCard({
  title,
  description,
  path,
  icon,
  accentClass,
  iconClass,
  badge,
}: DashboardCardProps) {
  return (
    <Link to={path} className="group block h-full">
      <Card
        className={cn(
          'relative h-full overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/80 shadow-md shadow-slate-200/70 backdrop-blur-sm transition-all duration-300',
          'hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100/80'
        )}
      >
        <div className={cn('h-1.5 w-full', accentClass)} />
        <CardContent className="flex h-full flex-col gap-4 p-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm', iconClass)}>
              {icon}
            </div>
            <div className="flex items-center gap-2">
              {badge && (
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
                  {badge}
                </span>
              )}
              <span className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-400 transition-colors group-hover:text-indigo-600">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              {description}
            </CardDescription>
          </div>

          <div className="mt-auto flex items-center justify-between text-sm font-medium text-slate-400 transition-colors group-hover:text-indigo-600">
            <span>Ouvrir</span>
            <span className="mx-3 h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
            <span>Acces rapide</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
