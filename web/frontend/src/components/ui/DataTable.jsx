export default function DataTable({ columns = [], rows = [], emptyMessage = 'No data available.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ fontFamily: 'var(--font-data, monospace)', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {columns.map((col, i) => (
              <th
                key={col.key ?? i}
                style={{
                  padding:       '10px 20px',
                  fontSize:      '9px',
                  letterSpacing: '0.18em',
                  fontWeight:    600,
                  textTransform: 'uppercase',
                  color:         'rgba(255,255,255,0.28)',
                  textAlign:     col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                  whiteSpace:    'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: '11px' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr
                key={row.id ?? ri}
                className="transition-colors hover:bg-white/[0.018]"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                {columns.map((col, ci) => (
                  <td
                    key={col.key ?? ci}
                    style={{
                      padding:   '11px 20px',
                      textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
                      fontSize:  '11px',
                      color:     col.color || 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
