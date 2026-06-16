import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarFooterProps {
  collapsed: boolean;
}

function FooterContent({ collapsed }: SidebarFooterProps) {
  const { user } = useAuth();

  const initials = (user?.nom || user?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      to="/profile"
      className={cn(
        'group flex items-center rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm shadow-slate-200/50 transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-50 hover:text-indigo-700',
        collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-semibold text-white shadow-sm">
        {initials}
      </div>

      {!collapsed && (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{user?.nom || user?.email || 'Utilisateur'}</p>
            <p className="truncate text-xs text-slate-400">Parametres et profil</p>
          </div>
          <Settings2 className="h-4 w-4 text-slate-400 transition-colors group-hover:text-indigo-600" />
        </>
      )}
    </Link>
  );
}

export default function SidebarFooter({ collapsed }: SidebarFooterProps) {
  if (!collapsed) {
    return (
      <div className="border-t border-slate-200/80 p-3">
        <FooterContent collapsed={false} />
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200/80 p-3">
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <FooterContent collapsed />
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-lg"
          >
            Mon Profil
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
