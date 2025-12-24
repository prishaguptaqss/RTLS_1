import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resetPassword } from '../services/api';
import './ResetPassword.css';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const otp = location.state?.otp;

  // Password validation states
  const [validation, setValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    hasSpecial: false,
  });

  // Redirect if no email or OTP
  useEffect(() => {
    if (!email || !otp) {
      navigate('/forgot-password');
    }
  }, [email, otp, navigate]);

  // Live password validation
  useEffect(() => {
    setValidation({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasDigit: /\d/.test(newPassword),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  const isPasswordValid = () => {
    return Object.values(validation).every((v) => v === true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid()) {
      setError('Please meet all password requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(email, otp, newPassword);

      if (response.success) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', { state: { message: 'Password reset successfully. Please login with your new password.' } });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-box">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Password Reset Successful!</h2>
            <p>Redirecting you to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <div className="reset-password-header">
          <h1>Set New Password</h1>
          <p>Create a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="reset-password-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="password-requirements">
            <p className="requirements-title">Password must contain:</p>
            <ul className="requirements-list">
              <li className={validation.minLength ? 'valid' : ''}>
                <span className="check-icon">{validation.minLength ? '✓' : '○'}</span>
                At least 8 characters
              </li>
              <li className={validation.hasUppercase ? 'valid' : ''}>
                <span className="check-icon">{validation.hasUppercase ? '✓' : '○'}</span>
                One uppercase letter (A-Z)
              </li>
              <li className={validation.hasLowercase ? 'valid' : ''}>
                <span className="check-icon">{validation.hasLowercase ? '✓' : '○'}</span>
                One lowercase letter (a-z)
              </li>
              <li className={validation.hasDigit ? 'valid' : ''}>
                <span className="check-icon">{validation.hasDigit ? '✓' : '○'}</span>
                One number (0-9)
              </li>
              <li className={validation.hasSpecial ? 'valid' : ''}>
                <span className="check-icon">{validation.hasSpecial ? '✓' : '○'}</span>
                One special character (!@#$%^&*...)
              </li>
            </ul>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <span className="password-mismatch">Passwords do not match</span>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <span className="password-match">Passwords match ✓</span>
            )}
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading || !isPasswordValid() || newPassword !== confirmPassword}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate('/login')}
            disabled={loading}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
