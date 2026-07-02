import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/* ─────────────────────────────────────────────────────────────
   NEON SPLASH — professional animated emergency ops screen
   Inspired by HUD / tactical dashboard templates
───────────────────────────────────────────────────────────── */

const STEPS = [
  { key: 'init',  pct: 0,   label: 'INITIALIZING SYSTEM…' },
  { key: 'loc',   pct: 18,  label: 'ACQUIRING LOCATION…' },
  { key: 'net',   pct: 38,  label: 'CONNECTING TO NETWORK…' },
  { key: 'ai',    pct: 62,  label: 'LOADING AI ENGINE…' },
  { key: 'db',    pct: 82,  label: 'SYNCING DATABASE…' },
  { key: 'ready', pct: 100, label: 'SYSTEM READY' },
];

function HexGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
          <polygon points="30,2 56,15 56,39 30,52 4,39 4,15"
            fill="none" stroke="#E63946" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)"/>
    </svg>
  );
}

function CircuitLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cglow"><feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#cglow)" stroke="#00d4ff" strokeWidth="1" fill="none">
        <line x1="0" y1="20%" x2="15%" y2="20%"/>
        <line x1="15%" y1="20%" x2="20%" y2="30%"/>
        <circle cx="20%" cy="30%" r="3" fill="#00d4ff"/>
        <line x1="20%" y1="30%" x2="35%" y2="30%"/>
        <line x1="100%" y1="25%" x2="80%" y2="25%"/>
        <line x1="80%" y1="25%" x2="75%" y2="35%"/>
        <circle cx="75%" cy="35%" r="3" fill="#00d4ff"/>
        <line x1="75%" y1="35%" x2="60%" y2="35%"/>
        <line x1="0" y1="75%" x2="12%" y2="75%"/>
        <line x1="12%" y1="75%" x2="18%" y2="65%"/>
        <circle cx="18%" cy="65%" r="3" fill="#E63946"/>
        <line x1="18%" y1="65%" x2="30%" y2="65%"/>
        <line x1="100%" y1="80%" x2="85%" y2="80%"/>
        <line x1="85%" y1="80%" x2="78%" y2="70%"/>
        <circle cx="78%" cy="70%" r="3" fill="#E63946"/>
        <line x1="78%" y1="70%" x2="65%" y2="70%"/>
      </g>
    </svg>
  );
}

function RadarRing({ delay = 0 }) {
  return (
    <motion.div
      className="absolute rounded-full border"
      style={{ borderColor: 'rgba(230,57,70,0.4)', left: '50%', top: '50%', x: '-50%', y: '-50%' }}
      initial={{ width: 60, height: 60, opacity: 0.8 }}
      animate={{ width: 340, height: 340, opacity: 0 }}
      transition={{ duration: 2.8, delay, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.2 }}
    />
  );
}

function NeonShield() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <RadarRing delay={0} />
      <RadarRing delay={0.8} />
      <RadarRing delay={1.6} />

      {/* spinning outer ring */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ width: 120, height: 120, borderColor: 'rgba(230,57,70,0.3)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      >
        {[0, 90, 180, 270].map(deg => (
          <div key={deg} className="absolute" style={{
            width: 8, height: 8, top: '50%', left: '50%',
            transform: `rotate(${deg}deg) translateX(56px) translate(-50%,-50%)`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#E63946',
              boxShadow: '0 0 8px #E63946, 0 0 20px rgba(230,57,70,0.6)' }}/>
          </div>
        ))}
      </motion.div>

      {/* counter-spinning inner ring */}
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 90, height: 90, borderColor: 'rgba(0,212,255,0.25)', borderStyle: 'dashed' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
      />

      {/* core */}
      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 68, height: 68,
          background: 'linear-gradient(135deg, #1a0a0c, #2d0810)',
          border: '2px solid rgba(230,57,70,0.5)',
        }}
        animate={{ boxShadow: [
          '0 0 30px rgba(230,57,70,0.4), 0 0 80px rgba(230,57,70,0.15), inset 0 0 20px rgba(230,57,70,0.1)',
          '0 0 50px rgba(230,57,70,0.7), 0 0 120px rgba(230,57,70,0.3), inset 0 0 30px rgba(230,57,70,0.2)',
          '0 0 30px rgba(230,57,70,0.4), 0 0 80px rgba(230,57,70,0.15), inset 0 0 20px rgba(230,57,70,0.1)',
        ]}}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
      >
        <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
          <path d="M16 2L3 7.5V18.5C3 25.5 9 31.5 16 34C23 31.5 29 25.5 29 18.5V7.5L16 2Z"
            fill="rgba(230,57,70,0.15)" stroke="#E63946" strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 0 6px #E63946)' }}/>
          <path d="M11 18l4 4 6-8" stroke="#ff2d3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 4px #ff2d3d)' }}/>
        </svg>
      </motion.div>
    </div>
  );
}

