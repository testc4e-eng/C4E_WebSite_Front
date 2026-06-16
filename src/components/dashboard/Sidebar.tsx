import SidebarHeader from './SidebarHeader';
import SidebarItem from './SidebarItem';
import SidebarFooter from './SidebarFooter';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: NavItem[];
  badgeCount?: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  items: NavItem[];
  isActivePath: (path: string) => boolean;
}

export default function Sidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapsed,
  items,
  isActivePath,
}: SidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const sectionsWithChildren = useMemo(
    () => items.filter((item) => item.children && item.children.length > 0),
    [items]
  );

  useEffect(() => {
    setOpenSections((current) => {
      const next = { ...current };
      sectionsWithChildren.forEach((item) => {
        const hasActiveChild = (item.children || []).some((child) => isActivePath(child.path));
        if (hasActiveChild) {
          next[item.path] = true;
        } else if (!(item.path in next)) {
          next[item.path] = false;
        }
      });
      return next;
    });
  }, [sectionsWithChildren, isActivePath]);

  const toggleSection = (path: string) => {
    setOpenSections((current) => ({ ...current, [path]: !current[path] }));
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-slate-200/80 bg-slate-50/95 shadow-xl shadow-slate-200/40 backdrop-blur-xl',
        'transform transition-[width,transform] duration-300 ease-out',
        'w-[var(--dashboard-sidebar-width-mobile)] lg:w-[var(--dashboard-sidebar-width-desktop)]',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <SidebarHeader collapsed={collapsed} onClose={onClose} onToggleCollapsed={onToggleCollapsed} />

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <nav className="space-y-3">
          {items.map((item) => (
            <div key={item.path} className="space-y-1">
              {item.children?.length ? (
                <button
                  type="button"
                  onClick={() => toggleSection(item.path)}
                  className={cn(
                    'group relative flex w-full items-center overflow-hidden rounded-2xl border text-sm font-medium transition-all duration-200 ease-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2',
                    collapsed ? 'h-12 justify-center px-0' : 'gap-3 px-3.5 py-3',
                    isActivePath(item.path) || item.children.some((child) => isActivePath(child.path))
                      ? 'border-indigo-500/20 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200/70'
                      : 'border-transparent text-slate-600 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-sm hover:shadow-indigo-100/80'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                      isActivePath(item.path) || item.children.some((child) => isActivePath(child.path))
                        ? 'bg-white/18 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600'
                    )}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && (item.badgeCount || 0) > 0 ? (
                    <span className="ml-auto mr-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {(item.badgeCount || 0) > 99 ? '99+' : item.badgeCount}
                    </span>
                  ) : null}
                  {!collapsed ? (
                    <span className={(item.badgeCount || 0) > 0 ? '' : 'ml-auto'}>
                      {openSections[item.path] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                  ) : null}
                </button>
              ) : (
                <SidebarItem
                  label={item.label}
                  path={item.path}
                  icon={item.icon}
                  active={isActivePath(item.path)}
                  collapsed={collapsed}
                  onClick={onClose}
                  badgeCount={item.badgeCount || 0}
                />
              )}
              {!collapsed && item.children?.length && openSections[item.path] ? (
                <div className="space-y-1">
                  {item.children.map((child) => (
                    <SidebarItem
                      key={child.path}
                      label={child.label}
                      path={child.path}
                      icon={child.icon}
                      active={isActivePath(child.path)}
                      collapsed={collapsed}
                      onClick={onClose}
                      subItem
                      badgeCount={child.badgeCount || 0}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </div>

      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
