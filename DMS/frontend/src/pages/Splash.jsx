// ============================================================
// Splash.jsx — DMS Application Boot Splash Screen
//
// Purpose:
//   Displays an animated "system initializing" splash screen
//   when the Disaster Management System (DMS) first loads.
//   Simulates a tactical HUD boot sequence with sequential
//   loading steps (location, network, AI engine, database),
//   then automatically navigates to the /login page once the
//   sequence completes. Reinforces the neon cyberpunk brand
//   identity while setting user expectations for the platform.
// ============================================================

// React hooks: side effects, local state, and DOM refs
import { useEffect, useState, useRef } from 'react';
// Framer Motion: declarative animation primitives used throughout the HUD visuals
import { motion, AnimatePresence } from 'framer-motion';
// React Router hook for programmatic navigation to /login after boot
import { useNavigate } from 'react-router-dom';
// i18n hook — imported for potential future localization of boot labels
import { useTranslation } from 'react-i18next';

/* ─────────────────────────────────────────────────────────────
   NEON SPLASH — professional animated emergency ops screen
   Inspired by HUD / tactical dashboard templates
───────────────────────────────────────────────────────────── */

// Boot sequence steps: each entry represents one phase of the DMS startup simulation.
// 'key' uniquely identifies the step for React's keying, 'pct' drives the progress bar,
// and 'label' shows the current operation to the user as system-style monospace text.
const STEPS = [
  { key: 'init',  pct: 0,   label: 'INITIALIZING SYSTEM…' },       // Step 0: app boot start
  { key: 'loc',   pct: 18,  label: 'ACQUIRING LOCATION…' },         // Step 1: geolocation for incident mapping
  { key: 'net',   pct: 38,  label: 'CONNECTING TO NETWORK…' },      // Step 2: backend API connectivity
  { key: 'ai',    pct: 62,  label: 'LOADING AI ENGINE…' },          // Step 3: Gemini AI agent on port 3002
  { key: 'db',    pct: 82,  label: 'SYNCING DATABASE…' },           // Step 4: incident/resource database sync
  { key: 'ready', pct: 100, label: 'SYSTEM READY' },                // Step 5: boot complete, navigate to login
];

// HexGrid — decorative full-screen SVG background using a repeating hexagonal tile pattern.
// The low opacity (0.04) ensures it appears as a subtle texture behind all foreground elements,
// reinforcing the tactical/military HUD aesthetic of the emergency ops platform.
function HexGrid() {
  return (
    // SVG spans the full viewport as an absolute overlay behind all content
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Repeating hex tile: 60x52px unit cell containing a single hexagon outline */}
        <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
          {/* Hexagon polygon in DMS brand red (#E63946), no fill — grid lines only */}
          <polygon points="30,2 56,15 56,39 30,52 4,39 4,15"
            fill="none" stroke="#E63946" strokeWidth="1"/>
        </pattern>
      </defs>
      {/* Fill the entire SVG canvas with the hex tile pattern */}
      <rect width="100%" height="100%" fill="url(#hex)"/>
    </svg>
  );
}

