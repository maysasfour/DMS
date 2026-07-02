import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function useCountdown(from) {
  const [count, setCount] = useState(from);
  useEffect(() => {
    if (count <= 0) return;
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);
  return count;
}

export default function NotFound() {
  const navigate = useNavigate();
  const count = useCountdown(10);

  useEffect(() => {
    if (count === 0) navigate('/layout/dashboard');
  }, [count, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-primary)', position: 'relative' }}>

      {/* Hex grid background */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        <defs>
          <pattern id="hex404" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 56,15 56,39 30,52 4,39 4,15" fill="none" stroke="#E63946" strokeWidth="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex404)"/>
      </svg>

      {/* Scan beam */}
      <motion.div className="absolute left-0 right-0 pointer-events-none"
        style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(230,57,70,0.3), transparent)' }}
        animate={{ top: ['-1px', '100%'] }}
        transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
      />

      {/* Corner brackets */}
      {[
        { top: 24, left: 24, borderTop: '2px solid rgba(230,57,70,0.4)', borderLeft: '2px solid rgba(230,57,70,0.4)' },
        { top: 24, right: 24, borderTop: '2px solid rgba(230,57,70,0.4)', borderRight: '2px solid rgba(230,57,70,0.4)' },
        { bottom: 24, left: 24, borderBottom: '2px solid rgba(230,57,70,0.4)', borderLeft: '2px solid rgba(230,57,70,0.4)' },
        { bottom: 24, right: 24, borderBottom: '2px solid rgba(230,57,70,0.4)', borderRight: '2px solid rgba(230,57,70,0.4)' },
      ].map((s, i) => (
        <motion.div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}/>
      ))}

      <div className="relative z-10 text-center px-6">

        {/* Radar rings behind 404 */}
        <div className="relative inline-block mb-6">
          {[180, 280, 380].map((size, i) => (
            <motion.div key={i}
              className="absolute rounded-full"
              style={{
                width: size, height: size,
                top: '50%', left: '50%',
                marginTop: -size / 2, marginLeft: -size / 2,
                border: '1px solid rgba(230,57,70,0.12)',
              }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
            />
          ))}

          {/* 404 glitch text */}
          <motion.div
            style={{
              fontFamily: "'Rajdhani','Inter',sans-serif",
              fontSize: 'clamp(5rem,18vw,10rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              position: 'relative',
              color: 'var(--text-primary)',
            }}
            animate={{ textShadow: [
              '0 0 0px transparent',
              '3px 0 0 rgba(230,57,70,0.7), -3px 0 0 rgba(0,212,255,0.7)',
              '0 0 0px transparent',
              '-2px 0 0 rgba(230,57,70,0.5), 2px 0 0 rgba(0,212,255,0.5)',
              '0 0 0px transparent',
            ]}}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          >
            <span style={{
              background: 'linear-gradient(135deg, var(--text-primary) 0%, #E63946 60%, #FF7A00 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              404
            </span>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: '#E63946', fontFamily: 'monospace', letterSpacing: '0.4em' }}>
            — SIGNAL LOST —
          </p>
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Rajdhani','Inter',sans-serif" }}>
            Page Not Found
          </h2>
          <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            The sector you're trying to reach is offline or doesn't exist in this system.
          </p>

          {/* Countdown ring */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(230,57,70,0.15)" strokeWidth="2"/>
                <motion.circle cx="18" cy="18" r="15" fill="none" stroke="#E63946" strokeWidth="2"
                  strokeLinecap="round" strokeDasharray="94.2"
                  animate={{ strokeDashoffset: 94.2 - (count / 10) * 94.2 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                />
              </svg>
              <span className="text-xs font-black" style={{ color: '#E63946' }}>{count}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Redirecting to dashboard in {count}s
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/layout/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #E63946, #c0202d)',
                  boxShadow: '0 4px 20px rgba(230,57,70,0.35)',
                }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                Go to Dashboard
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <button onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Go Back
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* System status footer */}
        <motion.div className="mt-10 text-xs font-mono"
          style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.2em' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          DMS v2.0 &nbsp;|&nbsp; ERR_ROUTE_NOT_FOUND &nbsp;|&nbsp; 0x404
        </motion.div>
      </div>
    </div>
  );
}
