/**
 * main.jsx — Application Entry Point for the Disaster Management System (DMS)
 *
 * This file bootstraps the React application. It initializes third-party OAuth
 * providers (Google, Facebook) required for DMS user authentication, loads
 * internationalization support for multilingual incident reporting, injects
 * global CSS (Bootstrap layout, Leaflet map styles, and DMS custom theme),
 * wraps the app in a top-level error boundary to prevent full UI crashes during
 * disaster response operations, and mounts the root React component tree into
 * the DOM.
 */

// React core library — required for JSX transformation and component lifecycle
import React from 'react'
// ReactDOM client API — used to mount the React tree into the HTML root element
import ReactDOM from 'react-dom/client'
// GoogleOAuthProvider — wraps the app to enable Google Sign-In for DMS users (responders, admins)
import { GoogleOAuthProvider } from '@react-oauth/google'
// Root App component — top-level router and layout shell for all DMS pages
import App from './App'
// i18n instance — pre-configured multilingual support (Arabic, English, French, Spanish, Turkish)
// for DMS incident forms, alerts, and UI labels
import i18n from './i18n/index.js'

// Bootstrap CSS — provides responsive grid and utility classes for DMS dashboard layouts
import 'bootstrap/dist/css/bootstrap.min.css'
// Bootstrap Icons — icon font used throughout the DMS UI (alerts, resources, incident types)
import 'bootstrap-icons/font/bootstrap-icons.css'
// Leaflet CSS — required stylesheet for the interactive incident map and heatmap views
import 'leaflet/dist/leaflet.css'
// DMS custom styles — neon cyberpunk theme with Rajdhani + Inter fonts and CSS variable overrides
import './styles/index.css'

// Read Google OAuth client ID from Vite environment variables; falls back to empty string
// if not configured (disables Google login button gracefully)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
// Read Facebook App ID from Vite environment variables; used for Facebook OAuth login flow
const FACEBOOK_APP_ID  = import.meta.env.VITE_FACEBOOK_APP_ID  || ''

// Expose FB App ID as a global window property so the Facebook JS SDK loaded via
// index.html <script> tag can pick it up at runtime without a module import
if (FACEBOOK_APP_ID) window.__FB_APP_ID__ = FACEBOOK_APP_ID

// Attach the i18n instance to window so the Zustand auth store can call
// changeLanguage() synchronously during login/logout without async import cycles
window.__i18n_instance__ = i18n

// RootErrorBoundary — class component that catches unhandled React render errors
// across the entire DMS application tree, preventing a blank screen during critical
// disaster response sessions where the UI must remain partially functional
class RootErrorBoundary extends React.Component {
  // Initialize component state; error is null when no crash has occurred
  constructor(props) { super(props); this.state = { error: null }; }

  // React lifecycle: called when any child component throws during rendering;
  // captures the error object into component state to trigger the fallback UI
  static getDerivedStateFromError(e) { return { error: e }; }

  // React lifecycle: logs the full error and component stack trace to the console
  // for debugging DMS runtime failures (e.g., map crashes, auth errors)
  componentDidCatch(e, info) { console.error('[ROOT ERROR]', e, info); }

  // Render method: displays a styled fallback error screen when a crash is detected,
  // or renders the normal child component tree when no error is present
  render() {
    // If an error has been caught, show a dark-themed diagnostic panel
    // with the error message and stack trace for developer inspection
    if (this.state.error) {
      return (
        // Outer container styled with DMS dark background color (#0b1120) and monospace font
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#0b1120', color: '#f1f5f9', minHeight: '100vh' }}>
          {/* Error heading styled with DMS alert red (#E63946) to indicate a critical failure */}
          <h2 style={{ color: '#E63946' }}>Application Error</h2>
          {/* Human-readable error message displayed in muted red for visibility */}
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#fca5a5' }}>{this.state.error?.message}</pre>
          {/* Full stack trace displayed in subdued slate color for secondary detail */}
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#94a3b8', marginTop: 16 }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    // No error: render child components normally (the full DMS application)
    return this.props.children;
  }
}

// Mount the React application into the #root div defined in index.html.
// The tree is wrapped in:
//   1. RootErrorBoundary — catches uncaught render errors across all DMS screens
//   2. GoogleOAuthProvider — supplies Google client ID context to all login components
//   3. App — the DMS router and page shell
ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    {/* GoogleOAuthProvider makes the Google OAuth client ID available to any
        DMS login page (AdminLogin, OfficerLogin, TeamLogin) that uses useGoogleLogin() */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* App renders the top-level React Router routes for all DMS portals and pages */}
      <App />
    </GoogleOAuthProvider>
  </RootErrorBoundary>,
)