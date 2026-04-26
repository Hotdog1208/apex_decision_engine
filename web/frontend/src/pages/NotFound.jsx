import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  const { pathname } = useLocation()

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}
      >
        {/* Glitchy 404 */}
        <div style={{ marginBottom: '32px', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 'clamp(80px, 16vw, 120px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: 'rgba(255,255,255,0.06)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}>
            404
          </div>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-data, monospace)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#CCFF00',
              padding: '4px 12px',
              border: '1px solid rgba(204,255,0,0.25)',
              background: 'rgba(204,255,0,0.05)',
            }}>
              Route not found
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: '22px',
          fontWeight: 900,
          color: 'rgba(255,255,255,0.88)',
          letterSpacing: '-0.02em',
          marginBottom: '12px',
        }}>
          Signal lost
        </h1>
        <p style={{
          fontFamily: 'var(--font-body, Inter, sans-serif)',
          fontSize: '13px',
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.40)',
          marginBottom: '32px',
        }}>
          The path{' '}
          <code style={{
            fontFamily: 'var(--font-data, monospace)',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.55)',
            background: 'rgba(255,255,255,0.05)',
            padding: '1px 6px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {pathname}
          </code>{' '}
          doesn&apos;t exist in this system.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/dashboard"
            style={{
              fontFamily: 'var(--font-data, monospace)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#000',
              background: '#CCFF00',
              padding: '10px 24px',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'opacity 0.15s',
            }}
          >
            Signal Hub
          </Link>
          <Link
            to="/"
            style={{
              fontFamily: 'var(--font-data, monospace)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              background: 'transparent',
              padding: '10px 24px',
              border: '1px solid rgba(255,255,255,0.10)',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            Home
          </Link>
        </div>

        {/* Bottom status line */}
        <div style={{
          marginTop: '48px',
          fontFamily: 'var(--font-data, monospace)',
          fontSize: '9px',
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.18)',
          textTransform: 'uppercase',
        }}>
          ADE — Apex Decision Engine · Status OK
        </div>
      </motion.div>
    </div>
  )
}
