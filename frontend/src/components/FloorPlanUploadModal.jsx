import { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import Modal from './ui/Modal';
import ConfirmModal from './ConfirmModal';
import { uploadFloorPlan, deleteFloorPlan, getFloorPlanBlobUrl, fetchRooms, updateRoom } from '../services/api';
import './FloorPlanUploadModal.css';

const FloorPlanUploadModal = ({ isOpen, onClose, floor, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [existingPlanUrl, setExistingPlanUrl] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasExistingPlan = floor?.floor_plan_path;

  // Load existing floor plan when modal opens
  useEffect(() => {
    if (hasExistingPlan && isOpen) {
      const loadExistingPlan = async () => {
        const blobUrl = await getFloorPlanBlobUrl(floor.id);
        setExistingPlanUrl(blobUrl);
      };
      loadExistingPlan();
    }

    return () => {
      if (existingPlanUrl) {
        URL.revokeObjectURL(existingPlanUrl);
      }
    };
  }, [hasExistingPlan, isOpen, floor]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PNG, JPG, or GIF images only.');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      await uploadFloorPlan(floor.id, selectedFile);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error uploading floor plan:', err);
      setError(err.response?.data?.detail || 'Failed to upload floor plan');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    setError(null);

    try {
      // First, fetch all rooms on this floor
      const roomsOnFloor = await fetchRooms(floor.id);
      console.log(`Deleting floor plan for floor ${floor.id}, found ${roomsOnFloor.length} rooms`);

      // Delete polygon coordinates for all rooms on this floor
      const updatePromises = roomsOnFloor.map(room => {
        if (room.polygon_coordinates && room.polygon_coordinates.length > 0) {
          console.log(`Clearing coordinates for room: ${room.room_name}`);
          return updateRoom(room.id, { polygon_coordinates: null });
        }
        return Promise.resolve();
      });

      // Wait for all room updates to complete
      await Promise.all(updatePromises);
      console.log('All room coordinates cleared');

      // Then delete the floor plan
      await deleteFloorPlan(floor.id);
      console.log('Floor plan deleted');

      // Clean up blob URL
      if (existingPlanUrl) {
        URL.revokeObjectURL(existingPlanUrl);
        setExistingPlanUrl(null);
      }

      if (onUploadSuccess) {
        onUploadSuccess(); // This reloads floors in parent component
      }
      onClose();
    } catch (err) {
      console.error('Error deleting floor plan:', err);
      setError(err.response?.data?.detail || 'Failed to delete floor plan and room coordinates');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    onClose();
  };

  if (!floor) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>
        <ImageIcon size={24} />
        Floor Plan - Floor {floor.floor_number}
      </Modal.Header>

      <Modal.Body>
        <div className="floor-plan-upload-content">
          {/* Existing Floor Plan */}
          {hasExistingPlan && !selectedFile && existingPlanUrl && (
            <div className="existing-plan-section">
              <h3 className="section-title">Current Floor Plan</h3>
              <div className="plan-preview-container">
                <img
                  src={existingPlanUrl}
                  alt="Current floor plan"
                  className="plan-preview-image"
                />
              </div>
              <button
                onClick={handleDeleteClick}
                disabled={deleting}
                className="delete-plan-btn"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Floor Plan'}
              </button>
            </div>
          )}

          {/* Upload New Plan */}
          <div className="upload-section">
            <h3 className="section-title">
              {hasExistingPlan ? 'Replace Floor Plan' : 'Upload Floor Plan'}
            </h3>

            {!selectedFile ? (
              <div className="upload-area">
                <input
                  type="file"
                  id="floor-plan-file"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <label htmlFor="floor-plan-file" className="upload-label">
                  <Upload size={48} />
                  <p className="upload-text">Click to upload floor plan</p>
                  <p className="upload-hint">PNG, JPG, or GIF images only (max 10MB)</p>
                </label>
              </div>
            ) : (
              <div className="selected-file-section">
                {previewUrl && (
                  <div className="preview-container">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="preview-image"
                    />
                  </div>
                )}
                <div className="file-info">
                  <p className="file-name">{selectedFile.name}</p>
                  <p className="file-size">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="clear-selection-btn"
                >
                  <X size={16} />
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="info-section">
            <p className="info-text">
              After uploading the floor plan, you can mark room locations by clicking
              on the floor plan in the Live Tracking view.
            </p>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <button onClick={handleClose} className="btn-secondary">
          Cancel
        </button>
        {selectedFile && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Upload Floor Plan'}
          </button>
        )}
      </Modal.Footer>

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Floor Plan"
        message={`Are you sure you want to delete the floor plan for Floor ${floor?.floor_number}? This action cannot be undone. The floor plan image and all room coordinate markings will be permanently deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  );
};

export default FloorPlanUploadModal;
