import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { fetchSettings, updateSettings } from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

const Settings = () => {
  const { currentOrganization, organizations, switchOrganization, loading: orgLoading } = useOrganization();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    untracked_threshold_seconds: 30,
    smtp_host: '',
    smtp_port: '',
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: ''
  });

  useEffect(() => {
    if (!orgLoading && currentOrganization) {
      loadSettings();
    }
  }, [orgLoading, currentOrganization]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSettings();
      setSettings(data);
      setFormData({
        untracked_threshold_seconds: data.untracked_threshold_seconds,
        smtp_host: data.smtp_host || '',
        smtp_port: data.smtp_port || '',
        smtp_username: data.smtp_username || '',
        smtp_password: data.smtp_password || '',
        smtp_from_email: data.smtp_from_email || '',
        smtp_from_name: data.smtp_from_name || ''
      });
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    // Validation
    if (formData.untracked_threshold_seconds < 5 || formData.untracked_threshold_seconds > 3600) {
      setError('Threshold must be between 5 and 3600 seconds');
      return;
    }

    try {
      setSaving(true);
      const updateData = {
        untracked_threshold_seconds: parseInt(formData.untracked_threshold_seconds)
      };

      // Add email settings if provided
      if (formData.smtp_host) updateData.smtp_host = formData.smtp_host;
      if (formData.smtp_port) updateData.smtp_port = parseInt(formData.smtp_port);
      if (formData.smtp_username) updateData.smtp_username = formData.smtp_username;
      if (formData.smtp_password && formData.smtp_password !== '********') updateData.smtp_password = formData.smtp_password;
      if (formData.smtp_from_email) updateData.smtp_from_email = formData.smtp_from_email;
      if (formData.smtp_from_name) updateData.smtp_from_name = formData.smtp_from_name;

      await updateSettings(updateData);
      setSuccess(true);
      await loadSettings(); // Reload to confirm
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  if (orgLoading || (loading && !currentOrganization)) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure organization settings</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">
              {orgLoading ? 'Loading organization...' : 'Loading settings...'}
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure organization settings</p>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              {organizations.length === 0 && isAdmin ? (
                <div>
                  <p>No organizations found. Please create an organization first.</p>
                  <button
                    onClick={() => navigate('/organizations')}
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                  >
                    Go to Organizations
                  </button>
                </div>
              ) : (
                <p>No organization selected. Please select an organization from the sidebar.</p>
              )}
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure settings for {currentOrganization.name}</p>
        </div>
      </div>

      <Card>
        <Card.Content>
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="settings-section">
              <h2 className="section-title">Organization</h2>
              <p className="section-description">
                Select the organization you want to manage.
              </p>

              <div className="form-group">
                <label htmlFor="organization">Current Organization</label>
                <select
                  id="organization"
                  value={currentOrganization?.id || ''}
                  onChange={(e) => switchOrganization(e.target.value)}
                  className="settings-input"
                >
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <small className="help-text">
                  Switching organizations will reload the settings for the selected organization.
                </small>
              </div>
            </div>

            <div className="settings-section">
              <h2 className="section-title">Tracking Configuration</h2>
              <p className="section-description">
                Configure how the system tracks entities and detects when they go offline.
              </p>

              {error && (
                <div className="alert alert-error">{error}</div>
              )}

              {success && (
                <div className="alert alert-success">
                  Settings saved successfully for {currentOrganization.name}!
                  The untracked threshold has been updated in the database.
                  Note: Restart the Python scanner service to apply the new threshold.
                </div>
              )}

              <div className="form-group">
                <label htmlFor="untracked_threshold_seconds">
                  Untracked Threshold (seconds)
                </label>
                <input
                  type="number"
                  id="untracked_threshold_seconds"
                  name="untracked_threshold_seconds"
                  value={formData.untracked_threshold_seconds}
                  onChange={handleInputChange}
                  min="5"
                  max="3600"
                  step="1"
                  required
                  className="settings-input"
                />
                <small className="help-text">
                  Tags not seen for this duration will be marked as lost/untracked.
                  This setting is specific to <strong>{currentOrganization.name}</strong>.
                  <br />
                  <strong>Range:</strong> 5-3600 seconds (5 seconds to 1 hour)
                  <br />
                  <strong>Current:</strong> {formData.untracked_threshold_seconds} seconds (~{Math.round(formData.untracked_threshold_seconds / 60)} minutes)
                  <br />
                  <em>Note: After changing this value, restart the Python scanner service for it to take effect.</em>
                </small>
              </div>
            </div>

            <div className="settings-section">
              <h2 className="section-title">Email Configuration</h2>
              <p className="section-description">
                Configure SMTP settings for sending emails (password reset, staff invitations, etc.)
              </p>

              <div className="form-group">
                <label htmlFor="smtp_host">SMTP Host</label>
                <input
                  type="text"
                  id="smtp_host"
                  name="smtp_host"
                  value={formData.smtp_host}
                  onChange={handleInputChange}
                  placeholder="smtp.gmail.com"
                  className="settings-input"
                />
                <small className="help-text">
                  SMTP server hostname (e.g., smtp.gmail.com for Gmail)
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="smtp_port">SMTP Port</label>
                <input
                  type="number"
                  id="smtp_port"
                  name="smtp_port"
                  value={formData.smtp_port}
                  onChange={handleInputChange}
                  placeholder="587"
                  className="settings-input"
                />
                <small className="help-text">
                  SMTP server port (587 for TLS/STARTTLS, 465 for SSL)
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="smtp_username">SMTP Username/Email</label>
                <input
                  type="email"
                  id="smtp_username"
                  name="smtp_username"
                  value={formData.smtp_username}
                  onChange={handleInputChange}
                  placeholder="your-email@gmail.com"
                  className="settings-input"
                />
                <small className="help-text">
                  Email address used to authenticate with SMTP server
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="smtp_password">SMTP Password/App Password</label>
                <input
                  type="password"
                  id="smtp_password"
                  name="smtp_password"
                  value={formData.smtp_password}
                  onChange={handleInputChange}
                  placeholder="Enter password to update"
                  className="settings-input"
                />
                <small className="help-text">
                  For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">App Password</a>. Leave blank to keep existing password.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="smtp_from_email">From Email Address</label>
                <input
                  type="email"
                  id="smtp_from_email"
                  name="smtp_from_email"
                  value={formData.smtp_from_email}
                  onChange={handleInputChange}
                  placeholder="noreply@yourcompany.com"
                  className="settings-input"
                />
                <small className="help-text">
                  Email address that will appear as the sender
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="smtp_from_name">From Name</label>
                <input
                  type="text"
                  id="smtp_from_name"
                  name="smtp_from_name"
                  value={formData.smtp_from_name}
                  onChange={handleInputChange}
                  placeholder="RTLS System"
                  className="settings-input"
                />
                <small className="help-text">
                  Display name that will appear as the sender
                </small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={loadSettings}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        </Card.Content>
      </Card>

    </div>
  );
};

export default Settings;
