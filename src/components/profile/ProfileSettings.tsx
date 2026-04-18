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
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Volume2, VolumeX, Play, RefreshCw, Trash2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationSoundSettings } from '@/hooks/useNotificationSoundSettings';
import { NOTIFICATION_SOUND_TYPES, playTestSound } from '@/lib/notificationSounds';
import { APP_VERSION } from '@/lib/releaseNotes';

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ open, onOpenChange }) => {
  const { profile, refreshProfile } = useAuth();
  const updateProfile = useUpdateProfile();
  const { settings: soundSettings, toggleEnabled, setVolume, toggleMuteType } = useNotificationSoundSettings();
  
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
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Profile Settings</SheetTitle>
          <SheetDescription>Update your personal information</SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSave} className="mt-6 space-y-6">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20 shadow-md">
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
              className="bg-muted rounded-xl"
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
              className="rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Job Title (optional)</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Developer, Designer, Manager"
              className="rounded-xl"
            />
          </div>

          <Separator />

          {/* Notification Sounds */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Notification Sounds</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundSettings.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                <Label>Enable sounds</Label>
              </div>
              <Switch checked={soundSettings.enabled} onCheckedChange={toggleEnabled} />
            </div>

            {soundSettings.enabled && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Volume: {soundSettings.volume}%</Label>
                  <Slider
                    value={[soundSettings.volume]}
                    onValueChange={([v]) => setVolume(v)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  {NOTIFICATION_SOUND_TYPES.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1.5">
                      <span className="text-sm">{label}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs rounded-lg"
                          onClick={() => playTestSound(key)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                        <Switch
                          checked={!soundSettings.mutedTypes.includes(key)}
                          onCheckedChange={() => toggleMuteType(key)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* App & Cache */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" /> App & Cache
            </h3>
            <p className="text-xs text-muted-foreground">
              Force the app to fetch the latest version or clear local cache if you see stale data.
            </p>
            <div className="grid gap-2">
              <Button type="button" variant="outline" className="rounded-xl justify-start" onClick={async () => {
                try {
                  const reg = await navigator.serviceWorker?.getRegistration();
                  if (reg) { await reg.update(); toast.success('Checked for updates'); }
                  else toast.info('No service worker registered');
                } catch { toast.error('Update check failed'); }
              }}>
                <RefreshCw className="h-4 w-4 mr-2" /> Check for updates
              </Button>
              <Button type="button" variant="outline" className="rounded-xl justify-start" onClick={async () => {
                try {
                  if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                  }
                  const regs = await navigator.serviceWorker?.getRegistrations() || [];
                  await Promise.all(regs.map(r => r.unregister()));
                  toast.success('Cache cleared, reloading...');
                  setTimeout(() => window.location.reload(), 600);
                } catch { toast.error('Failed to clear cache'); }
              }}>
                <Trash2 className="h-4 w-4 mr-2" /> Clear cache & reload
              </Button>
              <Button type="button" variant="outline" className="rounded-xl justify-start" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Hard reload
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center pt-1">App version: {APP_VERSION}</p>
          </div>

          <Separator />
          
          <Button type="submit" className="w-full rounded-xl" disabled={isSaving}>
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
