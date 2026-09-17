/**
 * @file store.js
 * @description Global state management for the Disaster Management System (DMS) frontend.
 *
 * This file defines all Zustand stores used across the DMS application:
 *  - useAuthStore   — Manages authentication state for officers, admins, and team users,
 *                     including JWT token validation and per-user settings rehydration on login.
 *  - useUIStore     — Controls UI preferences (theme, language, accent color, sidebar, notifications)
 *                     persisted per-user in localStorage so each DMS operator sees their own settings.
 *  - useIncidentStore — Holds the list of active/historical incidents, the currently selected
 *                       incident, and filter state for the incident dashboard.
 *  - useResourceStore — Holds emergency resources (vehicles, personnel, equipment) with CRUD helpers.
 *  - useAlertStore  — Manages real-time system alerts and tracks unread counts for the notification badge.
 *
 * All stores use Immer middleware to allow direct mutation of draft state without boilerplate.
 */

// zustand — lightweight React state management library used instead of Redux for simplicity
import { create } from 'zustand';
// immer middleware — lets store reducers mutate state directly; Immer handles immutable updates
import { immer } from 'zustand/middleware/immer';

// ---------------------------------------------------------------------------
// Color Utility
// ---------------------------------------------------------------------------

/**
 * Darkens a hex color by reducing each RGB channel by 40 units (≈20%).
 * Used to generate hover variants of the DMS accent color without an external library.
 * @param {string} hex - A CSS hex color string, e.g. "#E63946".
 * @returns {string} Darkened hex color, or the original if parsing fails.
 */
