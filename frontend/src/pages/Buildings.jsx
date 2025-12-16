import Card from '../components/ui/Card';

const Buildings = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Buildings</h1>
        <p className="page-subtitle">Manage your buildings</p>
      </div>
      <Card>
        <Card.Content>
          <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
            Buildings management coming soon...
          </p>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Buildings;
