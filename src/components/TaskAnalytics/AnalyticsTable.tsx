import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface AnalyticsTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchKeys?: string[];
  pageSize?: number;
}

function AnalyticsTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'Aucune donnée',
  searchable = true,
  searchKeys = [],
  pageSize = 20,
}: AnalyticsTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((k) => String(item[k] ?? '').toLowerCase().includes(term))
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filtered, sortKey, sortDir]);

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        <span className="ml-3 text-gray-500">Chargement...</span>
      </div>
    );
  }

  return (
    <div>
      {searchable && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      )}

      {paged.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">{emptyMessage}</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''} ${col.className || ''}`}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    >
                      <span className="flex items-center space-x-1">
                        <span>{col.header}</span>
                        {col.sortable && sortKey === col.key && (
                          sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className || ''}`}>
                        {col.render ? col.render(item) : String(item[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>{sorted.length} résultat(s) — page {page + 1}/{totalPages}</span>
              <div className="flex space-x-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                >
                  ←
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AnalyticsTable;
