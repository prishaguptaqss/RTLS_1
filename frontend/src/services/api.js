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

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
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
export const fetchBuildings = async () => {
  return api.get('/buildings');
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

export default api;
