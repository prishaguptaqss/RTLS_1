import './StatCard.css';

const StatCard = ({ title, value, subtitle, icon: Icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-content">
        <h4 className="stat-card-title">{title}</h4>
        <p className="stat-card-value">{value}</p>
        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
      </div>
      {Icon && (
        <div className="stat-card-icon">
          <Icon size={28} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
