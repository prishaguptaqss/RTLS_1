import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOTP, resendOTP } from '../services/api';
import './VerifyOTP.css';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60); // 60 seconds = 1 minute
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  // Redirect to forgot-password if no email
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(countdown);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4);

    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(['', '', '', '']).slice(0, 4);
      setOtp(newOtp);

      // Focus last filled input
      const lastIndex = Math.min(pastedData.length - 1, 3);
      document.getElementById(`otp-${lastIndex}`).focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');

    if (otpCode.length !== 4) {
      setError('Please enter the complete 4-digit code');
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOTP(email, otpCode);

      if (response.success) {
        // Navigate to reset password page
        navigate('/reset-password', { state: { email, otp: otpCode } });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await resendOTP(email);

      if (response.success) {
        setTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '']);
        document.getElementById('otp-0').focus();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="verify-otp-container">
      <div className="verify-otp-box">
        <div className="verify-otp-header">
          <h1>Verify OTP</h1>
          <p>Enter the 4-digit code sent to <strong>{email}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="verify-otp-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                autoFocus={index === 0}
                className="otp-input"
              />
            ))}
          </div>

          <div className="timer-section">
            {!canResend ? (
              <p className="timer">
                Code expires in: <span className="timer-value">{formatTime(timer)}</span>
              </p>
            ) : (
              <button
                type="button"
                className="resend-button"
                onClick={handleResend}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading || otp.join('').length !== 4}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate('/forgot-password')}
            disabled={loading}
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;