function _darken(hex) {
  try {
    // Parse the full 24-bit integer from the hex string
    const n = parseInt(hex.replace('#', ''), 16);
    // Extract each channel and clamp to [0, 255] to avoid underflow
    const r = Math.max(0, (n >> 16) - 40);
    const g = Math.max(0, ((n >> 8) & 0xff) - 40);
    const b = Math.max(0, (n & 0xff) - 40);
    // Reconstruct as a zero-padded 2-digit hex string per channel
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch { return hex; } // Gracefully fall back to original color on any parse error
}

// ---------------------------------------------------------------------------
// Token Validation — runs synchronously at module load before any store is created
// ---------------------------------------------------------------------------

/**
 * Validates a JWT token by inspecting its expiry claim (exp).
 * Prevents DMS users from remaining "logged in" with an expired session after a page refresh.
 * @param {string|null} token - JWT access token string.
 * @returns {boolean} True if the token exists and has not expired.
 */
function _isTokenValid(token) {
  if (!token) return false; // No token means definitely invalid
  try {
    // Decode the base64url-encoded payload (second segment of the JWT)
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in Unix seconds; multiply by 1000 to compare with Date.now() (milliseconds)
    return payload.exp * 1000 > Date.now();
  } catch { return false; } // Malformed token — treat as invalid
}

// Attempt to restore a previous session from localStorage on page load
const _savedToken = localStorage.getItem('authToken');
// Check whether the stored token is still within its expiry window
const _tokenValid = _isTokenValid(_savedToken);

// If the token is stale or missing, purge both auth keys to force a fresh login
if (!_tokenValid) {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

// Restore the saved user object only when the token is confirmed valid;
// an IIFE is used to safely handle JSON.parse failures without breaking module init
const _savedUser = _tokenValid ? (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })() : null;

// ---------------------------------------------------------------------------
// Auth Store
// ---------------------------------------------------------------------------

/**
 * useAuthStore — Zustand store for DMS authentication state.
 *
 * Tracks the currently logged-in user (officer, admin, or team member), their JWT token,
 * loading/error state during login requests, and exposes login/logout actions.
 * On login, also triggers rehydration of the user's saved UI preferences.
 */
export const useAuthStore = create(
  // Immer middleware wraps all set() calls so we can mutate state drafts directly
  immer((set) => ({
    // The authenticated DMS user object (id, email, role, name) or null if not logged in
    user: _savedUser,
    // JWT bearer token sent with every API request to the Spring Boot backend
    token: _savedToken,
    // True while an async login/logout request is in flight — used to show spinners
    isLoading: false,
    // Holds the last login error message, displayed in the login form
    error: null,

    // Simple setter — replaces the current user object (e.g. after profile updates)
    setUser: (user) => set({ user }),
    // Simple setter — replaces the JWT token (e.g. after a token refresh)
    setToken: (token) => set({ token }),
    // Simple setter — toggles the loading spinner during async auth operations
    setLoading: (isLoading) => set({ isLoading }),
    // Simple setter — surfaces backend error messages to the UI
    setError: (error) => set({ error }),

    /**
     * login — called after a successful authentication response from the DMS backend.
     * Persists credentials to localStorage so the session survives page refreshes,
     * then restores that user's previously saved theme, language, and accent color.
     * @param {object} user  - Authenticated user payload returned by the backend.
     * @param {string} token - JWT access token for subsequent API requests.
     */
    login: async (user, token) => {
      // Persist credentials so the session is restored on next page load
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('authToken', token);

      // Pull UI setters from the sibling store to restore this user's preferences
      const { setTheme, setLanguage, setAccentColor } = useUIStore.getState();

      // Helper: prefer a user-scoped key (e.g. "theme_alice@dms.com") over the global key
      // so each DMS operator keeps their own layout and color scheme
      const key = (k) => localStorage.getItem(`${k}_${user.email}`) || localStorage.getItem(k);

      // Resolve saved preferences, falling back to system defaults
      const savedTheme    = key('theme')       || 'light';   // Default to light mode
      const savedLang     = key('language')    || 'en';      // Default to English
      const savedAccent   = key('accentColor') || '#E63946'; // Default DMS red accent

      // Apply restored preferences — each setter also updates CSS variables and the DOM
      setTheme(savedTheme);
      setLanguage(savedLang);
      setAccentColor(savedAccent);

      // Commit user and token to the auth store state and clear any previous error
      set((state) => { state.user = user; state.token = token; state.error = null; });
    },

    /**
     * logout — clears all auth state and removes persisted credentials.
     * After this action the user is redirected to the login page by route guards.
     */
    logout: () => set((state) => {
      state.user = null;   // Remove user object from state
      state.token = null;  // Remove JWT so API calls can no longer be authenticated
      localStorage.removeItem('user');      // Clear persisted user from storage
      localStorage.removeItem('authToken'); // Clear persisted token from storage
    }),

    /**
     * initializeAuth — synchronously restores auth state from localStorage.
     * Intended to be called once at app startup (e.g. in App.jsx) to rehydrate
     * the store after a page refresh without requiring another login round-trip.
     */
    initializeAuth: () => {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('authToken');
      // Only hydrate if both values are present (token validity was already checked above)
      if (savedUser && savedToken) {
        set({
          user: JSON.parse(savedUser), // Deserialize the stored user JSON
          token: savedToken,           // Restore the JWT string as-is
        });
      }
    },
  }))
);

// ---------------------------------------------------------------------------
// UI Preference Helpers — localStorage keys are scoped per user email
// ---------------------------------------------------------------------------

/**
 * Builds a localStorage key scoped to the currently logged-in user's email.
 * This ensures that when multiple DMS operators share the same browser, each
 * operator's theme and language settings remain independent.
 * @param {string} key - Base preference key, e.g. "theme".
 * @returns {string} Scoped key like "theme_alice@dms.com", or the bare key if no user is logged in.
 */
function _uiKey(key) {
  try {
    const u = JSON.parse(localStorage.getItem('user'));
    // Scope by email if available, otherwise fall back to the global key
    return u?.email ? `${key}_${u.email}` : key;
  } catch { return key; } // JSON parse failure — treat as anonymous
}

/**
 * Reads a UI preference from localStorage using a user-scoped key.
 * @param {string} key      - Preference name, e.g. "language".
 * @param {string} fallback - Value to return if no saved preference exists.
 * @returns {string} Stored value or the fallback default.
 */
function _getUISetting(key, fallback) {
  return localStorage.getItem(_uiKey(key)) || fallback;
}

/**
 * Writes a UI preference to localStorage under the current user's scoped key.
 * @param {string} key   - Preference name.
 * @param {string} value - Preference value to store.
 */
function _setUISetting(key, value) {
  localStorage.setItem(_uiKey(key), value);
}

// ---------------------------------------------------------------------------
// UI Store
// ---------------------------------------------------------------------------

/**
 * useUIStore — Zustand store for DMS user interface preferences.
 *
 * Controls the visual and localization settings that affect every screen
 * in the DMS portal: the color theme, UI language (with RTL support for Arabic),
 * the neon cyberpunk accent color, sidebar visibility, and transient notifications.
 * All settings are persisted per-user in localStorage.
 */
export const useUIStore = create(
  immer((set) => ({
    // Current color theme: "light" or "dark" — initialized from the user's last saved preference
    theme: _getUISetting('theme', 'light'),
    // Active locale code, e.g. "en", "ar", "fr", "es", "tr" — drives i18n translations across the DMS UI
    language: _getUISetting('language', 'en'),
    // Hex accent color used for buttons, borders, glows, and scrollbars across the neon cyberpunk design system
    accentColor: _getUISetting('accentColor', '#E63946'),
    // Whether the navigation sidebar is currently expanded (true) or collapsed (false)
    sidebarOpen: true,
    // Array of transient notification objects shown as toast banners (e.g. "Incident created successfully")
    notifications: [],

    /**
     * setTheme — explicitly sets the theme to "light" or "dark" and synchronizes the DOM.
     * Adding/removing the "dark" class on <html> triggers Tailwind's dark-mode CSS rules.
     * @param {string} theme - "light" or "dark".
     */
    setTheme: (theme) => set((state) => {
      state.theme = theme;
      _setUISetting('theme', theme); // Persist so the theme is restored on next login
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');    // Enable Tailwind dark mode
      } else {
        document.documentElement.classList.remove('dark'); // Return to light mode
      }
    }),

    /**
     * toggleTheme — flips between "light" and "dark" (used by the theme toggle button in the header).
     * Persists the new theme and updates the DOM class so Tailwind styles take effect immediately.
     */
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'; // Invert current theme
      state.theme = newTheme;
      _setUISetting('theme', newTheme); // Persist the flipped theme
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }),

    /**
     * setAccentColor — updates the DMS accent color and propagates it to all CSS custom properties
     * that make up the neon cyberpunk design system (buttons, borders, glows, scrollbars).
     * @param {string} color - Hex color string, e.g. "#E63946".
     */
    setAccentColor: (color) => set((state) => {
      state.accentColor = color;
      _setUISetting('accentColor', color); // Persist for next session
      // Update all accent-derived CSS variables so every button/border/glow changes
      document.documentElement.style.setProperty('--accent', color);                      // Primary accent used on CTA buttons and active nav items
      document.documentElement.style.setProperty('--accent-hover', _darken(color));       // Darkened variant for hover/press states
      document.documentElement.style.setProperty('--accent-soft', color + '18');          // 9% opacity tint used for highlighted backgrounds
      document.documentElement.style.setProperty('--scrollbar-thumb', color);             // Custom scrollbar thumb color
      document.documentElement.style.setProperty('--scrollbar-thumb-hover', _darken(color)); // Scrollbar thumb hover color
    }),

    /**
     * setLanguage — changes the UI language for all DMS pages and updates document direction.
     * Arabic ("ar") requires the document to switch to RTL layout; all other supported
     * languages (en, fr, es, tr) use LTR. Also notifies the i18next instance so all
     * useTranslation() calls re-render with the new locale immediately.
     * @param {string} language - BCP 47 locale code, e.g. "ar", "en", "fr".
     */
    setLanguage: (language) => set((state) => {
      state.language = language;
      _setUISetting('language', language); // Persist for next session

      const isArabic = language === 'ar'; // Arabic is the only RTL language currently supported
      // Set document direction so the browser flips flex/margin/text-align for RTL
      document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
      // Set the lang attribute for accessibility tools and browser spellcheck
      document.documentElement.setAttribute('lang', language);

      // Synchronously change i18n language so all t() calls re-render immediately
      try {
        // __i18n_instance__ is attached to window by the i18n setup file (src/i18n/index.js)
        if (window.__i18n_instance__) {
          window.__i18n_instance__.changeLanguage(language);
        }
      } catch (_) {} // Silently ignore if i18n isn't ready yet (e.g. during initial load)
    }),

    /**
     * toggleSidebar — opens or closes the DMS navigation sidebar.
     * Components observe sidebarOpen to expand/collapse the sidebar without a prop-drilling chain.
     */
    toggleSidebar: () => set((state) => {
      state.sidebarOpen = !state.sidebarOpen; // Flip current visibility state
    }),

    /**
     * addNotification — pushes a new toast notification into the queue.
     * Used throughout the DMS to surface success/error feedback (e.g. "Incident #42 updated").
     * Each notification receives a unique timestamp-based id and a default 5-second timeout.
     * @param {object} notification - Notification payload (type, message, title, etc.).
     */
    addNotification: (notification) => set((state) => {
      state.notifications.push({
        id: Date.now(),   // Unique id — used as the React key and for targeted removal
        timeout: 5000,    // Auto-dismiss after 5 seconds if the consumer implements it
        ...notification,  // Caller-supplied fields (e.g. type: "success", message: "...")
      });
    }),

    /**
     * removeNotification — removes a toast from the queue by its id.
     * Called when the user dismisses a notification or when the auto-dismiss timer fires.
     * @param {number} id - The notification id to remove.
     */
    removeNotification: (id) => set((state) => {
      // Filter out the dismissed notification; leave all others intact
      state.notifications = state.notifications.filter(n => n.id !== id);
    }),
  }))
);

