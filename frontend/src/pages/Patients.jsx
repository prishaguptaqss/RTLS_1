import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import {
  fetchPatients,
  createPatient,
  updatePatient,
  deletePatient,
  dischargePatient,
  fetchPatientLocationHistory,
  fetchAvailableTags
} from '../services/api';
import './Patients.css';
import { FiEdit2, FiTrash2, FiClock, FiUserX } from "react-icons/fi";

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    name: '',
    age: '',
    email: '',
    mobile_number: '',
    assigned_tag_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPatients();
      setPatients(data);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError('Failed to load patients. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const data = await fetchAvailableTags();
      setAvailableTags(data);
    } catch (err) {
      console.error('Error loading available tags:', err);
      setAvailableTags([]);
    }
  };

  const validateForm = (isCreate = false) => {
    const errors = {};

    if (isCreate) {
      if (!formData.patient_id.trim()) {
        errors.patient_id = 'Patient ID is required';
      } else if (!/^[A-Za-z0-9_-]+$/.test(formData.patient_id)) {
        errors.patient_id = 'Patient ID can only contain letters, numbers, hyphens, and underscores';
      }
    }

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.age) {
      errors.age = 'Age is required';
    } else if (parseInt(formData.age) < 0 || parseInt(formData.age) > 150) {
      errors.age = 'Age must be between 0 and 150';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    try {
      setSubmitting(true);
      const patientData = {
        patient_id: formData.patient_id.trim(),
        name: formData.name.trim(),
        age: parseInt(formData.age),
        email: formData.email.trim() || null,
        mobile_number: formData.mobile_number.trim() || null,
        assigned_tag_id: formData.assigned_tag_id || null,
        status: 'admitted'
      };
      await createPatient(patientData);
      await loadPatients();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating patient:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to create patient' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    try {
      setSubmitting(true);
      const patientData = {
        name: formData.name.trim(),
        age: parseInt(formData.age),
        email: formData.email.trim() || null,
        mobile_number: formData.mobile_number.trim() || null,
        assigned_tag_id: formData.assigned_tag_id || null
      };
      await updatePatient(selectedPatient.patient_id, patientData);
      await loadPatients();
      setIsEditModalOpen(false);
      resetForm();
      setSelectedPatient(null);
    } catch (err) {
      console.error('Error updating patient:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to update patient' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    try {
      setSubmitting(true);
      await deletePatient(selectedPatient.patient_id);
      await loadPatients();
      setIsDeleteModalOpen(false);
      setSelectedPatient(null);
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Failed to delete patient');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischargePatient = async () => {
    try {
      setSubmitting(true);
      await dischargePatient(selectedPatient.patient_id);
      await loadPatients();
      setIsDischargeModalOpen(false);
      setSelectedPatient(null);
    } catch (err) {
      console.error('Error discharging patient:', err);
      alert(err.response?.data?.detail || 'Failed to discharge patient');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = async () => {
    resetForm();
    await loadAvailableTags();
    setIsCreateModalOpen(true);
  };

  const openEditModal = async (patient) => {
    setSelectedPatient(patient);
    await loadAvailableTags();
    setFormData({
      patient_id: patient.patient_id,
      name: patient.name,
      age: patient.age.toString(),
      email: patient.email || '',
      mobile_number: patient.mobile_number || '',
      assigned_tag_id: patient.assigned_tag_id || ''
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (patient) => {
    setSelectedPatient(patient);
    setIsDeleteModalOpen(true);
  };

  const openDischargeModal = (patient) => {
    setSelectedPatient(patient);
    setIsDischargeModalOpen(true);
  };

  const openHistoryModal = async (patient) => {
    setSelectedPatient(patient);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const data = await fetchPatientLocationHistory(patient.patient_id);
      setLocationHistory(data.history);
    } catch (err) {
      console.error('Error loading location history:', err);
      setLocationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      name: '',
      age: '',
      email: '',
      mobile_number: '',
      assigned_tag_id: ''
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatHistoryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`status-badge status-${status}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">Manage hospital patients</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">Loading patients...</div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">Manage hospital patients</p>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadPatients} className="btn btn-primary">
                Retry
              </button>
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
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">Manage hospital patients and track admissions</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          + Admit Patient
        </button>
      </div>

      <Card>
        <Card.Content>
          {patients.length === 0 ? (
            <div className="empty-state">
              <p>No patients found. Admit your first patient to get started.</p>
              <button onClick={openCreateModal} className="btn btn-primary">
                + Admit Patient
              </button>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Patient ID</Table.Head>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Age</Table.Head>
                  <Table.Head>Contact</Table.Head>
                  <Table.Head>Tag</Table.Head>
                  <Table.Head>Admission Time</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {patients.map((patient) => (
                  <Table.Row key={patient.patient_id}>
                    <Table.Cell><strong>{patient.patient_id}</strong></Table.Cell>
                    <Table.Cell>{patient.name}</Table.Cell>
                    <Table.Cell>{patient.age}</Table.Cell>
                    <Table.Cell>
                      {patient.email && <div>{patient.email}</div>}
                      {patient.mobile_number && <div>{patient.mobile_number}</div>}
                      {!patient.email && !patient.mobile_number && '-'}
                    </Table.Cell>
                    <Table.Cell>
                      {patient.assigned_tag_id ? (
                        <code>{patient.assigned_tag_id}</code>
                      ) : (
                        <span className="text-muted">Not assigned</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>{formatDate(patient.admission_time)}</Table.Cell>
                    <Table.Cell>{getStatusBadge(patient.status)}</Table.Cell>
                    <Table.Cell>
                      <div className="action-buttons">
                        <button
                          onClick={() => openHistoryModal(patient)}
                          className="btn-icon btn-info"
                          title="View location history"
                        >
                          <FiClock size={16} />
                        </button>
                        {patient.status === 'admitted' && (
                          <>
                            <button
                              onClick={() => openEditModal(patient)}
                              className="btn-icon btn-edit"
                              title="Edit patient"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => openDischargeModal(patient)}
                              className="btn-icon btn-discharge"
                              title="Discharge patient"
                            >
                              <FiUserX size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openDeleteModal(patient)}
                          className="btn-icon btn-delete"
                          title="Delete patient record"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* Create Patient Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsCreateModalOpen(false)}>
          Admit New Patient
        </Modal.Header>
        <form onSubmit={handleCreatePatient}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="patient_id">
                Patient ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="patient_id"
                name="patient_id"
                value={formData.patient_id}
                onChange={handleInputChange}
                placeholder="e.g., PAT-001, PATIENT-123"
                required
              />
              {formErrors.patient_id && (
                <small className="error-text">{formErrors.patient_id}</small>
              )}
              <small>Unique identifier for this patient</small>
            </div>

            <div className="form-group">
              <label htmlFor="name">
                Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter patient name"
                required
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="age">
                Age <span className="required">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="Enter age"
                min="0"
                max="150"
                required
              />
              {formErrors.age && (
                <small className="error-text">{formErrors.age}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="patient@example.com"
              />
              {formErrors.email && (
                <small className="error-text">{formErrors.email}</small>
              )}
              <small>Optional - Email address for contact</small>
            </div>

            <div className="form-group">
              <label htmlFor="mobile_number">Mobile Number</label>
              <input
                type="tel"
                id="mobile_number"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleInputChange}
                placeholder="e.g., +1234567890"
              />
              <small>Optional - Mobile number for contact</small>
            </div>

            <div className="form-group">
              <label htmlFor="assigned_tag_id">Assign Tracking Tag</label>
              <select
                id="assigned_tag_id"
                name="assigned_tag_id"
                value={formData.assigned_tag_id}
                onChange={handleInputChange}
              >
                <option value="">No tag assigned</option>
                {availableTags.map((tag) => (
                  <option key={tag.tag_id} value={tag.tag_id}>
                    {tag.tag_id}
                  </option>
                ))}
              </select>
              <small>Optional - Assign a BLE tag for location tracking</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
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
              {submitting ? 'Admitting...' : 'Admit Patient'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsEditModalOpen(false)}>
          Edit Patient
        </Modal.Header>
        <form onSubmit={handleUpdatePatient}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="edit-patient_id">Patient ID</label>
              <input
                type="text"
                id="edit-patient_id"
                name="patient_id"
                value={formData.patient_id}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small>Patient ID cannot be changed after admission</small>
            </div>

            <div className="form-group">
              <label htmlFor="edit-name">
                Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter patient name"
                required
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-age">
                Age <span className="required">*</span>
              </label>
              <input
                type="number"
                id="edit-age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="Enter age"
                min="0"
                max="150"
                required
              />
              {formErrors.age && (
                <small className="error-text">{formErrors.age}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-email">Email</label>
              <input
                type="email"
                id="edit-email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="patient@example.com"
              />
              {formErrors.email && (
                <small className="error-text">{formErrors.email}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-mobile_number">Mobile Number</label>
              <input
                type="tel"
                id="edit-mobile_number"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleInputChange}
                placeholder="e.g., +1234567890"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-assigned_tag_id">Assign Tracking Tag</label>
              <select
                id="edit-assigned_tag_id"
                name="assigned_tag_id"
                value={formData.assigned_tag_id}
                onChange={handleInputChange}
              >
                <option value="">No tag assigned</option>
                {availableTags.map((tag) => (
                  <option key={tag.tag_id} value={tag.tag_id}>
                    {tag.tag_id}
                  </option>
                ))}
              </select>
              <small>Optional - Change or remove tag assignment</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
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
              {submitting ? 'Updating...' : 'Update Patient'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <Modal.Header onClose={() => setIsDeleteModalOpen(false)}>
          Confirm Delete
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this patient record?</p>
          {selectedPatient && (
            <div className="delete-patient-info">
              <strong>{selectedPatient.name}</strong> ({selectedPatient.patient_id})
              {selectedPatient.email && <div>{selectedPatient.email}</div>}
            </div>
          )}
          <p className="warning-text">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeletePatient}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Patient'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Discharge Confirmation Modal */}
      <Modal isOpen={isDischargeModalOpen} onClose={() => setIsDischargeModalOpen(false)}>
        <Modal.Header onClose={() => setIsDischargeModalOpen(false)}>
          Discharge Patient
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to discharge this patient?</p>
          {selectedPatient && (
            <div className="discharge-patient-info">
              <strong>{selectedPatient.name}</strong> ({selectedPatient.patient_id})
              <div>Admitted: {formatDate(selectedPatient.admission_time)}</div>
              {selectedPatient.assigned_tag_id && (
                <div className="info-note">
                  The assigned tag ({selectedPatient.assigned_tag_id}) will be unassigned and made available for other patients.
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsDischargeModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDischargePatient}
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Discharging...' : 'Discharge Patient'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Location History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        size="large"
      >
        <Modal.Header onClose={() => setIsHistoryModalOpen(false)}>
          Location History
          {selectedPatient && (
            <div style={{ fontSize: '0.9rem', fontWeight: 'normal', marginTop: '0.5rem', color: '#666' }}>
              {selectedPatient.name} ({selectedPatient.patient_id})
            </div>
          )}
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="loading-state">Loading location history...</div>
          ) : locationHistory.length === 0 ? (
            <div className="empty-state">
              <p>No location history found for this patient.</p>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Location</Table.Head>
                  <Table.Head>Entered At</Table.Head>
                  <Table.Head>Exited At</Table.Head>
                  <Table.Head>Duration</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {locationHistory.map((record) => (
                  <Table.Row key={record.id}>
                    <Table.Cell>
                      <strong>{record.building_name}</strong> &gt; Floor {record.floor_number} &gt; {record.room_name}
                    </Table.Cell>
                    <Table.Cell>{formatHistoryDate(record.entered_at)}</Table.Cell>
                    <Table.Cell>
                      {record.exited_at ? formatHistoryDate(record.exited_at) : (
                        <span className="status-badge status-admitted">Currently here</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {record.duration_minutes !== null ? (
                        `${record.duration_minutes} min`
                      ) : (
                        '-'
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsHistoryModalOpen(false)}
            className="btn btn-secondary"
          >
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Patients;
