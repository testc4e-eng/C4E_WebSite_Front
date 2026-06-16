import React from 'react';
import type { Project } from '../../lib/api-analytics';
import ProjectSelector from './ProjectSelector';

interface DashboardFiltersProps {
  projects: Project[];
  selectedProjectId: number | null;
  onProjectChange: (id: number | null) => void;
  loadingProjects?: boolean;
  children?: React.ReactNode;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  projects,
  selectedProjectId,
  onProjectChange,
  loadingProjects = false,
  children,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <ProjectSelector
          projects={projects}
          selectedId={selectedProjectId}
          onChange={onProjectChange}
          loading={loadingProjects}
        />
        {children}
      </div>
    </div>
  );
};

export default DashboardFilters;
