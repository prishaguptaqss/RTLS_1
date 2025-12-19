import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { fetchSettings, updateSettings } from '../services/api';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    untracked_threshold_seconds: 30
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSettings();
      setSettings(data);
      setFormData({
        untracked_threshold_seconds: data.untracked_threshold_seconds
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
      await updateSettings({
        untracked_threshold_seconds: parseInt(formData.untracked_threshold_seconds)
      });
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure system settings</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">Loading settings...</div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure system settings</p>
      </div>

      <Card>
        <Card.Content>
          <form onSubmit={handleSubmit} className="settings-form">
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
                  Settings updated successfully! Both backend and Python service have been configured.
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
                  Entities not seen for this duration will be marked as untracked.
                  This setting applies to both tag loss detection (Python service) and missing entity alerts (backend).
                  <br />
                  <strong>Range:</strong> 5-3600 seconds (5 seconds to 1 hour)
                  <br />
                  <strong>Current:</strong> {formData.untracked_threshold_seconds} seconds ({Math.round(formData.untracked_threshold_seconds / 60)} minutes)
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

      <Card>
        <Card.Content>
          <div className="settings-info">
            <h3 className="info-title">System Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Backend API:</span>
                <span className="info-value">Running</span>
              </div>
              <div className="info-item">
                <span className="info-label">Python Service:</span>
                <span className="info-value">Port 5001</span>
              </div>
              <div className="info-item">
                <span className="info-label">Configuration Method:</span>
                <span className="info-value">HTTP API</span>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Settings;
