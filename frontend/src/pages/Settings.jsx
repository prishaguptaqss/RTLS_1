import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { Eye, EyeOff } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    untracked_threshold_seconds: 30,
    smtp_host: '',
    smtp_port: '',
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    mail_signature_text: '',
    mail_signature_logo: '',
    organization_website: '',
    organization_phone: '',
    organization_address_line: '',
    social_links: []
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
        smtp_from_name: data.smtp_from_name || '',
        mail_signature_text: data.mail_signature_text || '',
        mail_signature_logo: data.mail_signature_logo || '',
        organization_website: data.organization_website || '',
        organization_phone: data.organization_phone || '',
        organization_address_line: data.organization_address_line || '',
        social_links: data.social_links || []
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

      // Add email settings (send even if empty to allow clearing)
      updateData.smtp_host = formData.smtp_host || '';
      updateData.smtp_port = formData.smtp_port ? parseInt(formData.smtp_port) : null;
      updateData.smtp_username = formData.smtp_username || '';
      // Handle password: send empty string to clear, or new password to update
      // Don't send if it's still the masked value (user didn't change it)
      if (formData.smtp_password !== '********') {
        updateData.smtp_password = formData.smtp_password || '';
      }
      updateData.smtp_from_email = formData.smtp_from_email || '';
      updateData.smtp_from_name = formData.smtp_from_name || '';

      // Add mail signature settings (send even if empty to allow clearing)
      updateData.mail_signature_text = formData.mail_signature_text || '';
      updateData.mail_signature_logo = formData.mail_signature_logo || '';
      updateData.organization_website = formData.organization_website || '';
      updateData.organization_phone = formData.organization_phone || '';
      updateData.organization_address_line = formData.organization_address_line || '';
      updateData.social_links = formData.social_links || [];

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

  const handleAddSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      social_links: [...prev.social_links, { platform: '', url: '' }]
    }));
  };

  const handleRemoveSocialLink = (index) => {
    setFormData(prev => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== index)
    }));
  };

  const handleSocialLinkChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      social_links: prev.social_links.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const handleSignatureLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PNG, JPG, or GIF image.');
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1 * 1024 * 1024) {
      setError('File size exceeds 1MB. Please upload a smaller image.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/settings/upload-signature-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Organization-ID': currentOrganization.id.toString()
        },
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();

      // Update form data with the file path
      setFormData(prev => ({ ...prev, mail_signature_logo: data.file_path }));

      // Reload settings to ensure consistency with database
      await loadSettings();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading signature logo:', err);
      setError(err.message || 'Failed to upload signature logo');
    } finally {
      setUploading(false);
    }
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
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="smtp_password"
                    name="smtp_password"
                    value={formData.smtp_password}
                    onChange={handleInputChange}
                    placeholder="Enter password to update"
                    className="settings-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
            </div>

            <div className="settings-section">
              <h2 className="section-title">Mail Signature Configuration</h2>
              <p className="section-description">
                Customize email signatures and footer information for all emails sent by the system.
                Note: The organization logo from organization settings will be used by default in emails.
              </p>

              <div className="form-group">
                <label htmlFor="mail_signature_text">Email Signature</label>
                <textarea
                  id="mail_signature_text"
                  name="mail_signature_text"
                  value={formData.mail_signature_text}
                  onChange={handleInputChange}
                  placeholder="Best regards,&#10;Your Organization Team"
                  rows="4"
                  className="settings-input"
                />
                <small className="help-text">
                  Custom signature text for emails. Leave blank to use default signature with organization name.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="mail_signature_logo">Email Signature Logo/Image</label>
                <input
                  type="file"
                  id="mail_signature_logo"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  onChange={handleSignatureLogoUpload}
                  className="settings-input"
                  disabled={uploading}
                />
                {uploading && <p className="upload-status">Uploading...</p>}
                {formData.mail_signature_logo && (
                  <div className="signature-logo-preview">
                    <img
                      src={`http://localhost:3000/${formData.mail_signature_logo}`}
                      alt="Signature Logo Preview"
                      style={{ maxWidth: '200px', maxHeight: '100px', marginTop: '10px', border: '1px solid #ddd', padding: '5px' }}
                    />
                    <p className="file-path-display">{formData.mail_signature_logo}</p>
                  </div>
                )}
                <small className="help-text">
                  Upload an image for email signature (PNG, JPG, or GIF, max 1MB). The image will be displayed below the signature text in emails.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="organization_website">Organization Website</label>
                <input
                  type="url"
                  id="organization_website"
                  name="organization_website"
                  value={formData.organization_website}
                  onChange={handleInputChange}
                  placeholder="https://www.yourorganization.com"
                  className="settings-input"
                />
                <small className="help-text">
                  Website URL to display in email footer
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="organization_phone">Organization Phone</label>
                <input
                  type="tel"
                  id="organization_phone"
                  name="organization_phone"
                  value={formData.organization_phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  className="settings-input"
                />
                <small className="help-text">
                  Contact phone number to display in email footer
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="organization_address_line">Organization Address</label>
                <input
                  type="text"
                  id="organization_address_line"
                  name="organization_address_line"
                  value={formData.organization_address_line}
                  onChange={handleInputChange}
                  placeholder="123 Main St, City, State, ZIP"
                  className="settings-input"
                />
                <small className="help-text">
                  Full address to display in email footer
                </small>
              </div>

              <div className="form-group">
                <label>Social Media Links</label>
                <div className="social-links-container">
                  {formData.social_links.map((link, index) => (
                    <div key={index} className="social-link-row">
                      <input
                        type="text"
                        placeholder="Platform (e.g., Facebook, Twitter, LinkedIn)"
                        value={link.platform}
                        onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                        className="settings-input social-platform-input"
                      />
                      <input
                        type="url"
                        placeholder="https://www.example.com/yourprofile"
                        value={link.url}
                        onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                        className="settings-input social-url-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSocialLink(index)}
                        className="btn btn-danger btn-small"
                        title="Remove this social link"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    className="btn btn-secondary btn-add-social"
                  >
                    + Add Social Link
                  </button>
                </div>
                <small className="help-text">
                  Add social media links to display in email footer
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