// ---------------------------------------------------------------------------
// Incident Store
// ---------------------------------------------------------------------------

/**
 * useIncidentStore — Zustand store for DMS incident management.
 *
 * Holds the full list of incidents (fires, floods, earthquakes, etc.) fetched from the
 * backend, the incident currently viewed in the detail panel, active filter criteria
 * for the incident dashboard/map, and async loading/error state.
 */
export const useIncidentStore = create(
  immer((set) => ({
    // Array of all incident objects currently loaded (may be filtered or paginated)
    incidents: [],
    // The incident object currently open in the detail/edit view, or null
    selectedIncident: null,
    // Active filter criteria applied to the incident list (e.g. { status: "ACTIVE", type: "FIRE" })
    filters: {},
    // True while incidents are being fetched from the backend API
    isLoading: false,
    // Holds any error returned during a fetch or mutation operation
    error: null,

    // Replaces the full incidents list — typically called after a successful GET /incidents response
    setIncidents: (incidents) => set({ incidents }),
    // Sets the incident currently being viewed or edited in the detail panel
    setSelectedIncident: (incident) => set({ selectedIncident: incident }),
    // Applies new filter criteria — triggers a re-fetch or client-side filter in the incident list component
    setFilters: (filters) => set({ filters }),
    // Toggles the loading indicator for async fetch operations
    setLoading: (isLoading) => set({ isLoading }),
    // Surfaces backend or network error messages to the incident list UI
    setError: (error) => set({ error }),

    /**
     * addIncident — prepends a newly created incident to the top of the list.
     * Using unshift() ensures the most recent incident appears first without re-sorting.
     * @param {object} incident - Fully formed incident object returned by the backend after creation.
     */
    addIncident: (incident) => set((state) => {
      state.incidents.unshift(incident); // Most recent incident shown at top of the dashboard list
    }),

    /**
     * updateIncident — patches an existing incident in the local store after a successful PUT/PATCH.
     * Merges the provided updates into the incident matched by id, preserving all other fields.
     * @param {number|string} id      - The incident id to update.
     * @param {object}        updates - Partial incident fields to merge (e.g. { status: "RESOLVED" }).
     */
    updateIncident: (id, updates) => set((state) => {
      const index = state.incidents.findIndex(i => i.id === id); // Locate the incident by id
      if (index !== -1) {
        // Spread existing fields first, then override with the incoming updates
        state.incidents[index] = { ...state.incidents[index], ...updates };
      }
    }),

    /**
     * removeIncident — removes a deleted incident from the local store by id.
     * Called after a successful DELETE /incidents/:id response to keep the UI in sync.
     * @param {number|string} id - The incident id to remove.
     */
    removeIncident: (id) => set((state) => {
      state.incidents = state.incidents.filter(i => i.id !== id); // Exclude the deleted incident
    }),
  }))
);

