import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarItemProps {
  label: string;
  path: string;
  icon: React.ReactNode;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  subItem?: boolean;
  badgeCount?: number;
}

function SidebarItemLink({
  label,
  path,
  icon,
  active = false,
  collapsed = false,
  onClick,
  subItem = false,
  badgeCount = 0,
}: SidebarItemProps) {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'group relative flex items-center overflow-hidden rounded-2xl border text-sm font-medium transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2',
        collapsed ? 'h-12 justify-center px-0' : subItem ? 'gap-2 px-3 py-2.5 ml-10 text-xs' : 'gap-3 px-3.5 py-3',
        active
          ? 'border-indigo-500/20 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200/70'
          : 'border-transparent text-slate-600 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-sm hover:shadow-indigo-100/80'
      )}
    >
      <span
        className={cn(
          subItem ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200' : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
          active
            ? 'bg-white/18 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600'
        )}
      >
        {icon}
      </span>

      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badgeCount > 0 ? (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}

      {active && <span className={cn('absolute right-2 w-1 rounded-full bg-white/70', collapsed ? 'inset-y-3' : 'inset-y-2')} />}
    </Link>
  );
}

export default function SidebarItem(props: SidebarItemProps) {
  if (!props.collapsed) {
    return <SidebarItemLink {...props} />;
  }

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <SidebarItemLink {...props} />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-lg"
        >
          {props.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
