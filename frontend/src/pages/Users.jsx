import Card from '../components/ui/Card';

const Users = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">Manage tracked users</p>
      </div>
      <Card>
        <Card.Content>
          <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
            User management coming soon...
          </p>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Users;
