import { Link } from 'react-router-dom';
import { ChevronsLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarHeaderProps {
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapsed?: () => void;
}

export default function SidebarHeader({
  collapsed,
  onClose,
  onToggleCollapsed,
}: SidebarHeaderProps) {
  return (
    <div className={cn('border-b border-slate-200/80 px-3 py-4', collapsed ? 'items-center' : 'px-4')}>
      <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between gap-3')}>
        <Link
          to="/dashboard/personnel"
          className={cn(
            'group flex min-w-0 items-center rounded-2xl transition-transform duration-200 hover:scale-[1.02]',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
            <img src="/logo.png" alt="C4E Africa" className="h-8 w-8 object-contain" />
          </div>

          <div
            className={cn(
              'min-w-0 overflow-hidden transition-all duration-300',
              collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
            )}
          >
            <p className="truncate text-sm font-semibold text-slate-900">C4E Africa</p>
            <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          </div>
        </Link>

        <button
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {onToggleCollapsed && (
        <div className={cn('mt-4 flex', collapsed ? 'justify-center' : 'justify-end')}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            className="hidden rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-50 hover:text-indigo-600 lg:inline-flex"
            aria-label={collapsed ? 'Etendre la sidebar' : 'Reduire la sidebar'}
          >
            <ChevronsLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </Button>
        </div>
      )}
    </div>
  );
}