// CircuitLines — decorative SVG overlay simulating printed circuit board traces.
// Uses a Gaussian blur glow filter to mimic neon light bleeding.
// Cyan (#00d4ff) lines represent network/data paths; red (#E63946) nodes indicate alert/power points.
// pointer-events: none ensures it never blocks user interaction.
function CircuitLines() {
  return (
    // Non-interactive SVG overlay; very low opacity (0.06) keeps it subliminal
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Glow filter: blurs the element and merges the blur behind the original to create neon bloom */}
        <filter id="cglow"><feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Circuit trace group with neon cyan stroke and glow applied */}
      <g filter="url(#cglow)" stroke="#00d4ff" strokeWidth="1" fill="none">
        {/* Top-left circuit trace: horizontal line bending diagonally to a junction node */}
        <line x1="0" y1="20%" x2="15%" y2="20%"/>
        <line x1="15%" y1="20%" x2="20%" y2="30%"/>
        <circle cx="20%" cy="30%" r="3" fill="#00d4ff"/> {/* Cyan junction node */}
        <line x1="20%" y1="30%" x2="35%" y2="30%"/>
        {/* Top-right circuit trace: mirror of top-left, approaching from right edge */}
        <line x1="100%" y1="25%" x2="80%" y2="25%"/>
        <line x1="80%" y1="25%" x2="75%" y2="35%"/>
        <circle cx="75%" cy="35%" r="3" fill="#00d4ff"/> {/* Cyan junction node */}
        <line x1="75%" y1="35%" x2="60%" y2="35%"/>
        {/* Bottom-left circuit trace: red node signals a critical/alert branch point */}
        <line x1="0" y1="75%" x2="12%" y2="75%"/>
        <line x1="12%" y1="75%" x2="18%" y2="65%"/>
        <circle cx="18%" cy="65%" r="3" fill="#E63946"/> {/* Red alert node */}
        <line x1="18%" y1="65%" x2="30%" y2="65%"/>
        {/* Bottom-right circuit trace: mirror of bottom-left with red alert node */}
        <line x1="100%" y1="80%" x2="85%" y2="80%"/>
        <line x1="85%" y1="80%" x2="78%" y2="70%"/>
        <circle cx="78%" cy="70%" r="3" fill="#E63946"/> {/* Red alert node */}
        <line x1="78%" y1="70%" x2="65%" y2="70%"/>
      </g>
    </svg>
  );
}

// RadarRing — a single expanding ring animation that pulses outward from the shield center.
// Simulates a radar sweep effect common in emergency operations dashboards.
// Multiple instances with staggered delays create a continuous wave of expanding rings.
// @param {number} delay — animation start delay in seconds (default 0)
function RadarRing({ delay = 0 }) {
  return (
    // Absolutely positioned circle that expands from 60px to 340px diameter while fading out
    <motion.div
      className="absolute rounded-full border"
      // Center the ring on the shield icon using CSS transform
      style={{ borderColor: 'rgba(230,57,70,0.4)', left: '50%', top: '50%', x: '-50%', y: '-50%' }}
      // Start small and visible; animate to large and transparent
      initial={{ width: 60, height: 60, opacity: 0.8 }}
      animate={{ width: 340, height: 340, opacity: 0 }}
      // Slow ease-out pulse; infinite repeat with brief pause between cycles
      transition={{ duration: 2.8, delay, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.2 }}
    />
  );
}

// NeonShield — the central logo component of the splash screen.
// Renders a layered animated shield icon with three radar pulse rings,
// a clockwise-spinning outer ring with four neon corner markers,
// a counter-clockwise dashed inner ring, and a central shield SVG icon.
// Together these layers reinforce the DMS security/protection brand identity.
function NeonShield() {
  return (
    // Relative container sized to hold all absolutely positioned ring layers
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      {/* Three staggered radar rings expanding outward — simulates active incident scanning */}
      <RadarRing delay={0} />
      <RadarRing delay={0.8} />
      <RadarRing delay={1.6} />

      {/* spinning outer ring */}
      {/* Outer decorative ring rotating clockwise at 8-second period */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ width: 120, height: 120, borderColor: 'rgba(230,57,70,0.3)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      >
        {/* Four neon red corner markers evenly spaced at 0°, 90°, 180°, 270° on the outer ring */}
        {[0, 90, 180, 270].map(deg => (
          <div key={deg} className="absolute" style={{
            width: 8, height: 8, top: '50%', left: '50%',
            // Rotate to position, translate outward by 56px radius, then re-center the marker
            transform: `rotate(${deg}deg) translateX(56px) translate(-50%,-50%)`,
          }}>
            {/* Individual marker: small rounded square with red neon glow */}
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#E63946',
              boxShadow: '0 0 8px #E63946, 0 0 20px rgba(230,57,70,0.6)' }}/>
          </div>
        ))}
      </motion.div>

      {/* counter-spinning inner ring */}
      {/* Dashed inner ring rotating counter-clockwise at 12-second period — adds depth to the HUD */}
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 90, height: 90, borderColor: 'rgba(0,212,255,0.25)', borderStyle: 'dashed' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
      />

      {/* core */}
      {/* Central shield core: dark gradient background with breathing glow animation */}
      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 68, height: 68,
          // Deep dark red gradient to distinguish the core from the outer rings
          background: 'linear-gradient(135deg, #1a0a0c, #2d0810)',
          border: '2px solid rgba(230,57,70,0.5)',
        }}
        // Pulsing box-shadow cycles between dim and bright red glow to simulate a heartbeat
        animate={{ boxShadow: [
          '0 0 30px rgba(230,57,70,0.4), 0 0 80px rgba(230,57,70,0.15), inset 0 0 20px rgba(230,57,70,0.1)',
          '0 0 50px rgba(230,57,70,0.7), 0 0 120px rgba(230,57,70,0.3), inset 0 0 30px rgba(230,57,70,0.2)',
          '0 0 30px rgba(230,57,70,0.4), 0 0 80px rgba(230,57,70,0.15), inset 0 0 20px rgba(230,57,70,0.1)',
        ]}}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
      >
        {/* Shield SVG icon: outer shield path + inner checkmark — symbolizes system protection */}
        <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
          {/* Shield outline with semi-transparent red fill and neon drop-shadow glow */}
          <path d="M16 2L3 7.5V18.5C3 25.5 9 31.5 16 34C23 31.5 29 25.5 29 18.5V7.5L16 2Z"
            fill="rgba(230,57,70,0.15)" stroke="#E63946" strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 0 6px #E63946)' }}/>
          {/* Checkmark inside shield — indicates system verified/secured status */}
          <path d="M11 18l4 4 6-8" stroke="#ff2d3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 4px #ff2d3d)' }}/>
        </svg>
      </motion.div>
    </div>
  );
}

