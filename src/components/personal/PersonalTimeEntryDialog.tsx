import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePersonalTimeEntry } from '@/hooks/usePersonalTimeEntries';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PersonalTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PersonalTimeEntryDialog: React.FC<PersonalTimeEntryDialogProps> = ({ open, onOpenChange }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [name, setName] = useState('');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const createEntry = useCreatePersonalTimeEntry();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const started_at = new Date(`${date}T${startTime}:00`).toISOString();
    const ended_at = new Date(`${date}T${endTime}:00`).toISOString();
    const duration_seconds = Math.floor((new Date(ended_at).getTime() - new Date(started_at).getTime()) / 1000);

    if (duration_seconds <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      await createEntry.mutateAsync({ name: name.trim(), started_at, ended_at, duration_seconds });
      toast.success('Personal time entry added');
      onOpenChange(false);
      setName('');
      setDate(today);
      setStartTime('09:00');
      setEndTime('10:00');
    } catch {
      toast.error('Failed to add entry');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Personal Time</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Activity Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Meeting, Research..." required />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createEntry.isPending}>
            {createEntry.isPending ? 'Adding...' : 'Add Entry'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
