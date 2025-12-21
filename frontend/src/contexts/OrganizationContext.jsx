import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const OrganizationContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const OrganizationProvider = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/organizations/`);
      const orgs = response.data;
      setOrganizations(orgs);

      // Load saved organization from localStorage
      const savedOrgId = localStorage.getItem('currentOrganizationId');

      if (savedOrgId) {
        const savedOrg = orgs.find(o => o.id === parseInt(savedOrgId));
        if (savedOrg) {
          setCurrentOrganization(savedOrg);
        } else if (orgs.length > 0) {
          // If saved org not found, use first organization
          setCurrentOrganization(orgs[0]);
          localStorage.setItem('currentOrganizationId', orgs[0].id);
        }
      } else if (orgs.length > 0) {
        // No saved org, use first one
        setCurrentOrganization(orgs[0]);
        localStorage.setItem('currentOrganizationId', orgs[0].id);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (orgId) => {
    const org = organizations.find(o => o.id === parseInt(orgId));
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('currentOrganizationId', org.id);
      // Reload the page to refresh all data with new organization context
      window.location.reload();
    }
  };

  const reloadOrganizations = async () => {
    await loadOrganizations();
  };

  return (
    <OrganizationContext.Provider value={{
      currentOrganization,
      organizations,
      switchOrganization,
      reloadOrganizations,
      loading
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
