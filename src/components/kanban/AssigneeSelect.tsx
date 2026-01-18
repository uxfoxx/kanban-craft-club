import React from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Profile } from '@/types/database';
import { cn } from '@/lib/utils';

interface AssigneeSelectProps {
  members: Profile[];
  selectedIds: string[];
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
  disabled?: boolean;
}

export const AssigneeSelect: React.FC<AssigneeSelectProps> = ({
  members,
  selectedIds,
  onAdd,
  onRemove,
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  
  const selectedMembers = members.filter(m => selectedIds.includes(m.user_id));
  const availableMembers = members.filter(m => !selectedIds.includes(m.user_id));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedMembers.map((member) => (
          <Badge key={member.user_id} variant="secondary" className="pr-1 gap-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">{member.full_name}</span>
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                onClick={() => onRemove(member.user_id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
      </div>
      
      {!disabled && availableMembers.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 border-dashed">
              <Plus className="h-3 w-3 mr-1" />
              Add assignee
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-popover" align="start">
            <Command>
              <CommandInput placeholder="Search members..." />
              <CommandList>
                <CommandEmpty>No members found.</CommandEmpty>
                <CommandGroup>
                  {availableMembers.map((member) => (
                    <CommandItem
                      key={member.user_id}
                      value={member.full_name}
                      onSelect={() => {
                        onAdd(member.user_id);
                        setOpen(false);
                      }}
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{member.full_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      
      {selectedMembers.length === 0 && disabled && (
        <span className="text-sm text-muted-foreground">No assignees</span>
      )}
    </div>
  );
};
