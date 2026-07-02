import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useUIStore } from '../store';

// ─── Role accent colors ────────────────────────────────────────────────────────
const ROLE_ACCENT = {
  ADMIN:       '#E63946',
  RESPONDER:   '#FF7A00',
  RESCUE_TEAM: '#f59e0b',
  OFFICIAL:    '#7c3aed',
  CITIZEN:     '#059669',
};

// Slightly lighter tint used for badge text
const ROLE_ACCENT_TEXT = {
  ADMIN:       '#fca5a5',
  RESPONDER:   '#fdba74',
  RESCUE_TEAM: '#fcd34d',
  OFFICIAL:    '#c4b5fd',
  CITIZEN:     '#6ee7b7',
};

// ─── Role banner config ────────────────────────────────────────────────────────
const ROLE_BANNER = {
  ADMIN: {
    label: 'System Administrator',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6
          3.598 6S3 8.632 3 12c0 3.368.598 6 .598 6a11.959 11.959 0 008.402
          3.286A11.959 11.959 0 0020.402 18S21 15.368 21 12c0-3.368-.598-6-.598-6
          A11.959 11.959 0 0012 2.714z"/>
      </svg>
    ),
  },
  RESCUE_TEAM: {
    label: 'Rescue Team',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M9 17H5a2 2 0 01-2-2V9a2 2 0 012-2h11l3 4v4a2 2 0 01-2 2h-2"/>
        <circle cx="7.5" cy="17.5" r="1.5"/>
        <circle cx="16.5" cy="17.5" r="1.5"/>
        <path d="M9 7V5l2-2h2l2 2v2"/>
      </svg>
    ),
  },
  RESPONDER: {
    label: 'Emergency Responder',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  OFFICIAL: {
    label: 'Government Official',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11"/>
      </svg>
    ),
  },
  CITIZEN: {
    label: 'Community Member',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    ),
  },
};

// ─── Role-specific nav items ───────────────────────────────────────────────────
const ROLE_NAV = {
  CITIZEN: [
    { to: '/layout/dashboard',       key: 'dashboard',       iconKey: 'dashboard' },
    { to: '/layout/my-reports',      key: 'my_reports',      iconKey: 'myReports' },
    { to: '/layout/incidents/create',key: 'report_incident', iconKey: 'report'    },
    { to: '/layout/map',             key: 'map_view',        iconKey: 'map'       },
    { to: '/layout/alerts',          key: 'alerts',          iconKey: 'alerts'    },
    { to: '/layout/settings',        key: 'settings',        iconKey: 'settings'  },
  ],
  RESCUE_TEAM: [
    { to: '/layout/dashboard',  key: 'dashboard', iconKey: 'dashboard' },
    { to: '/layout/incidents',  key: 'incidents', iconKey: 'incidents' },
    { to: '/layout/map',        key: 'map_view',  iconKey: 'map'       },
    { to: '/layout/alerts',     key: 'alerts',    iconKey: 'alerts'    },
    { to: '/layout/resources',  key: 'resources', iconKey: 'resources' },
    { to: '/layout/settings',   key: 'settings',  iconKey: 'settings'  },
  ],
  RESPONDER: [
    { to: '/layout/dashboard',  key: 'dashboard', iconKey: 'dashboard' },
    { to: '/layout/incidents',  key: 'incidents', iconKey: 'incidents' },
    { to: '/layout/map',        key: 'map_view',  iconKey: 'map'       },
    { to: '/layout/alerts',     key: 'alerts',    iconKey: 'alerts'    },
    { to: '/layout/resources',  key: 'resources', iconKey: 'resources' },
    { to: '/layout/settings',   key: 'settings',  iconKey: 'settings'  },
  ],
  OFFICIAL: [
    { to: '/layout/dashboard',  key: 'dashboard', iconKey: 'dashboard' },
    { to: '/layout/incidents',  key: 'incidents', iconKey: 'incidents' },
    { to: '/layout/map',        key: 'map_view',  iconKey: 'map'       },
    { to: '/layout/alerts',     key: 'alerts',    iconKey: 'alerts'    },
    { to: '/layout/resources',  key: 'resources', iconKey: 'resources' },
    { to: '/layout/reports',    key: 'reports',   iconKey: 'reports'   },
    { to: '/layout/settings',   key: 'settings',  iconKey: 'settings'  },
  ],
  ADMIN: [
    { to: '/layout/dashboard',  key: 'dashboard', iconKey: 'dashboard' },
    { to: '/layout/incidents',  key: 'incidents', iconKey: 'incidents' },
    { to: '/layout/map',        key: 'map_view',  iconKey: 'map'       },
    { to: '/layout/alerts',     key: 'alerts',    iconKey: 'alerts'    },
    { to: '/layout/resources',  key: 'resources', iconKey: 'resources' },
    { to: '/layout/reports',    key: 'reports',   iconKey: 'reports'   },
    { to: '/layout/users',      key: 'users',     iconKey: 'users'     },
    { to: '/layout/settings',   key: 'settings',  iconKey: 'settings'  },
  ],
};

