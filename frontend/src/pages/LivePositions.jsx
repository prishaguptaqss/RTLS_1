import { useState, useEffect } from 'react';
import { Users, DoorOpen, Clock, Search, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import { fetchLivePositions, fetchUntrackedUsers } from '../services/api';
import './LivePositions.css';

const LivePositions = () => {
  const [activeTab, setActiveTab] = useState('tracked'); // 'tracked' or 'untracked'
  const [positions, setPositions] = useState([]);
  const [untrackedUsers, setUntrackedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    trackedUsers: 0,
    roomsDetected: 0,
    untrackedUsers: 0,
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
      const [trackedData, untrackedData] = await Promise.all([
        fetchLivePositions(),
        fetchUntrackedUsers()
      ]);

      setPositions(trackedData.positions || []);
      setUntrackedUsers(untrackedData.untracked_tags || []);
      setStats({
        trackedUsers: trackedData.stats?.trackedUsers || 0,
        roomsDetected: trackedData.stats?.roomsDetected || 0,
        untrackedUsers: untrackedData.total || 0,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPositions = positions.filter(position =>
    position.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    position.handbandSerial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    position.lastSeenRoom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    position.fullLocation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUntrackedUsers = untrackedUsers.filter(user =>
    user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.tag_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          title="Untracked Users"
          value={stats.untrackedUsers}
          subtitle="Missing or offline tags"
          icon={AlertTriangle}
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

      {/* Tab Navigation */}
      <div className="tabs-container" style={{ marginBottom: '20px' }}>
        <button
          className={`tab-button ${activeTab === 'tracked' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracked')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: 'none',
            borderBottom: activeTab === 'tracked' ? '2px solid #007bff' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'tracked' ? 'bold' : 'normal',
            color: activeTab === 'tracked' ? '#007bff' : '#666'
          }}
        >
          Tracked Users ({stats.trackedUsers})
        </button>
        <button
          className={`tab-button ${activeTab === 'untracked' ? 'active' : ''}`}
          onClick={() => setActiveTab('untracked')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'untracked' ? '2px solid #dc3545' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'untracked' ? 'bold' : 'normal',
            color: activeTab === 'untracked' ? '#dc3545' : '#666'
          }}
        >
          Untracked Users ({stats.untrackedUsers})
        </button>
      </div>

      <Card className="positions-card">
        <Card.Header>
          <div className="card-header-content">
            <div>
              <Card.Title>{activeTab === 'tracked' ? 'User Positions' : 'Untracked Users'}</Card.Title>
              <p className="table-subtitle">
                Showing {activeTab === 'tracked' ? filteredPositions.length : filteredUntrackedUsers.length} of {activeTab === 'tracked' ? positions.length : untrackedUsers.length} users
              </p>
            </div>
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
        </Card.Header>
        <Card.Content className="table-content">
          {loading ? (
            <div className="loading-state">Loading positions...</div>
          ) : activeTab === 'tracked' ? (
            filteredPositions.length === 0 ? (
              <div className="empty-state">
                {searchTerm ? 'No matching positions found' : 'No user positions available'}
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>User Name</Table.Head>
                    <Table.Head>Handband Serial</Table.Head>
                    <Table.Head>Location</Table.Head>
                    <Table.Head>Last RSSI</Table.Head>
                    <Table.Head>Updated At</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredPositions.map((position, index) => (
                    <Table.Row key={position.id || index}>
                      <Table.Cell>
                        <div className="user-cell">
                          <div className="user-avatar">
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
                      <Table.Cell className={position.lastRSSI < -70 ? 'negative' : ''}>
                        {position.lastRSSI || '-'}
                      </Table.Cell>
                      <Table.Cell>{formatDateTime(position.updatedAt)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )
          ) : (
            filteredUntrackedUsers.length === 0 ? (
              <div className="empty-state">
                {searchTerm ? 'No matching untracked users found' : 'No untracked users - all tags are active!'}
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>User Name</Table.Head>
                    <Table.Head>Tag ID</Table.Head>
                    <Table.Head>Last Known Location</Table.Head>
                    <Table.Head>Last Seen At</Table.Head>
                    <Table.Head>Duration Lost</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredUntrackedUsers.map((user, index) => (
                    <Table.Row key={user.id || index} style={{ backgroundColor: '#fff3cd' }}>
                      <Table.Cell>
                        <div className="user-cell">
                          <div className="user-avatar" style={{ backgroundColor: '#dc3545' }}>
                            {user.user_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span>{user.user_name || 'Unknown'}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <code className="serial-code">{user.tag_id || '-'}</code>
                      </Table.Cell>
                      <Table.Cell>
                        {user.full_location || user.last_room_name || '-'}
                      </Table.Cell>
                      <Table.Cell>{user.last_seen_at}</Table.Cell>
                      <Table.Cell style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        {user.duration_lost_minutes} min ago
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )
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
