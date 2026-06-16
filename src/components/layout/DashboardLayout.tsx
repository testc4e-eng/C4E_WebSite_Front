import { type CSSProperties, useState } from 'react';
import AppTopBar from './AppTopBar';
import RoleBasedNav from './RoleBasedNav';
import { useLayout } from '../../hooks/useLayout';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { focusMode, sidebarCollapsed, toggleSidebarCollapsed } = useLayout();
  const { appRole } = useAuth();
  const isWideSidebarRole = appRole === 'DG' || appRole === 'ADMIN';

  const sidebarDesktopWidth =
    sidebarCollapsed ? '5rem' : isWideSidebarRole ? '21rem' : '17rem';
  const sidebarMobileWidth = sidebarCollapsed ? '5rem' : '18rem';

  const layoutStyle: CSSProperties = {
    '--dashboard-sidebar-width-desktop': sidebarDesktopWidth,
    '--dashboard-sidebar-width-mobile': sidebarMobileWidth,
  };

  return (
    <div className="min-h-screen bg-slate-100" style={layoutStyle}>
      {!focusMode && (
        <RoleBasedNav
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
        />
      )}

      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          !focusMode && 'lg:pl-[var(--dashboard-sidebar-width-desktop)]'
        )}
      >
        <AppTopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleCollapsed={toggleSidebarCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          focusMode={focusMode}
        />

        <main className={cn('min-h-[calc(100vh-5rem)]', focusMode && 'w-full')}>
          <div className="w-full px-4 py-6 lg:px-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
