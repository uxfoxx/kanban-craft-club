import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmailSearchInput } from '@/components/shared/EmailSearchInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Shield, KeyRound, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface SelectedUser {
  user_id: string;
  full_name: string;
  email: string;
}

export const AdminPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [emailSearch, setEmailSearch] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const { data: allProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleResetPassword = async () => {
    if (!selectedUser) {
      toast.error('Please select a user first');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: selectedUser.user_id, new_password: newPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Password reset for ${selectedUser.full_name}`);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUser(null);
      setEmailSearch('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Super Admin Panel</h2>
          <p className="text-sm text-muted-foreground">System-level management tools</p>
        </div>
      </div>

      {/* Reset Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Reset User Password
          </CardTitle>
          <CardDescription>Search for a user and set a new password for their account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Find User</Label>
            <EmailSearchInput
              value={emailSearch}
              onChange={setEmailSearch}
              onSelect={(profile) => setSelectedUser(profile)}
              placeholder="Search by email..."
              className="max-w-md"
            />
          </div>

          {selectedUser && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 max-w-md">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(selectedUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{selectedUser.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>
            <Button
              onClick={handleResetPassword}
              disabled={isResetting || !selectedUser || !newPassword}
              className="w-fit"
            >
              {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            All Users
          </CardTitle>
          <CardDescription>Overview of all registered users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {profilesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allProfiles.map((profile) => (
                    <TableRow key={profile.user_id}>
                      <TableCell className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-primary/10">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{profile.full_name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{profile.email}</TableCell>
                      <TableCell className="text-sm">{profile.role || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(profile.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
