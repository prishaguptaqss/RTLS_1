import { useState, useEffect } from 'react';
import { Users, Building2, DoorOpen, Wifi } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import {
  fetchUsers,
  fetchEntities,
  fetchBuildings,
  fetchRooms,
  fetchTags,
  fetchDevices
} from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalEntities: 0,
    personEntities: 0,
    materialEntities: 0,
    totalBuildings: 0,
    totalRooms: 0,
    activeTags: 0,
    activeAnchors: 0,
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

      const [usersResult, entitiesResult, buildingsResult, roomsResult, tagsResult, anchorsResult] = await Promise.all([
        fetchUsers().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchEntities().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchBuildings().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchRooms().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchTags().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
        fetchDevices().then(data => ({ success: true, data })).catch(() => ({ success: false, data: [] })),
      ]);

      // Check if backend is connected (at least one API call succeeded)
      backendConnected = usersResult.success || entitiesResult.success || buildingsResult.success ||
                        roomsResult.success || tagsResult.success || anchorsResult.success;

      // Database is connected if backend is connected (same connection)
      databaseConnected = backendConnected;

      const users = usersResult.data;
      const entities = entitiesResult.data;
      const buildings = buildingsResult.data;
      const rooms = roomsResult.data;
      const tags = tagsResult.data;
      const anchors = anchorsResult.data;

      // Count active users
      const activeUsers = Array.isArray(users)
        ? users.filter(user => user.status === 'active').length
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

      setStats({
        activeUsers,
        totalEntities,
        personEntities,
        materialEntities,
        totalBuildings: Array.isArray(buildings) ? buildings.length : 0,
        totalRooms: Array.isArray(rooms) ? rooms.length : 0,
        activeTags,
        activeAnchors,
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

  const totalActiveTracked = stats.activeUsers + stats.totalEntities;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your RTLS system</p>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Users & Entities"
          value={loading ? '...' : totalActiveTracked.toString()}
          subtitle={`${stats.activeUsers} users, ${stats.totalEntities} entities`}
          icon={Users}
        />
        <StatCard
          title="Buildings"
          value={loading ? '...' : stats.totalBuildings.toString()}
          subtitle="Monitored buildings"
          icon={Building2}
        />
        <StatCard
          title="Rooms"
          value={loading ? '...' : stats.totalRooms.toString()}
          subtitle="Tracked locations"
          icon={DoorOpen}
        />
        <StatCard
          title="Active Devices"
          value={loading ? '...' : (stats.activeTags + stats.activeAnchors).toString()}
          subtitle={`${stats.activeTags} active tags, ${stats.activeAnchors} active anchors`}
          icon={Wifi}
        />
      </div>

      <div className="dashboard-grid">
        <Card>
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
        </Card>

        <Card>
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
                  <span className="stat-label">Total Entities:</span>
                  <span className="stat-value">{stats.totalEntities}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Person Entities:</span>
                  <span className="stat-value">{stats.personEntities}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Material Entities:</span>
                  <span className="stat-value">{stats.materialEntities}</span>
                </div>
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
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
