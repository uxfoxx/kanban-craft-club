import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organization } from '@/types/database';
import { useOrganizations } from '@/hooks/useOrganizations';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization | null) => void;
  organizations: Organization[];
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: organizations = [], isLoading } = useOrganizations();
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);

  useEffect(() => {
    const storedOrgId = localStorage.getItem('currentOrganizationId');

    if (storedOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === storedOrgId);
      if (org) {
        setCurrentOrganizationState(org);
      } else if (organizations.length > 0) {
        setCurrentOrganizationState(organizations[0]);
        localStorage.setItem('currentOrganizationId', organizations[0].id);
      }
    } else if (organizations.length > 0 && !currentOrganization) {
      setCurrentOrganizationState(organizations[0]);
      localStorage.setItem('currentOrganizationId', organizations[0].id);
    }
  }, [organizations, currentOrganization]);

  const setCurrentOrganization = (org: Organization | null) => {
    setCurrentOrganizationState(org);
    if (org) {
      localStorage.setItem('currentOrganizationId', org.id);
    } else {
      localStorage.removeItem('currentOrganizationId');
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        setCurrentOrganization,
        organizations,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
