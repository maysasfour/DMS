import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, useUIStore } from './store';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationHub from './components/NotificationHub';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import Splash from './pages/Splash';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import TeamLogin from './pages/TeamLogin';
import OfficerLogin from './pages/OfficerLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import IncidentList from './pages/IncidentList';
import IncidentDetail from './pages/IncidentDetail';
import IncidentCreate from './pages/IncidentCreate';
import MapView from './pages/MapView';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import UserList from './pages/admin/UserList';
import UserDetail from './pages/admin/UserDetail';
import ResourceList from './pages/ResourceList';
import ResourceForm from './pages/ResourceForm';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

function App() {
  const { initializeAuth, user } = useAuthStore();
  const { theme, language, accentColor, setAccentColor } = useUIStore();
  const { i18n } = useTranslation();

  useEffect(() => {
    initializeAuth();
  }, []);

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Apply saved accent color on boot
  useEffect(() => {
    if (accentColor) setAccentColor(accentColor);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync language & RTL
  useEffect(() => {
    const isArabic = language === 'ar';
    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <Router>
      <NotificationHub />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/team-login" element={<TeamLogin />} />
        <Route path="/officer-login" element={<OfficerLogin />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="layout/dashboard" element={<Dashboard />} />
            <Route path="layout/incidents" element={<IncidentList />} />
            <Route path="layout/incidents/create" element={<IncidentCreate />} />
            <Route path="layout/incidents/:id" element={<IncidentDetail />} />
            <Route path="layout/map" element={<MapView />} />
            <Route path="layout/alerts" element={<Notifications />} />
            <Route path="layout/profile" element={<Profile />} />
            <Route path="layout/settings" element={<Settings />} />

            {/* Admin Routes */}
            <Route path="layout/users" element={<UserList />} />
            <Route path="layout/users/:id" element={<UserDetail />} />

            {/* Resource Routes */}
            <Route path="layout/resources" element={<ResourceList />} />
            <Route path="layout/resources/new" element={<ResourceForm />} />
            <Route path="layout/resources/:id" element={<ResourceForm />} />

            {/* Report Routes */}
            <Route path="layout/reports" element={<Reports />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function MainLayout() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
