interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}

export default function PageHeader({ title, description, actions, compact = false }: PageHeaderProps) {
  return (
    <div className={compact ? 'mb-5' : 'mb-8'}>
      <div className={`flex flex-col gap-4 rounded-[1.75rem] border border-white/70 bg-white/65 shadow-sm shadow-slate-200/60 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between ${compact ? 'px-4 py-3.5 lg:px-5' : 'px-5 py-5 lg:px-6'}`}>
        <div>
          <h1 className={`${compact ? 'text-2xl' : 'text-3xl'} font-semibold tracking-tight text-slate-900`}>{title}</h1>
          {description && <p className={`${compact ? 'mt-1 text-xs sm:text-sm' : 'mt-1.5 text-sm'} leading-6 text-slate-500`}>{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
