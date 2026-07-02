import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Handle 401 globally — skip redirect when already on auth pages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const onAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!onAuthPage) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:       (email, password)      => api.post('/auth/login', { email, password }),
  register:    (data)                 => api.post('/auth/register', data),
  logout:      ()                     => api.post('/auth/logout').catch(() => {}),
  me:          ()                     => api.get('/auth/me'),
  oauthLogin:  (provider, idToken)    => api.post('/auth/oauth', { provider, idToken }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const userAPI = {
  getProfile:     ()                    => api.get('/users/profile'),
  updateProfile:  (data)                => api.put('/users/profile', data),
  changePassword: (data)                => api.put('/users/change-password', data),
  getAllUsers:    (page = 0, size = 20) => api.get(`/users?page=${page}&size=${size}`),
  getUserById:    (id)                  => api.get(`/users/${id}`),
  updateRole:     (id, role)            => api.patch(`/users/${id}/role?role=${role}`),
  toggleActive:   (id)                  => api.patch(`/users/${id}/toggle-active`),
  deleteUser:     (id)                  => api.delete(`/users/${id}`),
  createUser:     (data)                => api.post('/auth/register', data),
  uploadAvatar:   (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/media/upload/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Incidents ─────────────────────────────────────────────────────────────────
export const incidentAPI = {
  getIncidents:      (params = {})         => api.get('/incidents', { params }),
  getMyIncidents:    (params = {})         => api.get('/incidents/my', { params }),
  getIncidentById:   (id)                  => api.get(`/incidents/${id}`),
  createIncident:    (data)                => api.post('/incidents', data),
  updateIncident:    (id, data)            => api.put(`/incidents/${id}`, data),
  deleteIncident:    (id)                  => api.delete(`/incidents/${id}`),
  updateStatus:      (id, status)          => api.patch(`/incidents/${id}/status?status=${status}`),
  assignTeam:        (id, teamId)          => api.patch(`/incidents/${id}/assign?teamId=${teamId}`),
  uploadMedia:       (incidentId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/media/upload/${incidentId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const resourceAPI = {
  getResources:           (params = {})        => api.get('/resources', { params }),
  getResourceById:        (id)                 => api.get(`/resources/${id}`),
  createResource:         (data)               => api.post('/resources', data),
  updateResource:         (id, data)           => api.put(`/resources/${id}`, data),
  deleteResource:         (id)                 => api.delete(`/resources/${id}`),
  updateStatus:           (id, status)         => api.patch(`/resources/${id}/status?status=${status}`),
  assignToIncident:       (id, incidentId)     => api.patch(`/resources/${id}/assign?incidentId=${incidentId}`),
};

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alertAPI = {
  getAlerts:      (params = {}) => api.get('/alerts', { params }),
  getActiveAlerts: ()           => api.get('/alerts/active'),
  getAlertById:   (id)          => api.get(`/alerts/${id}`),
  createAlert:    (data)        => api.post('/alerts', data),
  updateAlert:    (id, data)    => api.put(`/alerts/${id}`, data),
  deactivate:     (id)          => api.patch(`/alerts/${id}/deactivate`),
  deleteAlert:    (id)          => api.delete(`/alerts/${id}`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:         ()   => api.get('/notifications'),
  getUnreadCount: ()   => api.get('/notifications/unread-count'),
  markAsRead:     (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead:  ()   => api.patch('/notifications/read-all'),
};

// ── Shelters ──────────────────────────────────────────────────────────────────
export const shelterAPI = {
  getShelters:     (params = {}) => api.get('/shelters', { params }),
  getAvailable:    ()            => api.get('/shelters/available'),
  getShelterById:  (id)          => api.get(`/shelters/${id}`),
  createShelter:   (data)        => api.post('/shelters', data),
  updateShelter:   (id, data)    => api.put(`/shelters/${id}`, data),
  updateCapacity:  (id, delta)   => api.patch(`/shelters/${id}/capacity?delta=${delta}`),
  deleteShelter:   (id)          => api.delete(`/shelters/${id}`),
};

// ── Rescue Teams ──────────────────────────────────────────────────────────────
export const teamAPI = {
  getTeams:        (params = {}) => api.get('/teams', { params }),
  getAvailable:    ()            => api.get('/teams/available'),
  getTeamById:     (id)          => api.get(`/teams/${id}`),
  createTeam:      (data)        => api.post('/teams', data),
  updateTeam:      (id, data)    => api.put(`/teams/${id}`, data),
  setAvailability: (id, val)     => api.patch(`/teams/${id}/availability?available=${val}`),
  deleteTeam:      (id)          => api.delete(`/teams/${id}`),
};

// ── Location Sharing ──────────────────────────────────────────────────────────
export const locationAPI = {
  shareLocation:   (data) => api.post('/location/share', data),
  stopSharing:     (id)   => api.patch(`/location/${id}/stop`),
  getMyLocations:  ()     => api.get('/location/mine'),
};

// ── Emergency Mode ────────────────────────────────────────────────────────────
export const emergencyAPI = {
  activate:    (data) => api.post('/emergency/activate', data),
  deactivate:  (id)   => api.patch(`/emergency/${id}/deactivate`),
  getStatus:   ()     => api.get('/emergency/status'),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStatistics:     ()            => api.get('/dashboard/stats'),
  getIncidentTrends: (days = 14)   => api.get(`/dashboard/trends?days=${days}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportAPI = {
  getReports:    (params = {}) => api.get('/reports', { params }),
  generateReport:(data)        => api.post('/reports/generate', data),
};

export default api;
