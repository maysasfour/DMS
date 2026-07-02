import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store';

function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch { return false; }
}

export default function ProtectedRoute() {
  const { user, token, logout } = useAuthStore();

  if (!user || !token || !isTokenValid(token)) {
    if (user || token) logout(); // clear stale state
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
