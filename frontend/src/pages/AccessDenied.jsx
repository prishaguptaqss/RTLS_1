import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import './AccessDenied.css';

const AccessDenied = ({ page = 'this page' }) => {
  const navigate = useNavigate();

  return (
    <div className="access-denied-container">
      <div className="access-denied-content">
        <ShieldAlert size={64} className="access-denied-icon" />
        <h1>Access Denied</h1>
        <p>You don't have permission to access {page}.</p>
        <p className="access-denied-hint">
          Please contact your administrator if you believe you should have access.
        </p>
        {/* <button
          className="btn-primary"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button> */}
      </div>
    </div>
  );
};

export default AccessDenied;
