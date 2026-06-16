import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '../../lib/utils';

interface ActionIconButtonProps {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

export default function ActionIconButton({
  label,
  onClick,
  icon,
  className,
  type = 'button',
  ariaLabel,
}: ActionIconButtonProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type={type}
            onClick={onClick}
            aria-label={ariaLabel || label}
            title={label}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:scale-105 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
              className
            )}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="z-[9999] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xl">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
