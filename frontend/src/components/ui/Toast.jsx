import { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiX, FiCopy, FiCheck } from 'react-icons/fi';
import './Toast.css';

const Toast = ({ message, type = 'success', password, onClose, duration = 3000, autoClose = true }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const icons = {
    success: <FiCheckCircle size={20} />,
    error: <FiXCircle size={20} />,
    warning: <FiAlertCircle size={20} />,
    info: <FiInfo size={20} />,
    password: <FiAlertCircle size={20} />
  };

  // Special rendering for password type
  if (type === 'password') {
    return (
      <div className="toast toast-password">
        <div className="toast-icon">
          {icons.password}
        </div>
        <div className="toast-content-password">
          <div className="toast-message-password">{message}</div>
          <div className="toast-password-display">
            <code className="password-code-toast">{password}</code>
            <button
              className="toast-copy-btn"
              onClick={handleCopyPassword}
              title={copied ? "Copied!" : "Copy password"}
            >
              {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
            </button>
          </div>
        </div>
        <button className="toast-close" onClick={onClose}>
          <FiX size={16} />
        </button>
      </div>
    );
  }

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
