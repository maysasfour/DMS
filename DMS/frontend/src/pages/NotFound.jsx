/**
 * NotFound.jsx — 404 Error Page for the Disaster Management System (DMS)
 *
 * Displayed when a user navigates to a route that does not exist within the DMS portal.
 * Renders a neon cyberpunk-themed 404 screen consistent with the DMS design system,
 * featuring animated radar rings, a glitch-effect error code, and an auto-redirect
 * countdown that sends the user back to the main dashboard after 10 seconds.
 *
 * Used by: React Router's catch-all route (e.g., path="*")
 * Redirects to: /layout/dashboard (the DMS main operations dashboard)
 */

// React core — used for component rendering, side effects, and local state
import React, { useEffect, useState } from 'react';
// Link provides client-side navigation; useNavigate enables programmatic redirect
import { Link, useNavigate } from 'react-router-dom';
// motion enables declarative animations for the cyberpunk UI elements
import { motion } from 'framer-motion';

/**
 * useCountdown — custom hook that counts down from a given number to zero, decrementing once per second.
 * Used to drive the auto-redirect timer that returns users to the DMS dashboard after 10 seconds.
 * @param {number} from — the starting value of the countdown (e.g., 10 for a 10-second timer)
 * @returns {number} current countdown value
 */
function useCountdown(from) {
  // Local state holding the current countdown value, initialized to the starting number
  const [count, setCount] = useState(from);

  // Side effect: set a 1-second timeout each time `count` changes, decrementing by 1
  useEffect(() => {
    // Stop the timer when the countdown reaches zero to avoid negative values
    if (count <= 0) return;
    // Schedule a decrement of count after 1000ms (1 second)
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    // Cleanup: cancel the timeout if count changes before it fires (prevents stale updates)
    return () => clearTimeout(t);
  }, [count]); // Re-run whenever count changes

  // Return the current countdown value for use in the component
  return count;
}

/**
 * NotFound — page component shown when a DMS route cannot be resolved.
 * Presents a styled 404 error with animated visuals and auto-redirects to /layout/dashboard.
 */
