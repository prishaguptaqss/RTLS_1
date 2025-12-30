import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await forgotPassword(email);

      if (response.success) {
        // Navigate to OTP verification page with email
        navigate('/verify-otp', { state: { email } });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      {/* Left Panel - Brand/Hero Section */}
      <div className="forgot-password-brand-panel">
        <div className="brand-content">
          <h1 className="brand-title">MODERN HEALTHCARE</h1>
          <h2 className="brand-subtitle">Never Lose Track of What Saves Lives</h2>
          <p className="brand-description">
            Cutting-edge BLE technology that makes every piece of equipment instantly locatable, every time.
          </p>
        </div>
        <div className="brand-decoration"></div>
      </div>

      {/* Right Panel - Forgot Password Form */}
      <div className="forgot-password-form-panel">
        <div className="forgot-password-box">
          <div className="forgot-password-header">
            <h1>Forgot Password</h1>
            <p>Enter your email to receive a reset code</p>
          </div>

          <form onSubmit={handleSubmit} className="forgot-password-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email*</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
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
    </div>
  );
};

export default ForgotPassword;
