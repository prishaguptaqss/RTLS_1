import axios from 'axios';

// Configure base URL - update this to match your backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens and organization ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add organization ID header for multi-tenant support
    const orgId = localStorage.getItem('currentOrganizationId');
    if (orgId) {
      config.headers['X-Organization-ID'] = orgId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status, response.data);
    return response.data;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Methods

// Live Positions
export const fetchLivePositions = async () => {
  try {
    const response = await api.get('/positions/live');
    return response;
  } catch (error) {
    console.error('Error fetching live positions:', error);
    // Return mock data for development
    return {
      positions: [
        {
          id: 1,
          userName: 'Piyush',
          handbandSerial: '00:4B:12:EF:AB:8E',
          lastSeenRoom: 'Room-1',
          lastRSSI: -95,
          updatedAt: 'Dec 10, 2025, 06:31:13 PM'
        },
        {
          id: 2,
          userName: 'Manish',
          handbandSerial: '8C:4F:00:1D:EB:32',
          lastSeenRoom: 'Room-1',
          lastRSSI: -69,
          updatedAt: 'Dec 10, 2025, 04:53:28 PM'
        }
      ],
      stats: {
        trackedUsers: 2,
        roomsDetected: 1
      }
    };
  }
};

// Users
export const fetchUsers = async () => {
  return api.get('/users');
};

export const createUser = async (userData) => {
  return api.post('/users', userData);
};

export const updateUser = async (id, userData) => {
  return api.put(`/users/${id}`, userData);
};

export const deleteUser = async (id) => {
  return api.delete(`/users/${id}`);
};

export const fetchUserLocationHistory = async (userId) => {
  return api.get(`/users/${userId}/location-history`);
};

// Organizations
export const fetchOrganizations = async () => {
  return api.get('/organizations');
};

export const createOrganization = async (organizationData) => {
  return api.post('/organizations', organizationData);
};

export const updateOrganization = async (id, organizationData) => {
  return api.put(`/organizations/${id}`, organizationData);
};

export const deleteOrganization = async (id) => {
  return api.delete(`/organizations/${id}`);
};

// Entities (replaces Patients)
export const fetchEntities = async (type = null) => {
  const params = type ? `?type=${type}` : '';
  return api.get(`/entities${params}`);
};

export const createEntity = async (entityData) => {
  return api.post('/entities', entityData);
};

export const updateEntity = async (entityId, entityData) => {
  return api.put(`/entities/${entityId}`, entityData);
};

export const deleteEntity = async (entityId) => {
  return api.delete(`/entities/${entityId}`);
};

export const fetchEntityLocationHistory = async (entityId) => {
  return api.get(`/entities/${entityId}/location-history`);
};

export const fetchAvailableTags = async () => {
  return api.get('/tags/available');
};

// Settings
export const fetchSettings = async () => {
  return api.get('/settings');
};

export const updateSettings = async (settingsData) => {
  return api.put('/settings', settingsData);
};

// Rooms
export const fetchRooms = async (floorId = null) => {
  const params = floorId ? `?floor_id=${floorId}` : '';
  return api.get(`/rooms${params}`);
};

export const createRoom = async (roomData) => {
  return api.post('/rooms', roomData);
};

export const updateRoom = async (id, roomData) => {
  return api.put(`/rooms/${id}`, roomData);
};

export const deleteRoom = async (id) => {
  return api.delete(`/rooms/${id}`);
};

// Buildings
export const fetchBuildings = async (organizationId = null) => {
  const params = organizationId ? `?organization_id=${organizationId}` : '';
  return api.get(`/buildings${params}`);
};

export const createBuilding = async (buildingData) => {
  return api.post('/buildings', buildingData);
};

export const updateBuilding = async (id, buildingData) => {
  return api.put(`/buildings/${id}`, buildingData);
};

export const deleteBuilding = async (id) => {
  return api.delete(`/buildings/${id}`);
};

// Floors
export const fetchFloors = async (buildingId = null) => {
  const params = buildingId ? `?building_id=${buildingId}` : '';
  return api.get(`/floors${params}`);
};

