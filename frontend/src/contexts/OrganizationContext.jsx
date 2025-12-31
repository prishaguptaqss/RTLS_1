import { createContext, useContext, useState, useEffect } from 'react';
import { fetchOrganizations } from '../services/api';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrganizations = async () => {
    try {
      const orgs = await fetchOrganizations();
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

  useEffect(() => {
    // Only load organizations if user is authenticated
    const token = localStorage.getItem('authToken');
    const orgId = localStorage.getItem('currentOrganizationId');

    if (token && orgId) {
      loadOrganizations();
    } else {
      setLoading(false);
    }

    // Listen for organization changes (e.g., after login)
    const handleOrganizationChange = () => {
      const newOrgId = localStorage.getItem('currentOrganizationId');
      if (newOrgId) {
        loadOrganizations();
      }
    };

    window.addEventListener('organizationChanged', handleOrganizationChange);

    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const initializeOrganization = async () => {
    // This method is called after login to set up organization
    const orgId = localStorage.getItem('currentOrganizationId');
    if (orgId) {
      await loadOrganizations();
    }
  };

  return (
    <OrganizationContext.Provider value={{
      currentOrganization,
      organizations,
      switchOrganization,
      reloadOrganizations,
      initializeOrganization,
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
