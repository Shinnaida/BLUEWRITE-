// BLUEWRITE — Table Component
// Reusable data table with columns, rows, and empty state.

import React from 'react';

function Table({ columns = [], data = [], emptyMessage = 'No data available', emptyState }) {
  const EmptyIcon = emptyState?.icon;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12">
                {emptyState ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    {EmptyIcon && (
                      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <EmptyIcon size={22} />
                      </div>
                    )}
                    <p className="text-sm font-bold text-slate-800">{emptyState.title}</p>
                    {emptyState.description && (
                      <p className="max-w-sm text-sm text-slate-500">{emptyState.description}</p>
                    )}
                    {emptyState.action && (
                      <button
                        type="button"
                        onClick={emptyState.action.onClick}
                        className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
                      >
                        {emptyState.action.label}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-sm font-medium text-slate-600">{emptyMessage}</p>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="transition-colors hover:bg-slate-50/80">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3.5 text-sm font-medium text-slate-800">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