// ---------------------------------------------------------------------------
// Resource Store
// ---------------------------------------------------------------------------

/**
 * useResourceStore — Zustand store for DMS emergency resource management.
 *
 * Tracks all resources registered in the system (ambulances, fire trucks, rescue teams,
 * medical equipment, shelters, etc.), the currently selected resource, filter state for
 * the resource list view, and async operation state.
 */
export const useResourceStore = create(
  immer((set) => ({
    // Array of all resource objects loaded from the backend
    resources: [],
    // The resource currently open in the detail/edit form, or null
    selectedResource: null,
    // Active filter criteria for the resource list (e.g. { type: "VEHICLE", status: "AVAILABLE" })
    filters: {},
    // True while resource data is being fetched or a mutation is in flight
    isLoading: false,
    // Holds any error returned during a fetch or mutation operation
    error: null,

    // Replaces the full resource list — called after a successful GET /resources response
    setResources: (resources) => set({ resources }),
    // Sets the resource currently being viewed or edited
    setSelectedResource: (resource) => set({ selectedResource: resource }),
    // Applies filter criteria to narrow the resource list by type, status, location, etc.
    setFilters: (filters) => set({ filters }),
    // Toggles the loading indicator during async resource fetch operations
    setLoading: (isLoading) => set({ isLoading }),
    // Surfaces backend or network error messages to the resource list UI
    setError: (error) => set({ error }),

    /**
     * addResource — appends a newly registered resource to the end of the list.
     * Uses push() (vs unshift in incidents) since resources are typically sorted by type/name.
     * @param {object} resource - Fully formed resource object returned by the backend after creation.
     */
    addResource: (resource) => set((state) => {
      state.resources.push(resource); // Append to the end; the list component handles display order
    }),

    /**
     * updateResource — patches an existing resource in the local store after a successful update.
     * Used when a dispatcher changes a resource's status (e.g. "AVAILABLE" → "DEPLOYED").
     * @param {number|string} id      - The resource id to update.
     * @param {object}        updates - Partial resource fields to merge (e.g. { status: "DEPLOYED" }).
     */
    updateResource: (id, updates) => set((state) => {
      const index = state.resources.findIndex(r => r.id === id); // Locate resource by id
      if (index !== -1) {
        // Merge updates into the existing resource record without losing unrelated fields
        state.resources[index] = { ...state.resources[index], ...updates };
      }
    }),

    /**
     * removeResource — removes a decommissioned resource from the local store by id.
     * Called after a successful DELETE /resources/:id response.
     * @param {number|string} id - The resource id to remove.
     */
    removeResource: (id) => set((state) => {
      state.resources = state.resources.filter(r => r.id !== id); // Exclude the removed resource
    }),
  }))
);