function ProgressBar({ pct }) {
  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{
        height: 3, borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', position: 'relative',
      }}>
        <motion.div
          style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, #E63946, #FF7A00, #ff2d6a)',
            boxShadow: '0 0 12px rgba(230,57,70,0.6)',
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
        <motion.div
          style={{
            position: 'absolute', top: 0, bottom: 0, width: 60,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
          animate={{ left: ['-15%', '115%'] }}
          transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.3 }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>SYS.BOOT</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#E63946',
          textShadow: '0 0 8px rgba(230,57,70,0.6)' }}>{pct}%</span>
      </div>
    </div>
  );
}

function DataTicker() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 130);
    return () => clearInterval(id);
  }, []);
  const rand = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  const hex = Array.from({ length: 6 }, rand).join(' ');
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,212,255,0.35)', letterSpacing: '0.1em' }}>
      {hex}
    </div>
  );
}

export default function Splash() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const delays = [0, 600, 1100, 1700, 2300, 2900];
    const timers = delays.map((d, i) => setTimeout(() => setStepIdx(i), d));
    const finish = setTimeout(() => {
      setDone(true);
      setTimeout(() => navigate('/login'), 700);
    }, 3700);
    return () => { timers.forEach(clearTimeout); clearTimeout(finish); };
  }, [navigate]);

  const step = STEPS[stepIdx] || STEPS[STEPS.length - 1];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#04080f',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <HexGrid />
      <CircuitLines />

      {/* moving scan beam */}
      <motion.div
        style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)',
          pointerEvents: 'none',
        }}
        animate={{ top: ['-2px', '100vh'] }}
        transition={{ duration: 3.5, ease: 'linear', repeat: Infinity }}
      />

      {/* corner brackets */}
      {[
        { pos: { top: 24, left: 24 },   border: { borderTop: '2px solid rgba(230,57,70,0.5)', borderLeft: '2px solid rgba(230,57,70,0.5)' } },
        { pos: { top: 24, right: 24 },  border: { borderTop: '2px solid rgba(230,57,70,0.5)', borderRight: '2px solid rgba(230,57,70,0.5)' } },
        { pos: { bottom: 24, left: 24 },border: { borderBottom: '2px solid rgba(230,57,70,0.5)', borderLeft: '2px solid rgba(230,57,70,0.5)' } },
        { pos: { bottom: 24, right: 24 },border: { borderBottom: '2px solid rgba(230,57,70,0.5)', borderRight: '2px solid rgba(230,57,70,0.5)' } },
      ].map(({ pos, border }, i) => (
        <motion.div key={i}
          style={{ position: 'absolute', width: 32, height: 32, ...pos, ...border }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.1 }}
        />
      ))}

      <AnimatePresence>
        {!done && (
          <motion.div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 10, padding: '0 24px' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <NeonShield />

            <motion.div style={{ textAlign: 'center' }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}>
              <h1 style={{
                fontFamily: "'Rajdhani', 'Inter', sans-serif",
                fontSize: 'clamp(1.4rem, 5vw, 2.2rem)',
                fontWeight: 800, letterSpacing: '0.18em',
                textTransform: 'uppercase', margin: 0,
                background: 'linear-gradient(135deg, #ffffff 0%, #E63946 50%, #FF7A00 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                DISASTER MANAGEMENT
              </h1>
              <div style={{
                fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.5em',
                color: 'rgba(0,212,255,0.5)', marginTop: 6, textTransform: 'uppercase',
              }}>
                EMERGENCY OPERATIONS PLATFORM
              </div>
            </motion.div>

            <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 420 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <motion.div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#E63946',
                    boxShadow: '0 0 8px #E63946, 0 0 20px rgba(230,57,70,0.6)', flexShrink: 0 }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <AnimatePresence mode="wait">
                  <motion.span key={step.key}
                    style={{
                      fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.12em',
                      color: step.pct === 100 ? '#00ff88' : 'rgba(255,255,255,0.55)',
                      textShadow: step.pct === 100 ? '0 0 12px rgba(0,255,136,0.6)' : 'none',
                    }}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
                    {step.label}
                  </motion.span>
                </AnimatePresence>
              </div>

              <ProgressBar pct={step.pct} />
              <DataTicker />
            </motion.div>

            <motion.div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.15)',
              letterSpacing: '0.2em', textTransform: 'uppercase' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              v2.0.0 &nbsp;|&nbsp; SECURE CONNECTION &nbsp;|&nbsp; AES-256
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