// ProgressBar — animated horizontal progress indicator for the DMS boot sequence.
// Displays the current boot step percentage with a shimmer sweep effect
// and monospace labels ("SYS.BOOT" left, numeric pct right) for the HUD aesthetic.
// @param {number} pct — current boot percentage (0–100) from the active STEPS entry
function ProgressBar({ pct }) {
  return (
    // Outer wrapper constrains max width so the bar aligns with status text above
    <div style={{ width: '100%', maxWidth: 420 }}>
      {/* Track: dark translucent background; overflow hidden clips the animated fill */}
      <div style={{
        height: 3, borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Fill bar: animates width to match current boot pct with gradient and neon glow */}
        <motion.div
          style={{
            height: '100%', borderRadius: 2,
            // Red-to-orange gradient mirrors the DMS brand color ramp
            background: 'linear-gradient(90deg, #E63946, #FF7A00, #ff2d6a)',
            boxShadow: '0 0 12px rgba(230,57,70,0.6)',
          }}
          // Width transitions smoothly between boot step percentages
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
        {/* Shimmer sweep: white translucent streak that slides left-to-right continuously */}
        <motion.div
          style={{
            position: 'absolute', top: 0, bottom: 0, width: 60,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
          // Sweep from just before the left edge to just past the right edge
          animate={{ left: ['-15%', '115%'] }}
          transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.3 }}
        />
      </div>
      {/* Label row below the track: system identifier on left, numeric percentage on right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {/* Static "SYS.BOOT" label — monospace HUD identifier for the boot progress track */}
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>SYS.BOOT</span>
        {/* Live percentage counter with neon red glow — updates as boot steps advance */}
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#E63946',
          textShadow: '0 0 8px rgba(230,57,70,0.6)' }}>{pct}%</span>
      </div>
    </div>
  );
}

// DataTicker — rapidly cycling random hex byte display for ambient visual noise.
// Renders 6 random 2-digit hex bytes refreshing every 130ms to simulate live
// data stream activity, reinforcing the tactical operations center aesthetic.
// No meaningful data is conveyed — purely decorative HUD element.
function DataTicker() {
  // Tick counter: increments every 130ms to trigger a re-render with new random hex values
  const [, setTick] = useState(0);
  useEffect(() => {
    // Start interval that bumps the tick counter to force re-render with fresh hex bytes
    const id = setInterval(() => setTick(t => t + 1), 130);
    // Cleanup interval on component unmount to prevent memory leaks
    return () => clearInterval(id);
  }, []); // Empty deps: interval is set up once on mount
  // Generate a single random hex byte (00–FF) as a 2-character uppercase string
  const rand = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  // Build a string of 6 space-separated random hex bytes on every render cycle
  const hex = Array.from({ length: 6 }, rand).join(' ');
  return (
    // Display the hex string in dim cyan monospace — visually suggests live data throughput
    <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,212,255,0.35)', letterSpacing: '0.1em' }}>
      {hex}
    </div>
  );
}

