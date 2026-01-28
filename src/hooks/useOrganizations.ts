import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Organization, OrganizationMember, Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

export type OrganizationMemberWithProfile = OrganizationMember & { profiles?: Profile };

export const useOrganizations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Organization[];
    },
    enabled: !!user,
  });
};

export const useOrganization = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data as Organization | null;
    },
    enabled: !!organizationId,
  });
};

export const useOrganizationMembers = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return members.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.user_id === member.user_id)
      })) as OrganizationMemberWithProfile[];
    },
    enabled: !!organizationId,
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          description: description || null,
          owner_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      updates
    }: {
      organizationId: string;
      updates: Partial<Pick<Organization, 'name' | 'description'>>;
    }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', data.id] });
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
};

export const useAddOrganizationMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      role
    }: {
      organizationId: string;
      userId: string;
      role: 'admin' | 'member';
    }) => {
      const { data, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', variables.organizationId] });
    },
  });
};

export const useUpdateOrganizationMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      organizationId,
      role
    }: {
      memberId: string;
      organizationId: string;
      role: 'admin' | 'member';
    }) => {
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', variables.organizationId] });
    },
  });
};

export const useRemoveOrganizationMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      organizationId
    }: {
      memberId: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', variables.organizationId] });
    },
  });
};
