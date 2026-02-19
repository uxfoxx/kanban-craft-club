import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
}

interface EmailSearchInputProps {
  value: string;
  onChange: (email: string) => void;
  onSelect?: (profile: Profile) => void;
  placeholder?: string;
  className?: string;
}

export const EmailSearchInput: React.FC<EmailSearchInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Search by email...',
  className,
}) => {
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .ilike('email', `%${value}%`)
        .limit(5);

      if (!error && data) {
        setResults(data);
        setShowDropdown(data.length > 0);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {results.map((profile) => (
            <button
              key={profile.user_id}
              type="button"
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-accent text-left text-sm"
              onClick={() => {
                onChange(profile.email);
                onSelect?.(profile);
                setShowDropdown(false);
              }}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
