import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSuperAdmin = () => {
  const { user } = useAuth();

  const { data: isSuperAdmin = false, isLoading } = useQuery({
    queryKey: ['super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from('super_admins' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  return { isSuperAdmin, isLoading };
};
