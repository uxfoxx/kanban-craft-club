import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project, Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

export const useProjects = (organizationId?: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projects', user?.id, organizationId],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });
};

export const useProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
};

export const useProjectMembers = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Fetch project members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId);
      
      if (membersError) throw membersError;
      if (!membersData || membersData.length === 0) return [];
      
      // Fetch profiles for all member user_ids
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combine members with their profiles
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      return membersData.map(member => ({
        ...member,
        profiles: profileMap.get(member.user_id) as Profile | undefined,
      }));
    },
    enabled: !!projectId,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description, organizationId }: { name: string; description?: string; organizationId?: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          description,
          owner_id: user!.id,
          organization_id: organizationId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useAddProjectMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ projectId, email, role }: { projectId: string; email: string; role: 'admin' | 'member' }) => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();
      
      if (profileError) throw new Error('User not found');
      
      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: profile.user_id,
          role,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Create notification for the added member
      await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          project_id: projectId,
          type: 'project_invite',
          title: 'You were added to a project',
          message: `You have been added as a ${role} to a project.`,
          metadata: { added_by: user?.id },
        });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, memberId, role }: { projectId: string; memberId: string; role: 'admin' | 'member' }) => {
      const { data, error } = await supabase
        .from('project_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
    },
  });
};

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, memberId }: { projectId: string; memberId: string }) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, name, description }: { projectId: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ name, description })
        .eq('id', projectId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useProjectOwner = (ownerId: string | undefined) => {
  return useQuery({
    queryKey: ['profile', ownerId],
    queryFn: async () => {
      if (!ownerId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', ownerId)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!ownerId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ fullName, role, avatarUrl }: { fullName?: string; role?: string; avatarUrl?: string }) => {
      const updates: Record<string, string> = {};
      if (fullName) updates.full_name = fullName;
      if (role !== undefined) updates.role = role;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user!.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};
