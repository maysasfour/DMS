/**
 * App.jsx — Root application component for the Disaster Management System (DMS) frontend.
 *
 * This file bootstraps the entire React application. It is responsible for:
 * - Initializing authentication state from persisted storage on app load
 * - Applying and syncing the user's selected UI theme (dark/light) to the HTML document
 * - Applying the user's chosen accent color across the DMS interface
 * - Syncing the active language and text direction (LTR/RTL for Arabic) with i18next
 * - Declaring all client-side routes, separating public pages (login, register, splash)
 *   from protected pages that require an authenticated DMS user session
 * - Rendering the MainLayout shell (Navbar + Sidebar + content area) for authenticated views
 */

// React core and the useEffect hook for side-effect management
import React, { useEffect } from 'react';
// BrowserRouter provides HTML5 history-based routing; Routes/Route define the URL tree;
// Navigate handles programmatic redirects; Outlet renders nested child routes in layouts
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
// useAuthStore manages user authentication state (login, session persistence, user object)
// useUIStore manages UI preferences: theme, language, accent color, sidebar state
import { useAuthStore, useUIStore } from './store';
// useTranslation provides access to i18next's language-switching API for multilingual DMS support
import { useTranslation } from 'react-i18next';
// ProtectedRoute gates access to authenticated pages; redirects unauthenticated users to login
import ProtectedRoute from './components/ProtectedRoute';
// NotificationHub renders real-time DMS alerts (incident updates, resource changes, system events)
import NotificationHub from './components/NotificationHub';
// Navbar is the top navigation bar shown on all authenticated DMS pages
import Navbar from './components/Navbar';
// Sidebar is the collapsible left navigation menu linking to DMS modules
import Sidebar from './components/Sidebar';

// Pages — each import represents a full-page view in the DMS application
import Splash from './pages/Splash'; // Landing/splash screen shown at the root URL
import Login from './pages/Login'; // General citizen/user login page
import AdminLogin from './pages/AdminLogin'; // Dedicated login page for DMS administrators
import TeamLogin from './pages/TeamLogin'; // Login page for emergency response team members
import OfficerLogin from './pages/OfficerLogin'; // Login page for field officers
import Register from './pages/Register'; // New user self-registration page
import Dashboard from './pages/Dashboard'; // Main overview page with incident stats and summaries
import IncidentList from './pages/IncidentList'; // Paginated list of all reported DMS incidents
import IncidentDetail from './pages/IncidentDetail'; // Full detail view for a single incident by ID
import IncidentCreate from './pages/IncidentCreate'; // Form page for reporting a new disaster incident
import MapView from './pages/MapView'; // Interactive map showing incident locations and resource positions
import Notifications from './pages/Notifications'; // Full-page view of system alerts and notifications
import Profile from './pages/Profile'; // Authenticated user's profile management page
import Settings from './pages/Settings'; // Application settings (theme, language, preferences)
import UserList from './pages/admin/UserList'; // Admin-only page listing all registered DMS users
import UserDetail from './pages/admin/UserDetail'; // Admin-only detailed view and editor for a single user
import ResourceList from './pages/ResourceList'; // List of emergency resources (vehicles, equipment, personnel)
import ResourceForm from './pages/ResourceForm'; // Create or edit a resource record (shared for new and existing)
import Reports from './pages/Reports'; // Analytics and reporting dashboard for incident data
import NotFound from './pages/NotFound'; // 404 fallback page for unmatched routes

/**
 * App — the top-level component that owns global state sync and route configuration.
 * Rendered once at the React tree root by main.jsx/index.jsx.
 */
