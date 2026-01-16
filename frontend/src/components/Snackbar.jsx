import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Snackbar = ({ isOpen, message, type = 'success', onClose, duration = 4000 }) => {
  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: '#10b981',
      iconColor: '#ffffff'
    },
    error: {
      icon: XCircle,
      bgColor: '#ef4444',
      iconColor: '#ffffff'
    },
    warning: {
      icon: AlertCircle,
      bgColor: '#f59e0b',
      iconColor: '#ffffff'
    },
    info: {
      icon: Info,
      bgColor: '#3b82f6',
      iconColor: '#ffffff'
    }
  };

  const config = typeConfig[type] || typeConfig.success;
  const Icon = config.icon;

  // Auto-close after duration
  useEffect(() => {
    if (isOpen && duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: config.bgColor,
          color: 'white',
          padding: '14px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          minWidth: '320px',
          maxWidth: '480px'
        }}
      >
        <Icon size={20} color={config.iconColor} />
        <span
          style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.4'
          }}
        >
          {message}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
            opacity: 0.8,
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
        >
          <X size={18} />
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Snackbar;
