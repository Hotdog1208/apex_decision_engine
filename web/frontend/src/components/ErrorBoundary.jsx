import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0A0A0A',
          color: '#fff',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ color: '#CCFF00', marginBottom: 16 }}>Something went wrong</h1>
          <pre style={{
            background: 'rgba(255,255,255,0.1)',
            padding: 16,
            borderRadius: 8,
            overflow: 'auto',
            fontSize: 13,
            marginBottom: 16,
          }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            Check the browser console (F12) for details. Fix the error and refresh.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: '#CCFF00',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
