import { Link } from 'react-router-dom'

const LEGAL_LINKS = [
  { to: '/terms',          label: 'Terms of Service'  },
  { to: '/privacy',        label: 'Privacy Policy'    },
  { to: '/risk-disclosure',label: 'Risk Disclosure'   },
  { to: '/disclaimer',     label: 'Disclaimer'        },
  { to: '/faq',            label: 'FAQ'               },
  { to: '/glossary',       label: 'Glossary'          },
]

export function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: '32px' }}>
      <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: '13px', fontWeight: 900,
          letterSpacing: '0.01em', color: 'rgba(255,255,255,0.90)',
        }}>
          {title}
        </h2>
      </div>
      <div style={{
        fontFamily: 'var(--font-body, Inter, sans-serif)',
        fontSize: '13px', lineHeight: 1.75,
        color: 'rgba(255,255,255,0.58)',
      }}>
        {children}
      </div>
    </section>
  )
}

export function P({ children, style }) {
  return (
    <p style={{ marginBottom: '12px', ...style }}>
      {children}
    </p>
  )
}

export function UL({ children }) {
  return (
    <ul style={{ paddingLeft: '0', marginBottom: '12px', listStyle: 'none' }}>
      {children}
    </ul>
  )
}

export function LI({ children }) {
  return (
    <li style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
      <span style={{ color: '#CCFF00', flexShrink: 0, marginTop: '2px' }}>›</span>
      <span>{children}</span>
    </li>
  )
}

export function Highlight({ children }) {
  return (
    <span style={{
      background: 'rgba(204,255,0,0.07)', border: '1px solid rgba(204,255,0,0.14)',
      padding: '1px 6px', fontFamily: 'var(--font-data, monospace)',
      fontSize: '11px', color: 'rgba(204,255,0,0.85)', borderRadius: '1px',
    }}>
      {children}
    </span>
  )
}

export function LegalLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{ color: '#CCFF00', textDecoration: 'none', borderBottom: '1px solid rgba(204,255,0,0.25)' }}
    >
      {children}
    </Link>
  )
}

export default function LegalLayout({ title, badge, updated, children }) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '40px', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          {badge && (
            <span style={{
              fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#CCFF00', fontWeight: 700,
              padding: '2px 8px', border: '1px solid rgba(204,255,0,0.22)',
              background: 'rgba(204,255,0,0.05)',
            }}>
              {badge}
            </span>
          )}
          {updated && (
            <span style={{
              fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
              color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em',
            }}>
              Last updated: {updated}
            </span>
          )}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: '30px', fontWeight: 900,
          color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em',
          marginBottom: '6px',
        }}>
          {title}
        </h1>
        <div style={{ height: '2px', width: '48px', background: '#CCFF00', marginTop: '12px' }} />
      </div>

      {/* Body */}
      <div>
        {children}
      </div>

      {/* Footer nav */}
      <div style={{
        marginTop: '60px', paddingTop: '24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{
          fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.22)', marginBottom: '14px',
        }}>
          Legal Documents
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {LEGAL_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.38)',
                padding: '5px 10px',
                border: '1px solid rgba(255,255,255,0.07)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
