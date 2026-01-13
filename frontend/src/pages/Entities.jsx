import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import PermissionGate from '../components/PermissionGate';
import {
  fetchEntities,
  createEntity,
  updateEntity,
  fetchEntityLocationHistory,
  fetchAvailableTags
} from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import { useSearch } from '../contexts/SearchContext';
import './Entities.css';
import { FiEdit2, FiTrash2, FiClock, FiUserX, FiUser, FiPackage, FiEye } from "react-icons/fi";

const Entities = () => {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const { searchQuery } = useSearch();
  const [entities, setEntities] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUntrackModalOpen, setIsUntrackModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    entity_id: '',
    type: 'patient',
    name: '',
    age: null,
    email: '',
    phone: '',
    assigned_tag_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Only load entities when organization is loaded
    if (!orgLoading && currentOrganization) {
      loadEntities();
    }
  }, [orgLoading, currentOrganization]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEntities(null); // Load all patients (no type filter)
      setEntities(data);
    } catch (err) {
      console.error('Error loading entities:', err);
      // Check if it's a permission error (403 Forbidden)
      if (err.response?.status === 403) {
        setError('You do not have permission to view patients. Please contact your administrator.');
      } else {
        const errorMsg = err.response?.data?.detail || err.message || 'Failed to load patients';
        setError(`Failed to load patients: ${errorMsg}`);
      }
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
      if (!formData.entity_id.trim()) {
        errors.entity_id = 'Patient ID is required';
      } else if (!/^[A-Za-z0-9_-]+$/.test(formData.entity_id)) {
        errors.entity_id = 'Patient ID can only contain letters, numbers, hyphens, and underscores';
      }
    }

    // Validate name (required)
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Patient name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(formData.name.trim())) {
      errors.name = 'Name can only contain letters, spaces, dots, hyphens, and apostrophes';
    }

    // Validate age
    if (formData.age !== null && formData.age !== '') {
      const age = parseInt(formData.age);
      if (isNaN(age) || age < 0 || age > 150) {
        errors.age = 'Age must be between 0 and 150';
      }
    }

    // Validate email format (improved validation)
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Invalid email format (e.g., user@example.com)';
      }
    }

    // Validate phone number format (improved validation)
    if (formData.phone && formData.phone.trim()) {
      // Remove spaces, dashes, and parentheses for validation
      const cleanedPhone = formData.phone.replace(/[\s\-()]/g, '');
      // Check if it contains only digits and optional + at start
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        errors.phone = 'Invalid phone number';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    // Ensure organization is loaded
    if (!currentOrganization) {
      setFormErrors({ submit: 'Please wait for organization to load...' });
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors({}); // Clear previous errors
      const entityData = {
        entity_id: formData.entity_id.trim(),
        type: formData.type,
        name: formData.name.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        assigned_tag_id: formData.assigned_tag_id || null
      };
      await createEntity(entityData);
      await loadEntities();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating entity:', err);
      const errorDetail = err.response?.data?.detail || err.message || 'Failed to create patient';

      // Handle specific uniqueness errors
      if (errorDetail.toLowerCase().includes('entity_id') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ entity_id: 'Patient ID already exists in this organization.' });
      } else if (errorDetail.toLowerCase().includes('organization')) {
        setFormErrors({ submit: 'Organization error: ' + errorDetail });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEntity = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    try {
      setSubmitting(true);
      const entityData = {
        name: formData.name.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        assigned_tag_id: formData.assigned_tag_id || null
      };
      await updateEntity(selectedEntity.entity_id, entityData);
      await loadEntities();
      setIsEditModalOpen(false);
      resetForm();
      setSelectedEntity(null);
    } catch (err) {
      console.error('Error updating entity:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to update patient';
      setFormErrors({ submit: errorDetail });
    } finally {
      setSubmitting(false);
    }
  };


  const openCreateModal = async () => {
    resetForm();
    await loadAvailableTags();
    setIsCreateModalOpen(true);
  };

  const openEditModal = async (entity) => {
    setSelectedEntity(entity);
    await loadAvailableTags();
    // Include currently assigned tag in available tags for edit
    setFormData({
      entity_id: entity.entity_id,
      name: entity.name || '',
      type: entity.type,
      age: entity.age || null,
      email: entity.email || '',
      phone: entity.phone || '',
      assigned_tag_id: entity.assigned_tag_id || ''
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (entity) => {
    setSelectedEntity(entity);
    setIsViewModalOpen(true);
  };

  const openHistoryModal = async (entity) => {
    setSelectedEntity(entity);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    setCurrentPage(1); // Reset to first page
    try {
      const data = await fetchEntityLocationHistory(entity.entity_id);
      setLocationHistory(data.history);
    } catch (err) {
      console.error('Error loading location history:', err);
      setLocationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openUntrackModal = (entity) => {
    setSelectedEntity(entity);
    setIsUntrackModalOpen(true);
  };

  const handleUntrackEntity = async () => {
    try {
      setSubmitting(true);
      // Update entity with assigned_tag_id set to null to unassign the tag
      const entityData = {
        name: selectedEntity.name,
        type: selectedEntity.type,
        assigned_tag_id: null
      };
      await updateEntity(selectedEntity.entity_id, entityData);
      await loadEntities();
      setIsUntrackModalOpen(false);
      setSelectedEntity(null);
    } catch (err) {
      console.error('Error untracking entity:', err);
      alert('Failed to untrack patient');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entity_id: '',
      name: '',
      type: 'patient',
      age: null,
      email: '',
      phone: '',
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

  const downloadHistoryAsCSV = () => {
    if (!selectedEntity || locationHistory.length === 0) return;

    // CSV header
    const headers = ['Location', 'Entered At', 'Exited At', 'Duration (minutes)'];

    // CSV rows
    const rows = locationHistory.map(record => [
      `${record.building_name} > Floor ${record.floor_number} > ${record.room_name}`,
      formatHistoryDate(record.entered_at),
      record.exited_at ? formatHistoryDate(record.exited_at) : 'Currently here',
      record.duration_minutes !== null ? record.duration_minutes : '-'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedEntity.entity_id}_location_history.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadHistoryAsPDF = () => {
    if (!selectedEntity || locationHistory.length === 0) return;

    // Create a new window for printing
    const printWindow = window.open('', '', 'width=800,height=600');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Location History - ${selectedEntity.name || selectedEntity.entity_id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #666;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #4CAF50;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .current {
            background-color: #4CAF50;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>Location History Report</h1>
        <div class="subtitle">
          <strong>Entity:</strong> ${selectedEntity.name || selectedEntity.entity_id} (${selectedEntity.entity_id})<br>
          <strong>Generated:</strong> ${new Date().toLocaleString()}
        </div>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Entered At</th>
              <th>Exited At</th>
              <th>Duration (min)</th>
            </tr>
          </thead>
          <tbody>
            ${locationHistory.map(record => `
              <tr>
                <td><strong>${record.building_name}</strong> &gt; Floor ${record.floor_number} &gt; ${record.room_name}</td>
                <td>${formatHistoryDate(record.entered_at)}</td>
                <td>${record.exited_at ? formatHistoryDate(record.exited_at) : '<span class="current">Currently here</span>'}</td>
                <td>${record.duration_minutes !== null ? record.duration_minutes : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      // Close window after printing (optional)
      setTimeout(() => {
        printWindow.close();
      }, 100);
    };
  };

  const handleDownloadHistory = (format) => {
    if (format === 'csv') {
      downloadHistoryAsCSV();
    } else if (format === 'pdf') {
      downloadHistoryAsPDF();
    }
  };

  const getTypeBadge = (type) => {
    const typeStyles = {
      person: 'badge-blue',
      material: 'badge-green'
    };
    return (
      <span className={`entity-type-badge ${typeStyles[type] || 'badge-gray'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const getTrackingStatusBadge = (trackingStatus) => {
    return (
      <span className={`status-badge status-${trackingStatus === 'tracked' ? 'tracked' : 'untracked'}`}>
        {trackingStatus || 'not tracking'}
      </span>
    );
  };

  // Filter entities based on global search only (no type filtering)
  const filteredEntities = entities.filter(entity => {
    // Filter by search query
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      entity.entity_id?.toLowerCase().includes(query) ||
      entity.name?.toLowerCase().includes(query) ||
      entity.tag_name?.toLowerCase().includes(query)
    );
  });

  // Show loading state while organization or entities are loading
  if (orgLoading || (loading && !currentOrganization)) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Patients</h1>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">
              {orgLoading ? 'Loading organization...' : 'Loading entities...'}
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  // Show message if no organization selected
  if (!currentOrganization) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Patients</h1>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>No organization selected. Please select an organization from the sidebar.</p>
            </div>
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
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadEntities} className="btn btn-primary">
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
        </div>
      </div>

      <Card>
        <Card.Header>
          <div className="section-header">
            <div>
              <div className="section-title">
                <FiUser size={20} />
                <h2>Patients</h2>
              </div>
              {/* <p className="section-subtitle">
                {filteredEntities.length} patient{filteredEntities.length !== 1 ? 's' : ''} configured
              </p> */}
            </div>
            <PermissionGate permission="ENTITY_ADMIT">
              <button onClick={openCreateModal} className="btn btn-primary">
                + Add Patient
              </button>
            </PermissionGate>
          </div>
        </Card.Header>
        <Card.Content>
          {filteredEntities.length === 0 ? (
            <div className="empty-state">
              <p>{searchQuery.trim() ? 'No matching patients found.' : 'No patients found. Add your first patient to get started.'}</p>
              {!searchQuery.trim() && (
                <PermissionGate permission="ENTITY_ADMIT">
                  <button onClick={openCreateModal} className="btn btn-primary">
                    + Add Patient
                  </button>
                </PermissionGate>
              )}
            </div>
          ) : (
            <>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>ID</Table.Head>
                    <Table.Head>Name</Table.Head>
                    <Table.Head>Tag</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Current Location</Table.Head>
                    <Table.Head>Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredEntities
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((entity) => (
                      <Table.Row key={entity.entity_id}>
                        <Table.Cell><strong>{entity.entity_id}</strong></Table.Cell>
                        <Table.Cell>{entity.name || '-'}</Table.Cell>
                        <Table.Cell>
                          {entity.tag_name ? (
                            <code>{entity.tag_name}</code>
                          ) : (
                            <span className="text-muted">Not assigned</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>{getTrackingStatusBadge(entity.tracking_status)}</Table.Cell>
                        <Table.Cell>
                          {entity.current_location || '-'}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="action-buttons">
                            <button
                              onClick={() => openViewModal(entity)}
                              className="btn-icon btn-view"
                              title="View patient details"
                            >
                              <FiEye size={16} />
                            </button>
                            <button
                              onClick={() => openHistoryModal(entity)}
                              className="btn-icon btn-info"
                              title="View location history"
                            >
                              <FiClock size={16} />
                            </button>
                            {entity.assigned_tag_id && (
                              <button
                                onClick={() => openUntrackModal(entity)}
                                className="btn-icon btn-warning"
                                title="Untrack patient (unassign tag)"
                              >
                                <FiUserX size={16} />
                              </button>
                            )}
                            <PermissionGate permission="ENTITY_EDIT">
                              <button
                                onClick={() => openEditModal(entity)}
                                className="btn-icon btn-edit"
                                title="Edit patient"
                              >
                                <FiEdit2 size={16} />
                              </button>
                            </PermissionGate>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table>

              {/* Entities Pagination */}
              {filteredEntities.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: '0.3rem',
                  padding: '0.3rem 0'
                }}>
                  {/* Record count */}
                  <span style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '400'
                  }}>
                    {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEntities.length)} of {filteredEntities.length}
                  </span>

                  {/* Navigation buttons */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {/* First page */}
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '0.375rem 0.5rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        color: currentPage === 1 ? '#d1d5db' : '#6b7280',
                        fontSize: '1rem'
                      }}
                      title="First page"
                    >
                      ⟪
                    </button>

                    {/* Previous page */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '0.375rem 0.5rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        color: currentPage === 1 ? '#d1d5db' : '#6b7280',
                        fontSize: '1rem'
                      }}
                      title="Previous page"
                    >
                      ‹
                    </button>

                    {/* Page indicator */}
                    <span style={{
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      fontWeight: '400',
                      padding: '0 0.5rem'
                    }}>
                      Page {currentPage} of {Math.ceil(filteredEntities.length / itemsPerPage) || 1}
                    </span>

                    {/* Next page */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredEntities.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredEntities.length / itemsPerPage)}
                      style={{
                        padding: '0.375rem 0.5rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: currentPage === Math.ceil(filteredEntities.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                        color: currentPage === Math.ceil(filteredEntities.length / itemsPerPage) ? '#d1d5db' : '#6b7280',
                        fontSize: '1rem'
                      }}
                      title="Next page"
                    >
                      ›
                    </button>

                    {/* Last page */}
                    <button
                      onClick={() => setCurrentPage(Math.ceil(filteredEntities.length / itemsPerPage))}
                      disabled={currentPage === Math.ceil(filteredEntities.length / itemsPerPage)}
                      style={{
                        padding: '0.375rem 0.5rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: currentPage === Math.ceil(filteredEntities.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                        color: currentPage === Math.ceil(filteredEntities.length / itemsPerPage) ? '#d1d5db' : '#6b7280',
                        fontSize: '1rem'
                      }}
                      title="Last page"
                    >
                      ⟫
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      {/* Create Entity Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsCreateModalOpen(false)}>
          Add New Patient
        </Modal.Header>
        <form onSubmit={handleCreateEntity}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="entity_id">
                Patient ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="entity_id"
                name="entity_id"
                value={formData.entity_id}
                onChange={handleInputChange}
                placeholder="e.g., PAT-001, MAT-123"
                className={formErrors.entity_id ? 'input-error' : ''}
                required
              />
              {formErrors.entity_id && (
                <small className="error-text">{formErrors.entity_id}</small>
              )}
              {/* <small>Unique identifier for this patient</small> */}
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
                className={formErrors.name ? 'input-error' : ''}
                required
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age || ''}
                onChange={handleInputChange}
                placeholder="e.g., 25"
                min="0"
                max="150"
                className={formErrors.age ? 'input-error' : ''}
              />
              {formErrors.age && (
                <small className="error-text">{formErrors.age}</small>
              )}
              {/* <small>Patient age (0-150 years)</small> */}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                placeholder="patient@example.com"
                className={formErrors.email ? 'input-error' : ''}
              />
              {formErrors.email && (
                <small className="error-text">{formErrors.email}</small>
              )}
              {/* <small>Contact email address (optional)</small> */}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                placeholder="e.g., +1234567890"
                className={formErrors.phone ? 'input-error' : ''}
              />
              {formErrors.phone && (
                <small className="error-text">{formErrors.phone}</small>
              )}
              {/* <small>Contact phone number (optional)</small> */}
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
                    {tag.name || tag.tag_id}
                  </option>
                ))}
              </select>
              {/* <small>Optional - Assign a BLE tag for location tracking</small> */}
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
              {submitting ? 'Creating...' : 'Create Patient'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Edit Entity Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsEditModalOpen(false)}>
          Edit Patient
        </Modal.Header>
        <form onSubmit={handleUpdateEntity}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="edit-entity_id">Patient ID</label>
              <input
                type="text"
                id="edit-entity_id"
                name="entity_id"
                value={formData.entity_id}
                disabled
              />
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
                className={formErrors.name ? 'input-error' : ''}
                required
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-age">Age</label>
              <input
                type="number"
                id="edit-age"
                name="age"
                value={formData.age || ''}
                onChange={handleInputChange}
                placeholder="e.g., 25"
                min="0"
                max="150"
                className={formErrors.age ? 'input-error' : ''}
              />
              {formErrors.age && (
                <small className="error-text">{formErrors.age}</small>
              )}
              {/* <small>Patient age (0-150 years)</small> */}
            </div>

            <div className="form-group">
              <label htmlFor="edit-email">Email</label>
              <input
                type="email"
                id="edit-email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                placeholder="patient@example.com"
                className={formErrors.email ? 'input-error' : ''}
              />
              {formErrors.email && (
                <small className="error-text">{formErrors.email}</small>
              )}
              {/* <small>Contact email address (optional)</small> */}
            </div>

            <div className="form-group">
              <label htmlFor="edit-phone">Phone Number</label>
              <input
                type="tel"
                id="edit-phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                placeholder="e.g., +1234567890"
                className={formErrors.phone ? 'input-error' : ''}
              />
              {formErrors.phone && (
                <small className="error-text">{formErrors.phone}</small>
              )}
              {/* <small>Contact phone number (optional)</small> */}
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
                {/* Show currently assigned tag even if not in available list */}
                {selectedEntity?.assigned_tag_id && !availableTags.find(t => t.tag_id === selectedEntity.assigned_tag_id) && (
                  <option value={selectedEntity.assigned_tag_id}>
                    {selectedEntity.tag_name || selectedEntity.assigned_tag_id} (Currently assigned)
                  </option>
                )}
                {availableTags.map((tag) => (
                  <option key={tag.tag_id} value={tag.tag_id}>
                    {tag.name || tag.tag_id}
                  </option>
                ))}
              </select>
              {/* <small>Optional - Change or remove tag assignment</small> */}
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

      {/* Location History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        size="large"
      >
        <Modal.Header onClose={() => setIsHistoryModalOpen(false)}>
          Location History
          {selectedEntity && (
            <div style={{ fontSize: '0.9rem', fontWeight: 'normal', marginTop: '0.5rem', color: '#666' }}>
              {selectedEntity.name || selectedEntity.entity_id} ({selectedEntity.entity_id})
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
            <>
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
                  {locationHistory
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((record) => (
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
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            {/* Left side - Download buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {locationHistory.length > 0 && (
                <>
                  <button
                    onClick={() => handleDownloadHistory('csv')}
                    className="btn btn-primary"
                    title="Download as CSV"
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={() => handleDownloadHistory('pdf')}
                    className="btn btn-primary"
                    title="Download/Print as PDF"
                  >
                    Download PDF
                  </button>
                </>
              )}
            </div>

            {/* Center - Pagination Controls */}
            {locationHistory.length > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1.5rem',
                fontSize: '0.875rem'
              }}>
                {/* Left side - Record count */}
                <span style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  fontWeight: '400'
                }}>
                  {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, locationHistory.length)} of {locationHistory.length}
                </span>

                {/* Navigation buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {/* First page */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}
                    title="First page"
                  >
                    ⟪
                  </button>

                  {/* Previous page */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}
                    title="Previous page"
                  >
                    ‹
                  </button>

                  {/* Page indicator */}
                  <span style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    padding: '0 0.5rem'
                  }}>
                    Page {currentPage} of {Math.ceil(locationHistory.length / itemsPerPage)}
                  </span>

                  {/* Next page */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(locationHistory.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(locationHistory.length / itemsPerPage)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      cursor: currentPage === Math.ceil(locationHistory.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                      opacity: currentPage === Math.ceil(locationHistory.length / itemsPerPage) ? 0.5 : 1,
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}
                    title="Next page"
                  >
                    ›
                  </button>

                  {/* Last page */}
                  <button
                    onClick={() => setCurrentPage(Math.ceil(locationHistory.length / itemsPerPage))}
                    disabled={currentPage === Math.ceil(locationHistory.length / itemsPerPage)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      cursor: currentPage === Math.ceil(locationHistory.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                      opacity: currentPage === Math.ceil(locationHistory.length / itemsPerPage) ? 0.5 : 1,
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}
                    title="Last page"
                  >
                    ⟫
                  </button>
                </div>
              </div>
            )}

            {/* Right side - Close button */}
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* View Patient Details Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)}>
        <Modal.Header onClose={() => setIsViewModalOpen(false)}>
          Patient Details
        </Modal.Header>
        <Modal.Body>
          {selectedEntity && (
            <div className="patient-details">
              <div className="detail-row">
                <label>Patient ID:</label>
                <span>{selectedEntity.entity_id}</span>
              </div>
              <div className="detail-row">
                <label>Name:</label>
                <span>{selectedEntity.name || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Age:</label>
                <span>{selectedEntity.age || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Email:</label>
                <span>{selectedEntity.email || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Phone:</label>
                <span>{selectedEntity.phone || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Assigned Tag:</label>
                <span>
                  {selectedEntity.tag_name ? (
                    <code>{selectedEntity.tag_name}</code>
                  ) : selectedEntity.assigned_tag_id ? (
                    <code>{selectedEntity.assigned_tag_id}</code>
                  ) : (
                    'Not assigned'
                  )}
                </span>
              </div>
              <div className="detail-row">
                <label>Tracking Status:</label>
                <span>{getTrackingStatusBadge(selectedEntity.tracking_status)}</span>
              </div>
              <div className="detail-row">
                <label>Current Location:</label>
                <span>{selectedEntity.current_location || 'Unknown'}</span>
              </div>
              <div className="detail-row">
                <label>Created At:</label>
                <span>{selectedEntity.created_at ? new Date(selectedEntity.created_at).toLocaleString() : '-'}</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="btn btn-secondary"
          >
            Close
          </button>
        </Modal.Footer>
      </Modal>

      {/* Untrack Entity Modal */}
      <Modal isOpen={isUntrackModalOpen} onClose={() => setIsUntrackModalOpen(false)}>
        <Modal.Header onClose={() => setIsUntrackModalOpen(false)}>
          Unassign tag from Patient
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to stop tracking this patient?</p>
          {selectedEntity && (
            <div className="delete-entity-info">
              <strong>{selectedEntity.name || selectedEntity.entity_id}</strong> ({selectedEntity.entity_id})
              {selectedEntity.tag_name && (
                <div style={{ marginTop: '0.5rem' }}>
                  Currently tracked with tag: <code>{selectedEntity.tag_name || selectedEntity.assigned_tag_id}</code>
                </div>
              )}
            </div>
          )}
          <p className="warning-text" style={{ marginTop: '1rem' }}>
            This will unassign the tag from this patient. The tag will become available for assignment to other patients.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsUntrackModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleUntrackEntity}
            className="btn btn-warning"
            disabled={submitting}
          >
            {submitting ? 'Unassigning...' : 'Unassign tag'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Entities;