export const createFloor = async (floorData) => {
  return api.post('/floors', floorData);
};

export const updateFloor = async (id, floorData) => {
  return api.put(`/floors/${id}`, floorData);
};

export const deleteFloor = async (id) => {
  return api.delete(`/floors/${id}`);
};

// Devices (ESP32 Anchors)
export const fetchDevices = async () => {
  return api.get('/devices');
};

export const fetchUnassignedDevices = async () => {
  return api.get('/devices/unassigned');
};

export const createDevice = async (deviceData) => {
  return api.post('/devices', deviceData);
};

export const updateDevice = async (id, deviceData) => {
  return api.put(`/devices/${id}`, deviceData);
};

export const deleteDevice = async (id) => {
  return api.delete(`/devices/${id}`);
};

// Tags (BLE Beacons)
export const fetchTags = async () => {
  return api.get('/tags');
};

export const createTag = async (tagData) => {
  return api.post('/tags', tagData);
};

export const updateTag = async (id, tagData) => {
  return api.put(`/tags/${id}`, tagData);
};

export const deleteTag = async (id) => {
  return api.delete(`/tags/${id}`);
};

// Dashboard Stats
export const fetchDashboardStats = async () => {
  return api.get('/dashboard/stats');
};

// ==================== AUTHENTICATION ====================

// Auth - Login
export const login = async (email, password) => {
  return api.post('/auth/login', { email, password });
};

// Auth - Get current user
export const getCurrentUser = async () => {
  return api.get('/auth/me');
};

// Auth - Logout
export const logout = async () => {
  return api.post('/auth/logout');
};

// ==================== PASSWORD RESET ====================

// Password Reset - Forgot Password (send OTP)
export const forgotPassword = async (email) => {
  return api.post('/password-reset/forgot-password', { email });
};

// Password Reset - Verify OTP
export const verifyOTP = async (email, otp) => {
  return api.post('/password-reset/verify-otp', { email, otp });
};

// Password Reset - Reset Password
export const resetPassword = async (email, otp, new_password) => {
  return api.post('/password-reset/reset-password', { email, otp, new_password });
};

// Password Reset - Resend OTP
export const resendOTP = async (email) => {
  return api.post('/password-reset/resend-otp', { email });
};

// ==================== STAFF MANAGEMENT ====================

// Staff - List all
export const fetchStaff = async (skip = 0, limit = 100) => {
  return api.get(`/staff?skip=${skip}&limit=${limit}`);
};

// Staff - Get by ID
export const fetchStaffById = async (id) => {
  return api.get(`/staff/${id}`);
};

// Staff - Create
export const createStaff = async (staffData) => {
  return api.post('/staff', staffData);
};

// Staff - Update
export const updateStaff = async (id, staffData) => {
  return api.put(`/staff/${id}`, staffData);
};

// Staff - Delete
export const deleteStaff = async (id) => {
  return api.delete(`/staff/${id}`);
};

// Staff - Change password
export const changePassword = async (currentPassword, newPassword) => {
  return api.post('/staff/change-password', {
    current_password: currentPassword,
    new_password: newPassword
  });
};

// ==================== ROLE MANAGEMENT ====================

// Roles - List all
export const fetchRoles = async (skip = 0, limit = 100) => {
  return api.get(`/roles?skip=${skip}&limit=${limit}`);
};

// Roles - Get by ID
export const fetchRoleById = async (id) => {
  return api.get(`/roles/${id}`);
};

// Roles - Create
export const createRole = async (roleData) => {
  return api.post('/roles', roleData);
};

// Roles - Update
export const updateRole = async (id, roleData) => {
  return api.put(`/roles/${id}`, roleData);
};

// Roles - Delete
export const deleteRole = async (id) => {
  return api.delete(`/roles/${id}`);
};

// ==================== PERMISSIONS ====================

// Permissions - List all
export const fetchPermissions = async () => {
  return api.get('/permissions');
};

// Permissions - List grouped by module
export const fetchPermissionsGrouped = async () => {
  return api.get('/permissions/grouped');
};

export default api;