// ---------------------------------------------------------------------------
// Alert Store
// ---------------------------------------------------------------------------

/**
 * useAlertStore — Zustand store for DMS real-time system alerts.
 *
 * Holds incoming alerts (e.g. new incident reported, resource threshold exceeded,
 * AI verification result, broadcast from admin) and tracks how many remain unread
 * so the notification badge in the header can display the correct count.
 */
export const useAlertStore = create(
  immer((set) => ({
    // Array of alert objects, ordered most-recent first (prepended via unshift in addAlert)
    alerts: [],
    // Number of alerts the current user has not yet opened — displayed as a badge count
    unreadCount: 0,
    // True while alerts are being fetched from the backend (e.g. on initial load)
    isLoading: false,

    // Replaces the full alert list — called after fetching the user's alert history from the API
    setAlerts: (alerts) => set({ alerts }),
    // Directly sets the unread count — used when the backend returns an authoritative badge count
    setUnreadCount: (count) => set({ unreadCount: count }),
    // Toggles the loading indicator during the initial alert fetch
    setLoading: (isLoading) => set({ isLoading }),

    /**
     * addAlert — prepends a new alert and increments the unread badge count.
     * Typically called when a WebSocket push or polling response delivers a new alert
     * (e.g. a critical incident was escalated, or the AI flagged a false report).
     * @param {object} alert - Alert object (id, title, message, severity, timestamp, etc.).
     */
    addAlert: (alert) => set((state) => {
      state.alerts.unshift(alert);  // Prepend so the newest alert appears at the top of the list
      state.unreadCount += 1;       // Increment badge so the operator knows a new alert arrived
    }),

    /**
     * markAsRead — marks a single alert as read and decrements the unread count.
     * Guards against double-decrement by checking isRead before applying the change.
     * @param {number|string} id - The alert id to mark as read.
     */
    markAsRead: (id) => set((state) => {
      const alert = state.alerts.find(a => a.id === id); // Find the target alert
      if (alert && !alert.isRead) {
        alert.isRead = true; // Flag the alert so the UI can style it as read
        // Clamp at 0 to guard against any edge case where the count could go negative
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    }),
  }))
);