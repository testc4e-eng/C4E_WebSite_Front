import React from 'react';
import type { Project } from '../../lib/api-analytics';

interface ProjectSelectorProps {
  projects: Project[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  loading?: boolean;
  showAll?: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedId,
  onChange,
  loading = false,
  showAll = true,
}) => {
  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={loading}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm shadow-sm min-w-[200px]"
    >
      {showAll && <option value="">Tous les projets</option>}
      {loading && <option disabled>Chargement...</option>}
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
};

export default ProjectSelector;
