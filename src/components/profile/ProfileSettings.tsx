import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProjects';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ open, onOpenChange }) => {
  const { profile, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();
  
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setRole(profile.role || '');
    }
  }, [profile]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Name is required');
      return;
    }
    
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({ fullName: fullName.trim(), role: role.trim() || undefined });
      await refreshProfile();
      toast.success('Profile updated');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Profile Settings</SheetTitle>
          <SheetDescription>Update your personal information</SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSave} className="mt-6 space-y-6">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Job Title (optional)</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Developer, Designer, Manager"
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
