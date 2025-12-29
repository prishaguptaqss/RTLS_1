import { useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose, duration = 3000, autoClose = true }) => {
  useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const icons = {
    success: <FiCheckCircle size={20} />,
    error: <FiXCircle size={20} />,
    warning: <FiAlertCircle size={20} />,
    info: <FiInfo size={20} />
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">
        {icons[type]}
      </div>
      <div className="toast-message">
        {message}
      </div>
      <button className="toast-close" onClick={onClose}>
        <FiX size={16} />
      </button>
    </div>
  );
};

export default Toast;