// Splash — main exported page component for the DMS application boot screen.
// Orchestrates the full boot sequence animation, auto-advancing through STEPS
// on predetermined delays, then navigating to /login when the sequence completes.
// This is the first screen users see when the DMS application loads.
export default function Splash() {
  // navigate: used to redirect to the /login portal after the boot animation finishes
  const navigate = useNavigate();
  // stepIdx: tracks which boot step (0–5) is currently displayed in the HUD
  const [stepIdx, setStepIdx] = useState(0);
  // done: set to true when the boot sequence ends, triggering AnimatePresence exit animation
  const [done, setDone] = useState(false);

  // Boot sequence orchestration: advances through STEPS on fixed delays then navigates to login.
  // Each delay (ms) corresponds to one STEPS entry, creating the illusion of staged initialization.
  useEffect(() => {
    // Delay offsets (ms) at which each STEPS entry becomes active
    const delays = [0, 600, 1100, 1700, 2300, 2900];
    // Schedule one setTimeout per step, updating stepIdx to trigger re-render with new status label
    const timers = delays.map((d, i) => setTimeout(() => setStepIdx(i), d));
    // After all steps complete, mark as done and redirect to login after exit animation (700ms)
    const finish = setTimeout(() => {
      setDone(true); // Triggers AnimatePresence exit fade-out
      setTimeout(() => navigate('/login'), 700); // Navigate to the DMS login portal
    }, 3700); // Total boot animation duration: ~3.7 seconds
    // Cleanup: cancel all pending timers if component unmounts before sequence finishes
    return () => { timers.forEach(clearTimeout); clearTimeout(finish); };
  }, [navigate]); // Re-run only if navigate reference changes (stable in practice)

  // Resolve the current STEPS entry; fall back to last step to avoid undefined during edge cases
  const step = STEPS[stepIdx] || STEPS[STEPS.length - 1];

  return (
    // Full-viewport fixed container with deep navy-black background — base canvas for all HUD layers
    <div style={{
      position: 'fixed', inset: 0,
      background: '#04080f', // Near-black with a faint blue tint for the tactical operations aesthetic
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', // Prevent scroll from oversized decorative elements like RadarRing
    }}>
      {/* Decorative hex grid background texture — very low opacity to stay subliminal */}
      <HexGrid />
      {/* Decorative circuit board lines with neon glow — framing the edges of the screen */}
      <CircuitLines />

      {/* moving scan beam */}
      {/* Horizontal scan line sweeping top-to-bottom continuously — simulates radar/lidar sweep */}
      <motion.div
        style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          // Horizontal cyan gradient fading at edges to avoid harsh edges on the beam
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)',
          pointerEvents: 'none', // Non-interactive overlay
        }}
        // Animate the top position from above the viewport to below it
        animate={{ top: ['-2px', '100vh'] }}
        transition={{ duration: 3.5, ease: 'linear', repeat: Infinity }}
      />

      {/* corner brackets */}
      {/* Four corner bracket decorations — tactical HUD framing common in military UI designs */}
      {[
        // Top-left bracket: top and left borders visible
        { pos: { top: 24, left: 24 },   border: { borderTop: '2px solid rgba(230,57,70,0.5)', borderLeft: '2px solid rgba(230,57,70,0.5)' } },
        // Top-right bracket: top and right borders visible
        { pos: { top: 24, right: 24 },  border: { borderTop: '2px solid rgba(230,57,70,0.5)', borderRight: '2px solid rgba(230,57,70,0.5)' } },
        // Bottom-left bracket: bottom and left borders visible
        { pos: { bottom: 24, left: 24 },border: { borderBottom: '2px solid rgba(230,57,70,0.5)', borderLeft: '2px solid rgba(230,57,70,0.5)' } },
        // Bottom-right bracket: bottom and right borders visible
        { pos: { bottom: 24, right: 24 },border: { borderBottom: '2px solid rgba(230,57,70,0.5)', borderRight: '2px solid rgba(230,57,70,0.5)' } },
      ].map(({ pos, border }, i) => (
        // Each bracket fades in sequentially with a 0.1s stagger between corners
        <motion.div key={i}
          style={{ position: 'absolute', width: 32, height: 32, ...pos, ...border }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.1 }}
        />
      ))}

      {/* AnimatePresence enables the exit fade-out when 'done' becomes true */}
      <AnimatePresence>
        {/* Only render the HUD content while the boot sequence is running (not done) */}
        {!done && (
          // Main content column: NeonShield, title, progress, and version footer
          <motion.div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 10, padding: '0 24px' }}
            // Fade in on mount, fade out on exit (when done === true)
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Animated shield logo with radar rings — central DMS identity mark */}
            <NeonShield />

            {/* Title block: "DISASTER MANAGEMENT" heading + platform subtitle */}
            <motion.div style={{ textAlign: 'center' }}
              // Slides up and fades in shortly after the shield appears
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}>
              {/* Main heading: gradient text from white through brand red to orange */}
              <h1 style={{
                fontFamily: "'Rajdhani', 'Inter', sans-serif", // Rajdhani: DMS brand font for headings
                fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', // Fluid type: scales between mobile and desktop
                fontWeight: 800, letterSpacing: '0.18em',
                textTransform: 'uppercase', margin: 0,
                // Gradient text using background-clip technique for cross-browser neon effect
                background: 'linear-gradient(135deg, #ffffff 0%, #E63946 50%, #FF7A00 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                DISASTER MANAGEMENT
              </h1>
              {/* Subtitle: platform descriptor in dim cyan monospace for secondary HUD label style */}
              <div style={{
                fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.5em',
                color: 'rgba(0,212,255,0.5)', marginTop: 6, textTransform: 'uppercase',
              }}>
                EMERGENCY OPERATIONS PLATFORM
              </div>
            </motion.div>

            {/* Status and progress block: blinking dot + step label + progress bar + data ticker */}
            <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 420 }}
              // Fades in after title to maintain visual hierarchy during boot sequence
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              {/* Status row: blinking indicator dot and animated step label text */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                {/* Blinking red dot: pulses opacity to simulate an active status indicator */}
                <motion.div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#E63946',
                    boxShadow: '0 0 8px #E63946, 0 0 20px rgba(230,57,70,0.6)', flexShrink: 0 }}
                  // Opacity oscillates between full and 30% at 0.8s period to create a heartbeat blink
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                {/* AnimatePresence + key={step.key} ensures each new step label animates in/out */}
                <AnimatePresence mode="wait">
                  {/* Step label text: green when system ready (pct===100), dim white otherwise */}
                  <motion.span key={step.key}
                    style={{
                      fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.12em',
                      // "SYSTEM READY" shown in green with glow; all other steps in muted white
                      color: step.pct === 100 ? '#00ff88' : 'rgba(255,255,255,0.55)',
                      textShadow: step.pct === 100 ? '0 0 12px rgba(0,255,136,0.6)' : 'none',
                    }}
                    // Slide up into view and slide up out of view for smooth step transitions
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
                    {/* Render the current boot step's label (e.g., "ACQUIRING LOCATION…") */}
                    {step.label}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Boot progress bar — advances in width as each STEPS entry is reached */}
              <ProgressBar pct={step.pct} />
              {/* Randomly cycling hex byte display — ambient data stream visual effect */}
              <DataTicker />
            </motion.div>

            {/* Version footer: app version, connection status, encryption standard */}
            {/* Communicates to users that the platform uses secure encrypted connections (AES-256) */}
            <motion.div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.15)',
              letterSpacing: '0.2em', textTransform: 'uppercase' }}
              // Delayed fade-in; appears last to not distract from the boot sequence above
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              v2.0.0 &nbsp;|&nbsp; SECURE CONNECTION &nbsp;|&nbsp; AES-256
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}