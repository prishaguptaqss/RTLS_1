import { useState, useRef } from 'react';
import Modal from './ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { uploadProfilePicture as uploadProfilePictureAPI, removeProfilePicture as removeProfilePictureAPI } from '../services/api';
import { Upload, X, User as UserIcon } from 'lucide-react';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const { success, error: showError } = useToast();
  const [profileImage, setProfileImage] = useState(
    user?.profile_picture ? `http://localhost:3000${user.profile_picture}` : null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      showError('Image size must be less than 5MB');
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImage(e.target.result);
      uploadProfilePicture(file);
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  // Handle drag and drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  // Upload profile picture to server
  const uploadProfilePicture = async (file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('profile_picture', file);

      const response = await uploadProfilePictureAPI(formData);

      // Update local state with the returned URL
      if (response.profile_picture_url) {
        const fullUrl = `http://localhost:3000${response.profile_picture_url}`;
        setProfileImage(fullUrl);
      }

      // Refresh user data from server to get the updated profile picture
      await refreshUser();

      success('Profile picture updated successfully');
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to upload profile picture. Please try again.';
      showError(errorMsg);
      setProfileImage(user?.profile_picture || null);
    } finally {
      setUploading(false);
    }
  };

  // Remove profile picture
  const handleRemoveImage = async () => {
    try {
      setUploading(true);
      await removeProfilePictureAPI();

      setProfileImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      success('Profile picture removed successfully');
    } catch (err) {
      console.error('Error removing profile picture:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to remove profile picture. Please try again.';
      showError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>
        User Profile
      </Modal.Header>
      <Modal.Body>
        <div className="profile-modal-content">
          {/* Profile Picture Section */}
          <div className="profile-picture-section">
            <div className="profile-picture-label">Profile Picture</div>

            <div
              className={`profile-picture-upload ${isDragging ? 'dragging' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {profileImage ? (
                <div className="profile-picture-preview">
                  <img src={profileImage} alt="Profile" className="profile-picture-img" />
                  <button
                    type="button"
                    className="remove-picture-btn"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    title="Remove picture"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="profile-picture-placeholder">
                  <div className="placeholder-icon">
                    <UserIcon size={48} />
                  </div>
                  <div className="placeholder-text">
                    <Upload size={20} />
                    <span>Drag & drop your photo here</span>
                    <span className="placeholder-subtext">or</span>
                    <button
                      type="button"
                      className="upload-btn"
                      onClick={handleUploadClick}
                      disabled={uploading}
                    >
                      Browse Files
                    </button>
                    <span className="placeholder-hint">
                      Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileInputChange}
                className="file-input-hidden"
                disabled={uploading}
              />
            </div>

            {profileImage && (
              <button
                type="button"
                className="change-picture-btn"
                onClick={handleUploadClick}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Change Picture'}
              </button>
            )}
          </div>

          {/* User Information Section */}
          <div className="profile-info-section">
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <label className="profile-info-label">Name</label>
                <div className="profile-info-value">{user?.name || 'N/A'}</div>
              </div>

              <div className="profile-info-item">
                <label className="profile-info-label">Email</label>
                <div className="profile-info-value">{user?.email || 'N/A'}</div>
              </div>

              <div className="profile-info-item">
                <label className="profile-info-label">Phone Number</label>
                <div className="profile-info-value">{user?.phone || 'N/A'}</div>
              </div>

              <div className="profile-info-item">
                <label className="profile-info-label">User ID</label>
                <div className="profile-info-value">{user?.id || 'N/A'}</div>
              </div>

              <div className="profile-info-item">
                <label className="profile-info-label">Role</label>
                <div className="profile-info-value">
                  {user?.is_admin ? (
                    <span className="role-badge admin">System Administrator</span>
                  ) : (
                    <span className="role-badge">{user?.role?.name || 'Staff'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          onClick={handleClose}
          className="btn btn-primary"
        >
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProfileModal;