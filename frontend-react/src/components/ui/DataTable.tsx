import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyTitle?: string;
  emptyAction?: ReactNode;
}

export function DataTable<T extends { id: string | number }>({ columns, rows, emptyTitle = 'Sem dados para exibir.', emptyAction }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-200">
            {columns.map((column) => (
              <th key={String(column.key)} className="p-3 text-left font-semibold">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="p-4 text-slate-300" colSpan={columns.length}>
                <div className="space-y-2">
                  <p>{emptyTitle}</p>
                  {emptyAction}
                </div>
              </td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-900 align-top hover:bg-slate-900/40">
              {columns.map((column) => (
                <td key={String(column.key)} className="p-3 text-slate-200">
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
