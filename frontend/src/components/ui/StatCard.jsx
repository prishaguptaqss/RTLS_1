import './StatCard.css';

const StatCard = ({ title, value, subtitle, icon: Icon }) => {
  return (
    <div className="stat-card">
      {Icon && (
        <div className="stat-card-icon">
          <Icon size={24} />
        </div>
      )}
      <div className="stat-card-content">
        <h4 className="stat-card-title">{title}</h4>
        <p className="stat-card-value">{value}</p>
        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;
