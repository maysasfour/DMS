/**
 * ErrorBoundary.jsx
 *
 * React class-based Error Boundary component for the Disaster Management System (DMS).
 *
 * Purpose: Wraps critical UI sections (e.g., incident maps, alert panels, resource forms)
 * to catch unexpected JavaScript errors during rendering without crashing the entire
 * DMS portal. When a child component fails, this boundary intercepts the error and
 * renders a styled fallback UI consistent with the DMS neon cyberpunk design system,
 * using CSS variables defined in the global theme (--bg-tertiary, --text-secondary, etc.).
 *
 * Usage: Wrap any DMS component tree that may fail due to API data shape changes,
 * missing incident fields, or third-party map/chart library errors.
 */

// React core import — required for class component and JSX rendering
import React from 'react';

/**
 * ErrorBoundary — A React class component that implements the Error Boundary pattern.
 * Only class components can serve as error boundaries in React (hooks cannot).
 * Exported as the default export so it can be easily imported anywhere in the DMS UI.
 */
export default class ErrorBoundary extends React.Component {
  /**
   * Constructor initializes component state and receives props from the parent.
   * @param {object} props - Supports an optional `fallback` prop for custom error UI,
   *                         and `children` for the component subtree to guard.
   */
  constructor(props) {
    // Pass props to React.Component base class to enable lifecycle and context access
    super(props);
    // Initialize error state: hasError gates the fallback UI; error holds the thrown Error object
    this.state = { hasError: false, error: null };
  }

  /**
   * getDerivedStateFromError — Static React lifecycle method invoked when a descendant
   * component throws during rendering, a lifecycle method, or a constructor.
   * Returning new state here causes React to re-render the boundary with the error UI.
   *
   * @param {Error} error - The error thrown by the failing child component.
   * @returns {{ hasError: boolean, error: Error }} — State update that triggers fallback render.
   */
  static getDerivedStateFromError(error) {
    // Signal that an error has been caught and store it for display in the fallback UI
    return { hasError: true, error };
  }

  /**
   * componentDidCatch — React lifecycle method called after an error has been thrown
   * by a descendant component. Used for side effects such as logging.
   * In the DMS context, this would be the place to send error reports to a monitoring
   * service (e.g., Sentry) or the DMS backend error-logging endpoint.
   *
   * @param {Error} error - The error that was thrown.
   * @param {React.ErrorInfo} info - Contains componentStack string for debugging.
   */
  componentDidCatch(error, info) {
    // Log the caught error and React component stack trace to the browser console for debugging
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  /**
   * render — Determines what to display based on whether an error has been caught.
   * Renders either the fallback UI or the normal children component subtree.
   */
  render() {
    // Check if a rendering error has been caught in any child component
    if (this.state.hasError) {
      // If a custom fallback was provided via props (e.g., a branded DMS error panel), render it directly
      if (this.props.fallback) return this.props.fallback;

      // Default DMS-themed error fallback UI using global CSS design token variables
      // Styled with rounded card appearance consistent with the DMS neon cyberpunk theme
      return (
        <div
          className="rounded-xl p-4 text-sm"
          // Uses DMS CSS variables: --bg-tertiary for dark card background, --border-primary for subtle border
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
        >
          {/* Error heading styled in DMS alert red (#E63946) to indicate a critical UI failure */}
          <p className="font-semibold mb-1" style={{ color: '#E63946' }}>Component Error</p>

          {/* Display the raw error message in monospace font at reduced opacity for technical context */}
          {/* Optional chaining (?.) safely handles cases where the error object has no message property */}
          <p className="text-xs font-mono opacity-70">{this.state.error?.message}</p>
        </div>
      );
    }

    // No error detected — render the wrapped child components normally (e.g., incident map, alert list)
    return this.props.children;
  }
}