export default function NotFound() {
  // useNavigate hook for programmatic navigation — used to redirect to dashboard when timer expires
  const navigate = useNavigate();
  // Start the 10-second countdown; value decrements every second via the custom hook
  const count = useCountdown(10);

  // When countdown reaches 0, automatically redirect the user to the DMS operations dashboard
  useEffect(() => {
    if (count === 0) navigate('/layout/dashboard');
  }, [count, navigate]); // Re-check on every count change or if navigate reference changes

  return (
    // Full-screen container using the DMS design system's primary background color variable
    <div className="min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-primary)', position: 'relative' }}>

      {/* Hex grid background — subtle honeycomb pattern using DMS alert red, evoking a tactical map overlay */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        <defs>
          {/* SVG pattern definition: repeating hexagon cells tiled across the full viewport */}
          <pattern id="hex404" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            {/* Single hexagon cell outline in DMS danger red (#E63946) at very low opacity */}
            <polygon points="30,2 56,15 56,39 30,52 4,39 4,15" fill="none" stroke="#E63946" strokeWidth="0.8"/>
          </pattern>
        </defs>
        {/* Fill entire SVG canvas with the repeating hex pattern */}
        <rect width="100%" height="100%" fill="url(#hex404)"/>
      </svg>

      {/* Scan beam — animated horizontal line that sweeps top-to-bottom, simulating a radar scan effect */}
      <motion.div className="absolute left-0 right-0 pointer-events-none"
        style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(230,57,70,0.3), transparent)' }}
        // Animate vertical position from above the viewport to below it in a continuous loop
        animate={{ top: ['-1px', '100%'] }}
        transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
      />

      {/* Corner brackets — four L-shaped decorative borders placed at each viewport corner for a HUD/terminal look */}
      {[
        // Top-left bracket: borders on top and left edges
        { top: 24, left: 24, borderTop: '2px solid rgba(230,57,70,0.4)', borderLeft: '2px solid rgba(230,57,70,0.4)' },
        // Top-right bracket: borders on top and right edges
        { top: 24, right: 24, borderTop: '2px solid rgba(230,57,70,0.4)', borderRight: '2px solid rgba(230,57,70,0.4)' },
        // Bottom-left bracket: borders on bottom and left edges
        { bottom: 24, left: 24, borderBottom: '2px solid rgba(230,57,70,0.4)', borderLeft: '2px solid rgba(230,57,70,0.4)' },
        // Bottom-right bracket: borders on bottom and right edges
        { bottom: 24, right: 24, borderBottom: '2px solid rgba(230,57,70,0.4)', borderRight: '2px solid rgba(230,57,70,0.4)' },
      ].map((s, i) => (
        // Each bracket fades in sequentially with a small delay between them (staggered entrance)
        <motion.div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}/>
      ))}

      {/* Central content column — positioned above all background layers via z-index */}
      <div className="relative z-10 text-center px-6">

        {/* Radar rings behind 404 — pulsing concentric circles that evoke a sonar/radar display */}
        <div className="relative inline-block mb-6">
          {/* Three rings at increasing sizes (180px, 280px, 380px) centered on the 404 text */}
          {[180, 280, 380].map((size, i) => (
            // Each ring pulses in scale and opacity, staggered by 0.8s to create a ripple effect
            <motion.div key={i}
              className="absolute rounded-full"
              style={{
                width: size, height: size,
                // Center each ring relative to the parent using negative margin offset
                top: '50%', left: '50%',
                marginTop: -size / 2, marginLeft: -size / 2,
                // Faint red border consistent with DMS danger/alert color scheme
                border: '1px solid rgba(230,57,70,0.12)',
              }}
              // Animate between normal and slightly enlarged scale with fading opacity
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
            />
          ))}

          {/* 404 glitch text — large display number with chromatic aberration animation */}
          <motion.div
            style={{
              // DMS design system fonts: Rajdhani for military/tech feel, Inter as fallback
              fontFamily: "'Rajdhani','Inter',sans-serif",
              // Fluid font size scaling between 5rem and 10rem based on viewport width
              fontSize: 'clamp(5rem,18vw,10rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              position: 'relative',
              color: 'var(--text-primary)',
            }}
            // Glitch effect: red/cyan offset text shadows simulate signal corruption, looping with pauses
            animate={{ textShadow: [
              '0 0 0px transparent',                                                   // No shadow (normal)
              '3px 0 0 rgba(230,57,70,0.7), -3px 0 0 rgba(0,212,255,0.7)',           // Full red+cyan glitch split
              '0 0 0px transparent',                                                   // Reset
              '-2px 0 0 rgba(230,57,70,0.5), 2px 0 0 rgba(0,212,255,0.5)',           // Subtler reverse glitch
              '0 0 0px transparent',                                                   // Reset
            ]}}
            // 4s glitch cycle, repeated with a 2-second pause between repetitions
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          >
            {/* "404" text rendered with a gradient fill: white → DMS red → orange alarm */}
            <span style={{
              background: 'linear-gradient(135deg, var(--text-primary) 0%, #E63946 60%, #FF7A00 100%)',
              // Clip gradient to text shape using webkit prefix for broad browser support
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              404
            </span>
          </motion.div>
        </div>

        {/* Text content block — fades in and slides up from below after a short delay */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {/* Status label — styled like a DMS system alert code in monospace red uppercase text */}
          <p className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: '#E63946', fontFamily: 'monospace', letterSpacing: '0.4em' }}>
            — SIGNAL LOST —
          </p>
          {/* Primary error heading — uses Rajdhani font for consistent DMS typography */}
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Rajdhani','Inter',sans-serif" }}>
            Page Not Found
          </h2>
          {/* Descriptive message framed in DMS terminology ("sector", "system") for thematic consistency */}
          <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            The sector you're trying to reach is offline or doesn't exist in this system.
          </p>

          {/* Countdown ring — circular SVG progress indicator showing seconds remaining before auto-redirect */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* SVG ring: rotated -90deg so progress starts from the top (12 o'clock position) */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Static background track — faint red ring always fully visible */}
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(230,57,70,0.15)" strokeWidth="2"/>
                {/* Animated foreground arc — strokeDashoffset shrinks as countdown progresses */}
                <motion.circle cx="18" cy="18" r="15" fill="none" stroke="#E63946" strokeWidth="2"
                  strokeLinecap="round"
                  // Total circumference of the circle (2π × r ≈ 94.2) used for dash calculations
                  strokeDasharray="94.2"
                  // As count decreases from 10 to 0, dashoffset increases, "draining" the arc
                  animate={{ strokeDashoffset: 94.2 - (count / 10) * 94.2 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                />
              </svg>
              {/* Numeric countdown value centered inside the ring */}
              <span className="text-xs font-black" style={{ color: '#E63946' }}>{count}</span>
            </div>
            {/* Text label explaining the countdown purpose to the user */}
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Redirecting to dashboard in {count}s
            </span>
          </div>

          {/* Action buttons row — allows user to navigate manually without waiting for auto-redirect */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Primary CTA: navigate directly to DMS dashboard — highlighted in DMS danger red */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/layout/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{
                  // Gradient button matching the DMS alert/action color palette
                  background: 'linear-gradient(135deg, #E63946, #c0202d)',
                  // Red glow shadow reinforcing the neon cyberpunk aesthetic
                  boxShadow: '0 4px 20px rgba(230,57,70,0.35)',
                }}>
                {/* Home/house icon — universally recognized symbol for returning to the main dashboard */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                Go to Dashboard
              </Link>
            </motion.div>
            {/* Secondary CTA: go back to the previous page in browser history — lower-emphasis styling */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {/* Uses browser history API instead of router navigation to restore the previous page */}
              <button onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  // Secondary button uses DMS surface/border variables for a neutral appearance
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}>
                {/* Left-arrow icon indicating backward navigation */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Go Back
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* System status footer — monospace DMS version/error code label, fades in last for dramatic effect */}
        <motion.div className="mt-10 text-xs font-mono"
          style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.2em' }}
          // Delayed fade-in so the footer appears after the main content has settled
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          {/* DMS version identifier, human-readable error type, and hex error code for technical context */}
          DMS v2.0 &nbsp;|&nbsp; ERR_ROUTE_NOT_FOUND &nbsp;|&nbsp; 0x404
        </motion.div>
      </div>
    </div>
  );
}