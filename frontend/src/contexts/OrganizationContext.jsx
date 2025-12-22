import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load organizations if user is authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
      loadOrganizations();
    } else {
      // Not authenticated, stop loading
      setLoading(false);
    }
  }, []);

  const loadOrganizations = async () => {
    try {
      const orgs = await api.get('/organizations/');
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
    setLoading(true);
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
