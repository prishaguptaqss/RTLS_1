import { useState, useEffect } from 'react';
import { Users, DoorOpen, Clock, Search, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import { fetchPatients } from '../services/api';
import { useSearch } from '../contexts/SearchContext';
import './LivePositions.css';

const LivePositions = () => {
  const { searchQuery } = useSearch();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tracked'); // 'tracked' or 'untracked'
  const [stats, setStats] = useState({
    trackedCount: 0,
    untrackedCount: 0,
    lastUpdate: null
  });

  useEffect(() => {
    loadPatients();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadPatients, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPatients = async () => {
    try {
      const data = await fetchPatients();
      // Only get patients with assigned tags
      const patientsWithTags = (data || []).filter(p => p.assigned_tag_id);
      setPatients(patientsWithTags);

      const tracked = patientsWithTags.filter(p => p.tracking_status === 'tracked').length;
      const untracked = patientsWithTags.filter(p => p.tracking_status === 'untracked').length;

      setStats({
        trackedCount: tracked,
        untrackedCount: untracked,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by active tab
  const tabFilteredPatients = patients.filter(p => p.tracking_status === activeTab);

  // Then filter by search
  const filteredPatients = tabFilteredPatients.filter(patient => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.patient_name?.toLowerCase().includes(query) ||
      patient.patient_id?.toLowerCase().includes(query) ||
      patient.assigned_tag_id?.toLowerCase().includes(query) ||
      patient.tag_name?.toLowerCase().includes(query) ||
      patient.current_location?.toLowerCase().includes(query)
    );
  });

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
          <h1 className="page-title">Patient Tracking</h1>
        </div>
      </div>

      <div className="stats-grid">
        <div
          className={`stat-card clickable ${activeTab === 'tracked' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracked')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-content">
            <h4 className="stat-card-title">Tracked Entities</h4>
            <p className="stat-card-value" style={{ color: '#10b981', fontSize: '2rem', fontWeight: 'bold' }}>
              {stats.trackedCount}
            </p>
            <p className="stat-card-subtitle">Currently being tracked</p>
          </div>
          <div className="stat-card-icon" style={{ color: '#10b981' }}>
            <Users size={28} />
          </div>
        </div>

        <div
          className={`stat-card clickable ${activeTab === 'untracked' ? 'active' : ''}`}
          onClick={() => setActiveTab('untracked')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-content">
            <h4 className="stat-card-title">Untracked Entities</h4>
            <p className="stat-card-value" style={{ color: '#ef4444', fontSize: '2rem', fontWeight: 'bold' }}>
              {stats.untrackedCount}
            </p>
            <p className="stat-card-subtitle">Lost signal</p>
          </div>
          <div className="stat-card-icon" style={{ color: '#ef4444' }}>
            <AlertTriangle size={28} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <h4 className="stat-card-title">Latest Update</h4>
            <p className="stat-card-value" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {stats.lastUpdate ? formatDateTime(stats.lastUpdate).split(',')[0] : '-'}
            </p>
            <p className="stat-card-subtitle">
              {stats.lastUpdate ? formatDateTime(stats.lastUpdate).split(',')[1] : 'Most recent update'}
            </p>
          </div>
          <div className="stat-card-icon">
            <Clock size={28} />
          </div>
        </div>
      </div>

      <Card className="positions-card">
        <Card.Header>
          <div className="card-header-content">
            <div>
              <Card.Title>Patient Positions</Card.Title>
              {/* <p className="table-subtitle">Showing {filteredPatients.length} of {tabFilteredPatients.length} patients</p> */}
            </div>
            {/* <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search patient, tag, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-box-input"
              />
            </div> */}
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
            <div className="loading-state">Loading patients...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="empty-state">
              {searchQuery.trim() ? 'No matching patients found' : `No ${activeTab} patients`}
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Patient ID</Table.Head>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Tag</Table.Head>
                  <Table.Head>{activeTab === 'tracked' ? 'Current Location' : 'Last Location'}</Table.Head>
                  {activeTab === 'untracked' && <Table.Head></Table.Head>}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredPatients.map((patient) => (
                  <Table.Row key={patient.patient_id}>
                    <Table.Cell>
                      <strong>{patient.patient_id}</strong>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {patient.patient_name?.charAt(0).toUpperCase() || 'P'}
                        </div>
                        <span>{patient.patient_name || 'Unknown'}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {patient.tag_name ? (
                        <span>{patient.tag_name}</span>
                      ) : (
                        <code className="serial-code">{patient.assigned_tag_id}</code>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {patient.current_location || <span className="text-muted">Unknown</span>}
                    </Table.Cell>
                    {/* {activeTab === 'untracked' && (
                      <Table.Cell>
                        <span className="warning-text">{formatTimeAgo(patient.last_seen)}</span>
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
