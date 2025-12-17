import { useState, useEffect } from 'react';
import { Users, DoorOpen, Clock, Search, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import { fetchLivePositions } from '../services/api';
import './LivePositions.css';

const LivePositions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [stats, setStats] = useState({
    trackedUsers: 0,
    roomsDetected: 0,
    missingPersons: 0,
    lastUpdate: null
  });

  useEffect(() => {
    loadPositions();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadPositions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPositions = async () => {
    try {
      const data = await fetchLivePositions();
      setPositions(data.positions || []);

      // Calculate missing persons count
      const missingCount = (data.positions || []).filter(p => p.isMissing).length;

      setStats({
        trackedUsers: data.stats?.trackedUsers || 0,
        roomsDetected: data.stats?.roomsDetected || 0,
        missingPersons: missingCount,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPositions = positions.filter(position => {
    const matchesSearch =
      position.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.handbandSerial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.lastSeenRoom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.fullLocation?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMissingFilter = showMissingOnly ? position.isMissing : true;

    return matchesSearch && matchesMissingFilter;
  });

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

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="live-positions">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live User Positions</h1>
          <p className="page-subtitle">Auto-refreshing every 5 seconds</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Tracked Users"
          value={stats.trackedUsers}
          subtitle="Users with recent signals"
          icon={Users}
        />
        <StatCard
          title="Missing Persons"
          value={stats.missingPersons}
          subtitle="Not seen for 5+ minutes"
          icon={AlertTriangle}
          className={stats.missingPersons > 0 ? 'stat-card-alert' : ''}
        />
        <StatCard
          title="Rooms Detected"
          value={stats.roomsDetected}
          subtitle="Unique rooms"
          icon={DoorOpen}
        />
        <StatCard
          title="Latest Update"
          value={stats.lastUpdate ? formatDateTime(stats.lastUpdate).split(',')[0] : '-'}
          subtitle={stats.lastUpdate ? formatDateTime(stats.lastUpdate).split(',')[1] : 'Most recent signal'}
          icon={Clock}
        />
      </div>

      <Card className="positions-card">
        <Card.Header>
          <div className="card-header-content">
            <div>
              <Card.Title>User Positions</Card.Title>
              <p className="table-subtitle">
                Showing {filteredPositions.length} of {positions.length} users
                {showMissingOnly && ' (missing only)'}
              </p>
            </div>
            <div className="filters-container">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={showMissingOnly}
                  onChange={(e) => setShowMissingOnly(e.target.checked)}
                />
                <span>Show Missing Only</span>
              </label>
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search user, room, or handband..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-box-input"
                />
              </div>
            </div>
          </div>
        </Card.Header>
        <Card.Content className="table-content">
          {loading ? (
            <div className="loading-state">Loading positions...</div>
          ) : filteredPositions.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? 'No matching positions found' :
               showMissingOnly ? 'No missing persons' :
               'No user positions available'}
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>User Name</Table.Head>
                  <Table.Head>Handband Serial</Table.Head>
                  <Table.Head>Location</Table.Head>
                  <Table.Head>Last Seen</Table.Head>
                  <Table.Head>Missing Duration</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredPositions.map((position, index) => (
                  <Table.Row
                    key={position.id || index}
                    className={position.isMissing ? 'missing-person-row' : ''}
                  >
                    <Table.Cell>
                      {position.isMissing && (
                        <div className="status-indicator missing">
                          <AlertTriangle size={18} />
                          <span>MISSING</span>
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="user-cell">
                        <div className={`user-avatar ${position.isMissing ? 'missing' : ''}`}>
                          {position.userName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span>{position.userName || 'Unknown'}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <code className="serial-code">{position.handbandSerial || '-'}</code>
                    </Table.Cell>
                    <Table.Cell>
                      {position.fullLocation || position.lastSeenRoom || '-'}
                    </Table.Cell>
                    <Table.Cell>
                      {position.isMissing ?
                        formatDateTime(position.lastSeenAt) :
                        formatDateTime(position.updatedAt)
                      }
                    </Table.Cell>
                    <Table.Cell className={position.isMissing ? 'missing-duration' : ''}>
                      {position.isMissing ? formatDuration(position.missingDuration) : '-'}
                    </Table.Cell>
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
