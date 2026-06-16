import React, { createContext, useContext, useState } from 'react';

interface LayoutContextType {
  focusMode: boolean;
  setFocusMode: (mode: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <LayoutContext.Provider
      value={{
        focusMode,
        setFocusMode,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebarCollapsed: () => setSidebarCollapsed((prev) => !prev),
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
