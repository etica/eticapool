import React from 'react';

export default function DataTable({ columns, data, renderRow, emptyMessage = 'No data available' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key || i}
                className={`${col.align === 'right' ? 'text-right' : 'text-left'} py-3 px-3 os-label font-medium`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-6 px-3 text-center text-[#4b5563] text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : renderRow ? (
            data.map((item, idx) => renderRow(item, idx))
          ) : (
            data.map((item, idx) => (
              <tr key={idx} className="os-table-row">
                {columns.map((col, ci) => (
                  <td
                    key={ci}
                    className={`py-3 px-3 ${col.align === 'right' ? 'text-right' : ''} text-[#e5e7eb]`}
                  >
                    {item[col.key]}
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
