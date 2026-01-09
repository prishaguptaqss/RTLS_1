import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, DoorOpen, Wifi, Shield } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import PermissionGate from '../components/PermissionGate';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchStaff,
  fetchEntities,
  fetchBuildings,
  fetchRooms,
  fetchTags,
  fetchDevices,
  fetchRoles
} from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalEntities: 0,
    personEntities: 0,
    materialEntities: 0,
    totalBuildings: 0,
    totalRooms: 0,
    activeTags: 0,
    activeAnchors: 0,
    totalRoles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    backend: false,
    anchors: false,
    database: false,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel and track success
      let backendConnected = false;
      let databaseConnected = false;

      const [staffResult, entitiesResult, buildingsResult, roomsResult, tagsResult, anchorsResult, rolesResult] = await Promise.all([
        fetchStaff().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchEntities().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchBuildings().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchRooms().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchTags().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchDevices().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchRoles().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
      ]);

      // Check if backend is connected (at least one API call succeeded)
      backendConnected = staffResult.success || entitiesResult.success || buildingsResult.success ||
                        roomsResult.success || tagsResult.success || anchorsResult.success;

      // Database is connected if backend is connected (same connection)
      databaseConnected = backendConnected;

      const staff = staffResult.data?.staff || staffResult.data || [];
      const entities = entitiesResult.data;
      const buildings = buildingsResult.data;
      const rooms = roomsResult.data;
      const tags = tagsResult.data;
      const anchors = anchorsResult.data;
      const roles = rolesResult.data?.roles || rolesResult.data || [];

      // Count active staff (organization-specific, already filtered by backend)
      const activeUsers = Array.isArray(staff)
        ? staff.filter(user => user.is_active === true).length
        : 0;

      // Count entities by type
      const totalEntities = Array.isArray(entities) ? entities.length : 0;
      const personEntities = Array.isArray(entities)
        ? entities.filter(entity => entity.type === 'person').length
        : 0;
      const materialEntities = Array.isArray(entities)
        ? entities.filter(entity => entity.type === 'material').length
        : 0;

      // Count active tags (tags that have status 'active')
      const activeTags = Array.isArray(tags)
        ? tags.filter(tag => tag.status === 'active').length
        : 0;

      // Count active anchors (devices with status 'active')
      const activeAnchors = Array.isArray(anchors)
        ? anchors.filter(anchor => anchor.status === 'active').length
        : 0;

      // Count total roles (organization-specific, already filtered by backend)
      const totalRoles = Array.isArray(roles) ? roles.length : 0;

      setStats({
        activeUsers,
        totalEntities,
        personEntities,
        materialEntities,
        totalBuildings: Array.isArray(buildings) ? buildings.length : 0,
        totalRooms: Array.isArray(rooms) ? rooms.length : 0,
        activeTags,
        activeAnchors,
        totalRoles,
      });

      // Update system status
      setSystemStatus({
        backend: backendConnected,
        anchors: activeAnchors > 0,
        database: databaseConnected,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setSystemStatus({
        backend: false,
        anchors: false,
        database: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your RTLS system</p>
      </div>

      <div className="stats-grid">
        <PermissionGate permission="STAFF_VIEW">
          <StatCard
            title="Active Users"
            value={loading ? '...' : stats.activeUsers.toString()}
            subtitle="Currently active users"
            icon={Users}
            onClick={() => navigate('/staff')}
          />
        </PermissionGate>

        <PermissionGate permission="ENTITY_VIEW">
          <StatCard
            title="Patients"
            value={loading ? '...' : stats.totalEntities.toString()}
            subtitle="Total registered patients"
            icon={Users}
            onClick={() => navigate('/entities')}
          />
        </PermissionGate>

        <PermissionGate permission="ROLE_VIEW">
          <StatCard
            title="Roles"
            value={loading ? '...' : stats.totalRoles.toString()}
            subtitle="Access control roles"
            icon={Shield}
            onClick={() => navigate('/roles')}
          />
        </PermissionGate>

        <PermissionGate permission="BUILDING_VIEW">
          <StatCard
            title="Buildings"
            value={loading ? '...' : stats.totalBuildings.toString()}
            subtitle="Monitored buildings"
            icon={Building2}
            onClick={() => navigate('/locations')}
          />
        </PermissionGate>

        <PermissionGate permission="BUILDING_VIEW">
          <StatCard
            title="Rooms"
            value={loading ? '...' : stats.totalRooms.toString()}
            subtitle="Tracked locations"
            icon={DoorOpen}
            onClick={() => navigate('/locations')}
          />
        </PermissionGate>

        <PermissionGate permission="DEVICE_VIEW">
          <StatCard
            title="Active Devices"
            value={loading ? '...' : (stats.activeTags + stats.activeAnchors).toString()}
            subtitle={`${stats.activeTags} tags, ${stats.activeAnchors} anchors`}
            icon={Wifi}
            onClick={() => navigate('/devices')}
          />
        </PermissionGate>
      </div>

      {!hasAnyPermission(['STAFF_VIEW', 'ENTITY_VIEW', 'ROLE_VIEW', 'BUILDING_VIEW', 'DEVICE_VIEW', 'DASHBOARD_VIEW']) && !loading && (
        <Card>
          <Card.Content>
            <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              You don't have permissions to view dashboard statistics. Please contact your administrator to request access.
            </p>
          </Card.Content>
        </Card>
      )}

      <PermissionGate permission="DASHBOARD_VIEW">
        <div className="dashboard-grid">
          {/* <Card>
            <Card.Header>
              <Card.Title>System Status</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="status-item">
                <span className={`status-indicator ${systemStatus.backend ? 'active' : 'inactive'}`}></span>
                <span>{systemStatus.backend ? 'Backend connected' : 'Backend not connected'}</span>
              </div>
              <div className="status-item">
                <span className={`status-indicator ${systemStatus.anchors ? 'active' : 'inactive'}`}></span>
                <span>
                  {systemStatus.anchors
                    ? `${stats.activeAnchors} BLE anchor${stats.activeAnchors !== 1 ? 's' : ''} online`
                    : 'No BLE anchors online'}
                </span>
              </div>
              <div className="status-item">
                <span className={`status-indicator ${systemStatus.database ? 'active' : 'inactive'}`}></span>
                <span>{systemStatus.database ? 'Database connected' : 'Database not connected'}</span>
              </div>
            </Card.Content>
          </Card> */}

          {/* <Card>
            <Card.Header>
              <Card.Title>Quick Stats</Card.Title>
            </Card.Header>
            <Card.Content>
              {loading ? (
                <p className="placeholder-text">Loading statistics...</p>
              ) : (
                <div className="quick-stats">
                  <div className="stat-row">
                    <span className="stat-label">Active Users:</span>
                    <span className="stat-value">{stats.activeUsers}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Total Roles:</span>
                    <span className="stat-value">{stats.totalRoles}</span>
                  </div>
                  <hr style={{ margin: '10px 0', border: '1px solid #e5e7eb' }} />
                  <div className="stat-row">
                    <span className="stat-label">Total Patients:</span>
                    <span className="stat-value">{stats.totalEntities}</span>
                  </div>
                  <hr style={{ margin: '10px 0', border: '1px solid #e5e7eb' }} />
                  <div className="stat-row">
                    <span className="stat-label">Active Tags:</span>
                    <span className="stat-value">{stats.activeTags}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Active Anchors:</span>
                    <span className="stat-value">{stats.activeAnchors}</span>
                  </div>
                </div>
              )}
            </Card.Content>
          </Card> */}
        </div>
      </PermissionGate>
    </div>
  );
};

export default Dashboard;
