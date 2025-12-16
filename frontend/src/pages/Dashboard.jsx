import { Users, Building2, DoorOpen, Wifi } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your RTLS system</p>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value="2"
          subtitle="Active tracked users"
          icon={Users}
        />
        <StatCard
          title="Buildings"
          value="1"
          subtitle="Monitored buildings"
          icon={Building2}
        />
        <StatCard
          title="Rooms"
          value="1"
          subtitle="Tracked locations"
          icon={DoorOpen}
        />
        <StatCard
          title="Devices"
          value="3"
          subtitle="Active ESP32 anchors"
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
              <span className="status-indicator active"></span>
              <span>All systems operational</span>
            </div>
            <div className="status-item">
              <span className="status-indicator active"></span>
              <span>BLE anchors online</span>
            </div>
            <div className="status-item">
              <span className="status-indicator active"></span>
              <span>Database connected</span>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Untracked Individuals</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="placeholder-text">Activity log will appear here</p>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