function App() {
  // Retrieve the auth initialization function and the currently authenticated user object
  const { initializeAuth, user } = useAuthStore();
  // Retrieve UI preference values and the accent color setter from global UI store
  const { theme, language, accentColor, setAccentColor } = useUIStore();
  // i18n instance used to programmatically switch the active language across DMS UI strings
  const { i18n } = useTranslation();

  // On first mount, restore auth state from localStorage/cookies so the session
  // persists across page refreshes without requiring the user to log in again
  useEffect(() => {
    initializeAuth();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Sync dark/light theme: adds or removes the 'dark' CSS class on <html>
  // so Tailwind dark-mode utilities apply throughout the DMS interface
  useEffect(() => {
    if (theme === 'dark') {
      // Activate dark mode by adding the class that enables Tailwind's dark: variants
      document.documentElement.classList.add('dark');
    } else {
      // Revert to light mode by removing the dark class
      document.documentElement.classList.remove('dark');
    }
  }, [theme]); // Re-runs whenever the user changes the theme preference

  // Apply the stored accent color CSS variable on app boot so the DMS neon/cyberpunk
  // color theming is immediately visible without waiting for user interaction
  useEffect(() => {
    if (accentColor) setAccentColor(accentColor); // Rehydrate accent color into CSS variables
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once on mount

  // Sync language direction and active i18next locale whenever the language setting changes.
  // Arabic requires RTL layout which flips the entire DMS UI directionality.
  useEffect(() => {
    const isArabic = language === 'ar'; // Determine if the selected language is right-to-left
    // Set 'dir' attribute on <html> to control text and layout direction for the whole app
    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    // Set 'lang' attribute on <html> for accessibility and browser language detection
    document.documentElement.setAttribute('lang', language);
    // Only call changeLanguage if it differs, avoiding unnecessary re-renders
    if (i18n.language !== language) {
      i18n.changeLanguage(language); // Switch all i18n translation keys to the new language
    }
  }, [language, i18n]); // Re-runs when language or i18n instance changes

  return (
    // BrowserRouter wraps the entire app to enable client-side navigation without full page reloads
    <Router>
      {/* NotificationHub listens for real-time DMS events and renders toast/alert overlays */}
      <NotificationHub />
      <Routes>
        {/* Public Routes — accessible without authentication */}

        {/* Root URL shows the DMS splash/landing screen */}
        <Route path="/" element={<Splash />} />
        {/* General login for citizens and public users */}
        <Route path="/login" element={<Login />} />
        {/* Separate login portal for DMS system administrators */}
        <Route path="/admin-login" element={<AdminLogin />} />
        {/* Login portal for emergency response team members */}
        <Route path="/team-login" element={<TeamLogin />} />
        {/* Login portal for field officers managing on-ground resources */}
        <Route path="/officer-login" element={<OfficerLogin />} />
        {/* Self-registration page for new DMS users */}
        <Route path="/register" element={<Register />} />

        {/* Protected Routes — ProtectedRoute checks authentication; redirects to login if not authenticated */}
        <Route element={<ProtectedRoute />}>
          {/* MainLayout wraps all authenticated pages with the shared Navbar and Sidebar shell */}
          <Route element={<MainLayout />}>
            {/* Main operational dashboard showing incident summaries and key metrics */}
            <Route path="layout/dashboard" element={<Dashboard />} />
            {/* Browse and filter all DMS incidents */}
            <Route path="layout/incidents" element={<IncidentList />} />
            {/* Form to report a new disaster or emergency incident */}
            <Route path="layout/incidents/create" element={<IncidentCreate />} />
            {/* Detailed view of a specific incident identified by its ID */}
            <Route path="layout/incidents/:id" element={<IncidentDetail />} />
            {/* Map view displaying geo-located incidents and resource positions */}
            <Route path="layout/map" element={<MapView />} />
            {/* Full notifications/alerts page for DMS system messages */}
            <Route path="layout/alerts" element={<Notifications />} />
            {/* Authenticated user's own profile page */}
            <Route path="layout/profile" element={<Profile />} />
            {/* Application settings for theme, language, and user preferences */}
            <Route path="layout/settings" element={<Settings />} />

            {/* Admin Routes — intended for DMS administrators only (role enforcement in ProtectedRoute or page) */}
            {/* List all registered users in the DMS system */}
            <Route path="layout/users" element={<UserList />} />
            {/* View and manage a specific user's account details */}
            <Route path="layout/users/:id" element={<UserDetail />} />

            {/* Resource Routes — manage emergency resources like vehicles, personnel, equipment */}
            {/* List all available resources in the DMS */}
            <Route path="layout/resources" element={<ResourceList />} />
            {/* Form to register a new emergency resource */}
            <Route path="layout/resources/new" element={<ResourceForm />} />
            {/* Reuse ResourceForm component for editing an existing resource by ID */}
            <Route path="layout/resources/:id" element={<ResourceForm />} />

            {/* Report Routes — analytics and export for incident and response data */}
            <Route path="layout/reports" element={<Reports />} />
          </Route>
        </Route>

        {/* Fallback — catches all unmatched URLs and renders a 404 Not Found page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

/**
 * MainLayout — the persistent shell rendered around all authenticated DMS pages.
 *
 * Composes the full-screen layout with:
 * - Sidebar: collapsible left navigation linking to DMS modules (incidents, map, resources, etc.)
 * - Navbar: top bar with user info, notifications bell, and global actions
 * - A scrollable main content area where child route pages are injected via <Outlet />
 */
function MainLayout() {
  // Read sidebar open/closed state to conditionally adjust layout widths if needed
  const { sidebarOpen } = useUIStore();

  return (
    // Root flex container fills the full viewport height; background uses the DMS design-system CSS variable
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar renders the collapsible left navigation panel for DMS module links */}
      <Sidebar />
      {/* Right-side column: stacks Navbar above the scrollable page content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Navbar is fixed at the top of the content area across all authenticated pages */}
        <Navbar />
        {/* main fills remaining vertical space and enables vertical scroll for long page content */}
        <main className="flex-1 overflow-auto">
          {/* Inner padding wrapper provides consistent spacing for all DMS page content */}
          <div className="p-4 md:p-6">
            {/* Outlet renders the matched child route's page component (Dashboard, IncidentList, etc.) */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// Export App as the default so it can be mounted by the React entry point (main.jsx)
export default App;