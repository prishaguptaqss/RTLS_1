import Card from '../components/ui/Card';

const Rooms = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Rooms</h1>
        <p className="page-subtitle">Manage your rooms</p>
      </div>
      <Card>
        <Card.Content>
          <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
            Rooms management coming soon...
          </p>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Rooms;
