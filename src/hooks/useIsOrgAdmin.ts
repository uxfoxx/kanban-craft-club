import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useIsOrgAdmin = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['is-org-admin', user?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id) return false;
      
      // Check if owner
      if (currentOrganization.owner_id === user.id) return true;
      
      // Check if admin member
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) return false;
      return data?.role === 'admin';
    },
    enabled: !!user?.id && !!currentOrganization?.id,
  });
};
