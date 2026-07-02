import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Darken a hex color by ~20% for hover states
function _darken(hex) {
  try {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - 40);
    const g = Math.max(0, ((n >> 8) & 0xff) - 40);
    const b = Math.max(0, (n & 0xff) - 40);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch { return hex; }
}

// Synchronously hydrate from localStorage — clear if token is expired or missing
function _isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch { return false; }
}
const _savedToken = localStorage.getItem('authToken');
const _tokenValid = _isTokenValid(_savedToken);
if (!_tokenValid) {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}
const _savedUser = _tokenValid ? (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })() : null;

// Auth Store
export const useAuthStore = create(
  immer((set) => ({
    user: _savedUser,
    token: _savedToken,
    isLoading: false,
    error: null,

    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    login: async (user, token) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('authToken', token);
      // Re-hydrate per-user UI settings after login
      const { setTheme, setLanguage, setAccentColor } = useUIStore.getState();
      const key = (k) => localStorage.getItem(`${k}_${user.email}`) || localStorage.getItem(k);
      const savedTheme    = key('theme')       || 'light';
      const savedLang     = key('language')    || 'en';
      const savedAccent   = key('accentColor') || '#E63946';
      setTheme(savedTheme);
      setLanguage(savedLang);
      setAccentColor(savedAccent);
      set((state) => { state.user = user; state.token = token; state.error = null; });
    },

    logout: () => set((state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
    }),

    initializeAuth: () => {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('authToken');
      if (savedUser && savedToken) {
        set({
          user: JSON.parse(savedUser),
          token: savedToken,
        });
      }
    },
  }))
);

// Per-user setting helpers — keys scoped by user email so each account is isolated
function _uiKey(key) {
  try {
    const u = JSON.parse(localStorage.getItem('user'));
    return u?.email ? `${key}_${u.email}` : key;
  } catch { return key; }
}
function _getUISetting(key, fallback) {
  return localStorage.getItem(_uiKey(key)) || fallback;
}
function _setUISetting(key, value) {
  localStorage.setItem(_uiKey(key), value);
}

// UI Store
export const useUIStore = create(
  immer((set) => ({
    theme: _getUISetting('theme', 'light'),
    language: _getUISetting('language', 'en'),
    accentColor: _getUISetting('accentColor', '#E63946'),
    sidebarOpen: true,
    notifications: [],

    setTheme: (theme) => set((state) => {
      state.theme = theme;
      _setUISetting('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }),

    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = newTheme;
      _setUISetting('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }),

    setAccentColor: (color) => set((state) => {
      state.accentColor = color;
      _setUISetting('accentColor', color);
      // Update all accent-derived CSS variables so every button/border/glow changes
      document.documentElement.style.setProperty('--accent', color);
      document.documentElement.style.setProperty('--accent-hover', _darken(color));
      document.documentElement.style.setProperty('--accent-soft', color + '18');
      document.documentElement.style.setProperty('--scrollbar-thumb', color);
      document.documentElement.style.setProperty('--scrollbar-thumb-hover', _darken(color));
    }),

    setLanguage: (language) => set((state) => {
      state.language = language;
      _setUISetting('language', language);
      const isArabic = language === 'ar';
      document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', language);
      // Synchronously change i18n language so all t() calls re-render immediately
      try {
        if (window.__i18n_instance__) {
          window.__i18n_instance__.changeLanguage(language);
        }
      } catch (_) {}
    }),

    toggleSidebar: () => set((state) => {
      state.sidebarOpen = !state.sidebarOpen;
    }),

    addNotification: (notification) => set((state) => {
      state.notifications.push({
        id: Date.now(),
        timeout: 5000,
        ...notification,
      });
    }),

    removeNotification: (id) => set((state) => {
      state.notifications = state.notifications.filter(n => n.id !== id);
    }),
  }))
);

// Incident Store
export const useIncidentStore = create(
  immer((set) => ({
    incidents: [],
    selectedIncident: null,
    filters: {},
    isLoading: false,
    error: null,

    setIncidents: (incidents) => set({ incidents }),
    setSelectedIncident: (incident) => set({ selectedIncident: incident }),
    setFilters: (filters) => set({ filters }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    addIncident: (incident) => set((state) => {
      state.incidents.unshift(incident);
    }),

    updateIncident: (id, updates) => set((state) => {
      const index = state.incidents.findIndex(i => i.id === id);
      if (index !== -1) {
        state.incidents[index] = { ...state.incidents[index], ...updates };
      }
    }),

    removeIncident: (id) => set((state) => {
      state.incidents = state.incidents.filter(i => i.id !== id);
    }),
  }))
);

// Resource Store
export const useResourceStore = create(
  immer((set) => ({
    resources: [],
    selectedResource: null,
    filters: {},
    isLoading: false,
    error: null,

    setResources: (resources) => set({ resources }),
    setSelectedResource: (resource) => set({ selectedResource: resource }),
    setFilters: (filters) => set({ filters }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    addResource: (resource) => set((state) => {
      state.resources.push(resource);
    }),

    updateResource: (id, updates) => set((state) => {
      const index = state.resources.findIndex(r => r.id === id);
      if (index !== -1) {
        state.resources[index] = { ...state.resources[index], ...updates };
      }
    }),

    removeResource: (id) => set((state) => {
      state.resources = state.resources.filter(r => r.id !== id);
    }),
  }))
);

// Alert Store
export const useAlertStore = create(
  immer((set) => ({
    alerts: [],
    unreadCount: 0,
    isLoading: false,

    setAlerts: (alerts) => set({ alerts }),
    setUnreadCount: (count) => set({ unreadCount: count }),
    setLoading: (isLoading) => set({ isLoading }),

    addAlert: (alert) => set((state) => {
      state.alerts.unshift(alert);
      state.unreadCount += 1;
    }),

    markAsRead: (id) => set((state) => {
      const alert = state.alerts.find(a => a.id === id);
      if (alert && !alert.isRead) {
        alert.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    }),
  }))
);
