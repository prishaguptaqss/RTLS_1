import { useState } from 'react';
import Modal from './ui/Modal';
import { changePassword } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Password validation
  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('One number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('One special character');
    }

    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear specific field error
    setErrors(prev => ({ ...prev, [name]: null }));

    // Live validation for new password
    if (name === 'new_password') {
      const passwordErrors = validatePassword(value);
      if (passwordErrors.length > 0) {
        setErrors(prev => ({ ...prev, new_password: passwordErrors }));
      }
    }

    // Live validation for confirm password
    if (name === 'confirm_password' && formData.new_password) {
      if (value && value !== formData.new_password) {
        setErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};

    if (!formData.current_password) {
      newErrors.current_password = 'Current password is required';
    }

    if (!formData.new_password) {
      newErrors.new_password = ['New password is required'];
    } else {
      const passwordErrors = validatePassword(formData.new_password);
      if (passwordErrors.length > 0) {
        newErrors.new_password = passwordErrors;
      }
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your new password';
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      await changePassword({
        current_password: formData.current_password,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password
      });

      // Show success toast
      success('Password changed successfully! Please login with your new password.');

      // Close modal
      onClose();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        localStorage.removeItem('token');
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Error changing password:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to change password. Please try again.';
      showError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ current_password: '', new_password: '', confirm_password: '' });
    setErrors({});
    setShowPasswords({ current: false, new: false, confirm: false });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>
        Change Password
      </Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="change-password-form">
            <p className="form-description">
              Please enter your current password and choose a new secure password.
            </p>

            {/* Current Password */}
            <div className="form-group">
              <label htmlFor="current_password">
                Current Password <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  id="current_password"
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleInputChange}
                  className={errors.current_password ? 'error' : ''}
                  placeholder="Enter your current password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  tabIndex="-1"
                >
                  {showPasswords.current ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {errors.current_password && (
                <span className="error-message">{errors.current_password}</span>
              )}
            </div>

            {/* New Password */}
            <div className="form-group">
              <label htmlFor="new_password">
                New Password <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="new_password"
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleInputChange}
                  className={errors.new_password ? 'error' : ''}
                  placeholder="Enter your new password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  tabIndex="-1"
                >
                  {showPasswords.new ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {errors.new_password && Array.isArray(errors.new_password) && (
                <div className="password-requirements">
                  <p className="requirements-title">Password must contain:</p>
                  <ul className="requirements-list">
                    {errors.new_password.map((req, idx) => (
                      <li key={idx} className="requirement-item error">
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!errors.new_password && formData.new_password && (
                <div className="password-requirements">
                  <p className="requirements-title success">✓ Password meets all requirements</p>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="form-group">
              <label htmlFor="confirm_password">
                Confirm New Password <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirm_password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  className={errors.confirm_password ? 'error' : ''}
                  placeholder="Confirm your new password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  tabIndex="-1"
                >
                  {showPasswords.confirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {errors.confirm_password && (
                <span className="error-message">{errors.confirm_password}</span>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Changing Password...' : 'Change Password'}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
