import { createContext, useContext, useState, useEffect } from 'react';
import { fetchOrganizations } from '../services/api';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrganizations = async () => {
    try {
      console.log('[OrganizationContext] Loading organizations...');
      const orgs = await fetchOrganizations();
      console.log('[OrganizationContext] Fetched organizations:', orgs);
      setOrganizations(orgs);

      // Load saved organization from localStorage
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      console.log('[OrganizationContext] Saved org ID from localStorage:', savedOrgId);

      if (savedOrgId) {
        const savedOrg = orgs.find(o => o.id === parseInt(savedOrgId));
        if (savedOrg) {
          console.log('[OrganizationContext] Using saved organization:', savedOrg.name);
          setCurrentOrganization(savedOrg);
        } else if (orgs.length > 0) {
          // If saved org not found, use first organization
          console.log('[OrganizationContext] Saved org not found, using first org:', orgs[0].name);
          setCurrentOrganization(orgs[0]);
          localStorage.setItem('currentOrganizationId', orgs[0].id);
        } else {
          // No organizations available
          console.log('[OrganizationContext] No organizations available');
          setCurrentOrganization(null);
          localStorage.removeItem('currentOrganizationId');
        }
      } else if (orgs.length > 0) {
        // No saved org, use first one
        console.log('[OrganizationContext] No saved org, auto-selecting first org:', orgs[0].name);
        setCurrentOrganization(orgs[0]);
        localStorage.setItem('currentOrganizationId', orgs[0].id);
        console.log('[OrganizationContext] Stored org ID in localStorage:', orgs[0].id);
      } else {
        // No organizations available (fresh database)
        console.log('[OrganizationContext] No organizations in database');
        setCurrentOrganization(null);
        localStorage.removeItem('currentOrganizationId');
      }
    } catch (error) {
      console.error('[OrganizationContext] Failed to load organizations:', error);
    } finally {
      setLoading(false);
      console.log('[OrganizationContext] Loading complete');
    }
  };

  useEffect(() => {
    // Only load organizations if user is authenticated
    const token = localStorage.getItem('authToken');

    if (token) {
      // Load organizations for authenticated users (admin or regular)
      // Admin users might not have an organization_id initially
      loadOrganizations();
    } else {
      setLoading(false);
    }

    // Listen for organization changes (e.g., after login)
    const handleOrganizationChange = () => {
      loadOrganizations();
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