// ─── SVG icon map ──────────────────────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  incidents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73
        0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898
        0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
    </svg>
  ),
  myReports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1
        1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  report: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 4v16m8-8H4"/>
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  alerts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0
        10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/>
    </svg>
  ),
  resources: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2
        0 00-2-2z"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12"/>
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2
        2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2
        2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0
        0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0
        002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065
        2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066
        2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572
        1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724
        1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0
        001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0
        01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
    </svg>
  ),
};

// ─── Pulsing online dot ────────────────────────────────────────────────────────
function OnlineDot({ accent }) {
  return (
    <span className="absolute bottom-0 end-0 flex h-3 w-3">
      <motion.span
        animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: accent }}
      />
      <span className="relative inline-flex rounded-full h-3 w-3 border-2 border-white/10"
        style={{ background: accent }} />
    </span>
  );
}

// ─── Nav item with motion ──────────────────────────────────────────────────────
function NavItem({ item, accent, isActive, index }) {
  const icon = Icons[item.iconKey];
  const active = isActive(item.to);

  return (
    <motion.div
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.22, ease: 'easeOut' }}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Link
          to={item.to}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
          style={{
            background: active ? `${accent}22` : 'transparent',
            color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
            borderInlineStart: active ? `3px solid ${accent}` : '3px solid transparent',
          }}
          onMouseEnter={(e) => {
            if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            if (!active) e.currentTarget.style.background = 'transparent';
          }}
        >
          <span className="flex-shrink-0 transition-colors duration-150"
            style={{ color: active ? accent : 'rgba(255,255,255,0.45)' }}>
            {icon}
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          {active && (
            <motion.div
              layoutId="activeIndicator"
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: accent }}
            />
          )}
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, accentColor } = useUIStore();
  const { t } = useTranslation();
  const role = user?.role || 'CITIZEN';
  const accent = accentColor || ROLE_ACCENT[role] || '#E63946';
  const accentText = ROLE_ACCENT_TEXT[role] || '#fca5a5';
  const banner = ROLE_BANNER[role] || ROLE_BANNER.CITIZEN;
  const navItems = (ROLE_NAV[role] || ROLE_NAV.CITIZEN).map((item) => ({
    ...item,
    label: t(`nav.${item.key}`, item.key),
  }));

  const isActive = (to) => {
    if (to === '/layout/dashboard') return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const gradient = `linear-gradient(180deg, #050505 0%, #080808 60%, #000000 100%)`;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : (document.documentElement.dir === 'rtl' ? 280 : -280) }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="fixed start-0 top-0 h-full w-64 z-30 lg:relative lg:translate-x-0 flex flex-col"
        style={{ background: gradient, boxShadow: '4px 0 32px rgba(0,0,0,0.35)' }}
      >

        {/* ── Logo header ── */}
        <div className="p-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                boxShadow: `0 0 20px ${accent}40`,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948
                  3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949
                  3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12
                  15.75h.007v.008H12v-.008z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-white font-black text-base leading-tight tracking-wide">DMS</h2>
              <p className="text-white/50 text-xs font-medium">{t('splash.title_line1')}</p>
            </div>
          </div>
        </div>

        {/* ── Role banner pill ── */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit text-xs font-semibold"
            style={{ background: `${accent}20`, color: accentText, border: `1px solid ${accent}35` }}
          >
            <span style={{ color: accentText }}>{banner.icon}</span>
            <span>{banner.label}</span>
          </div>
        </div>

        {/* ── User profile row ── */}
        <div className="px-4 pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar with pulsing dot */}
            <div className="relative flex-shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
              >
                {user?.firstName?.[0]?.toUpperCase()}
                {user?.lastName?.[0]?.toUpperCase()}
              </div>
              <OnlineDot accent={accent} />
            </div>

            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${accent}28`, color: accentText }}
              >
                {t(`roles.${user?.role}`, user?.role)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Nav items (staggered) ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
          <AnimatePresence>
            {navItems.map((item, index) => (
              <NavItem
                key={item.to}
                item={item}
                accent={accent}
                isActive={isActive}
                index={index}
              />
            ))}
          </AnimatePresence>
        </nav>

        {/* ── Bottom: profile + logout ── */}
        <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-0.5">
          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <Link
              to="/layout/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 text-sm font-medium transition-colors duration-150"
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span className="flex-shrink-0">{Icons.profile}</span>
              {t('nav.profile')}
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 text-sm font-medium transition-colors duration-150"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                e.currentTarget.style.color = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              <span className="flex-shrink-0">{Icons.logout}</span>
              {t('nav.logout')}
            </button>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
