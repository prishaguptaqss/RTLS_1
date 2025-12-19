import { useState, useEffect } from 'react';
import { Users, DoorOpen, Clock, Search, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import { fetchEntities } from '../services/api';
import './LivePositions.css';

const LivePositions = () => {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tracked'); // 'tracked' or 'untracked'
  const [stats, setStats] = useState({
    trackedCount: 0,
    untrackedCount: 0,
    lastUpdate: null
  });

  useEffect(() => {
    loadEntities();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadEntities, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadEntities = async () => {
    try {
      const data = await fetchEntities();
      // Only get entities with assigned tags
      const entitiesWithTags = (data || []).filter(e => e.assigned_tag_id);
      setEntities(entitiesWithTags);

      const tracked = entitiesWithTags.filter(e => e.tracking_status === 'tracked').length;
      const untracked = entitiesWithTags.filter(e => e.tracking_status === 'untracked').length;

      setStats({
        trackedCount: tracked,
        untrackedCount: untracked,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by active tab
  const tabFilteredEntities = entities.filter(e => e.tracking_status === activeTab);

  // Then filter by search
  const filteredEntities = tabFilteredEntities.filter(entity =>
    entity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.entity_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.assigned_tag_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.tag_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.current_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '-';
    const now = new Date();
    const then = new Date(dateString);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="live-positions">
      <div className="page-header">
        <div>
          <h1 className="page-title">Entity Tracking</h1>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Tracked Entities"
          value={stats.trackedCount}
          subtitle="Currently being tracked"
          icon={Users}
        />
        <StatCard
          title="Untracked Entities"
          value={stats.untrackedCount}
          subtitle="Lost signal"
          icon={AlertTriangle}
        />
        <StatCard
          title="Latest Update"
          value={stats.lastUpdate ? formatDateTime(stats.lastUpdate).split(',')[0] : '-'}
          subtitle={stats.lastUpdate ? formatDateTime(stats.lastUpdate).split(',')[1] : 'Most recent update'}
          icon={Clock}
        />
      </div>

      <Card className="positions-card">
        <Card.Header>
          <div className="card-header-content">
            <div>
              <Card.Title>Entity Positions</Card.Title>
              <p className="table-subtitle">Showing {filteredEntities.length} of {tabFilteredEntities.length} entities</p>
            </div>
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search entity, tag, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-box-input"
              />
            </div>
          </div>
        </Card.Header>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab ${activeTab === 'tracked' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracked')}
          >
            <Users size={16} />
            Tracked ({stats.trackedCount})
          </button>
          <button
            className={`tab ${activeTab === 'untracked' ? 'active' : ''}`}
            onClick={() => setActiveTab('untracked')}
          >
            <AlertTriangle size={16} />
            Untracked ({stats.untrackedCount})
          </button>
        </div>

        <Card.Content className="table-content">
          {loading ? (
            <div className="loading-state">Loading entities...</div>
          ) : filteredEntities.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? 'No matching entities found' : `No ${activeTab} entities`}
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Entity ID</Table.Head>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Tag</Table.Head>
                  <Table.Head>{activeTab === 'tracked' ? 'Current Location' : 'Last Location'}</Table.Head>
                  {activeTab === 'untracked' && <Table.Head></Table.Head>}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredEntities.map((entity) => (
                  <Table.Row key={entity.entity_id}>
                    <Table.Cell>
                      <strong>{entity.entity_id}</strong>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {entity.name?.charAt(0).toUpperCase() || 'E'}
                        </div>
                        <span>{entity.name || 'Unknown'}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {entity.tag_name ? (
                        <div>
                          <div>{entity.tag_name}</div>
                          <code className="serial-code" style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                            {entity.assigned_tag_id}
                          </code>
                        </div>
                      ) : (
                        <code className="serial-code">{entity.assigned_tag_id}</code>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {entity.current_location || <span className="text-muted">Unknown</span>}
                    </Table.Cell>
                    {/* {activeTab === 'untracked' && (
                      <Table.Cell>
                        <span className="warning-text">{formatTimeAgo(entity.last_seen)}</span>
                      </Table.Cell>
                    )} */}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card.Content>
      </Card>

      <div className="pagination">
        <span className="pagination-info">Rows per page: 10</span>
        <span className="pagination-range">1-2 of 2</span>
        <div className="pagination-controls">
          <button className="pagination-btn" disabled>&lt;</button>
          <button className="pagination-btn" disabled>&gt;</button>
        </div>
      </div>
    </div>
  );
};

export default LivePositions;
