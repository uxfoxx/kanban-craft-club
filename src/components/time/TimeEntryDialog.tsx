import React, { useState, useEffect } from 'react';
import { TimeEntry } from '@/types/database';
import { useCreateManualTimeEntry, useUpdateTimeEntry, formatDuration } from '@/hooks/useTimeTracking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format, parseISO, differenceInSeconds } from 'date-fns';

interface TimeEntryDialogProps {
  taskId: string;
  entry?: TimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TimeEntryDialog: React.FC<TimeEntryDialogProps> = ({
  taskId,
  entry,
  open,
  onOpenChange,
}) => {
  const createEntry = useCreateManualTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  const isEditMode = !!entry;

  useEffect(() => {
    if (open) {
      if (entry) {
        // Edit mode - populate with entry data
        const started = new Date(entry.started_at);
        setStartDate(format(started, 'yyyy-MM-dd'));
        setStartTime(format(started, 'HH:mm'));
        
        if (entry.ended_at) {
          const ended = new Date(entry.ended_at);
          setEndDate(format(ended, 'yyyy-MM-dd'));
          setEndTime(format(ended, 'HH:mm'));
        } else {
          const now = new Date();
          setEndDate(format(now, 'yyyy-MM-dd'));
          setEndTime(format(now, 'HH:mm'));
        }
        
        setDescription(entry.description || '');
      } else {
        // Create mode - default to today
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        setStartDate(todayStr);
        setStartTime('09:00');
        setEndDate(todayStr);
        setEndTime(format(now, 'HH:mm'));
        setDescription('');
      }
    }
  }, [open, entry]);

  const getStartDateTime = () => {
    if (!startDate || !startTime) return null;
    return new Date(`${startDate}T${startTime}`);
  };

  const getEndDateTime = () => {
    if (!endDate || !endTime) return null;
    return new Date(`${endDate}T${endTime}`);
  };

  const calculatedDuration = () => {
    const start = getStartDateTime();
    const end = getEndDateTime();
    if (!start || !end) return null;
    
    const seconds = differenceInSeconds(end, start);
    if (seconds <= 0) return null;
    
    return formatDuration(seconds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const startedAt = getStartDateTime();
    const endedAt = getEndDateTime();
    
    if (!startedAt || !endedAt) {
      toast.error('Please fill in all date and time fields');
      return;
    }
    
    if (endedAt <= startedAt) {
      toast.error('End time must be after start time');
      return;
    }
    
    if (endedAt > new Date()) {
      toast.error('End time cannot be in the future');
      return;
    }
    
    try {
      if (isEditMode && entry) {
        await updateEntry.mutateAsync({
          entryId: entry.id,
          taskId,
          startedAt,
          endedAt,
          description: description.trim() || undefined,
        });
        toast.success('Time entry updated');
      } else {
        await createEntry.mutateAsync({
          taskId,
          startedAt,
          endedAt,
          description: description.trim() || undefined,
        });
        toast.success('Time entry added');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update time entry' : 'Failed to add time entry');
    }
  };

  const duration = calculatedDuration();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modify the time entry details below.' : 'Manually log time for this task.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          
          {duration && (
            <div className="bg-muted p-3 rounded-md text-center">
              <span className="text-sm text-muted-foreground">Duration: </span>
              <span className="font-semibold">{duration}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!duration || createEntry.isPending || updateEntry.isPending}>
              {isEditMode ? 'Update' : 'Add'} Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
