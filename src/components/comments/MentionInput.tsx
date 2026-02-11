import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MentionUser {
  user_id: string;
  full_name: string;
  email: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentions: string[]) => void;
  members: MentionUser[];
  placeholder?: string;
  className?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onMentionsChange,
  members,
  placeholder = 'Write a comment... Use @ to mention',
  className,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') || textAfterAt.length <= 20) {
        setMentionStartIndex(lastAtIndex);
        setSearchTerm(textAfterAt);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowSuggestions(false);
  }, [onChange]);

  const selectMention = useCallback((member: MentionUser) => {
    const before = value.slice(0, mentionStartIndex);
    const after = value.slice(mentionStartIndex + searchTerm.length + 1);
    const newValue = `${before}@${member.full_name} ${after}`;
    onChange(newValue);

    const newMentions = [...mentionedIds, member.user_id];
    setMentionedIds(newMentions);
    onMentionsChange(newMentions);
    setShowSuggestions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        const pos = mentionStartIndex + member.full_name.length + 2;
        textareaRef.current.selectionStart = pos;
        textareaRef.current.selectionEnd = pos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, mentionStartIndex, searchTerm, mentionedIds, onChange, onMentionsChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredMembers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filteredMembers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length);
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault();
      selectMention(filteredMembers[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Reset mentions when value is cleared
  useEffect(() => {
    if (!value) {
      setMentionedIds([]);
      onMentionsChange([]);
    }
  }, [value, onMentionsChange]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('min-h-[60px] resize-none', className)}
        rows={2}
      />
      {showSuggestions && filteredMembers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full mb-1 left-0 w-full max-h-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-md z-50"
        >
          {filteredMembers.map((member, index) => (
            <button
              key={member.user_id}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-sm flex flex-col',
                index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              )}
              onClick={() => selectMention(member)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="font-medium">{member.full_name}</span>
              <span className="text-xs text-muted-foreground">{member.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
