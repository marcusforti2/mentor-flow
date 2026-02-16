import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Pastas & Docs': ['📁', '📂', '📄', '📑', '📋', '📝', '📒', '📓', '📔', '📕', '📗', '📘', '📙', '🗂️', '🗃️', '🗄️'],
  'Negócios': ['💼', '📊', '📈', '📉', '💰', '💳', '🏦', '🏢', '🤝', '📣', '📢', '🎯', '🏆', '⚡', '🔑', '🛠️'],
  'Comunicação': ['💬', '📩', '📧', '📞', '📱', '🔔', '📡', '🌐', '🔗', '💡', '🎙️', '📹', '🖥️', '⌨️', '🖱️', '📸'],
  'Pessoas': ['👤', '👥', '🧑‍💼', '🧑‍🏫', '🤵', '🦸', '🧠', '💪', '🙌', '👏', '🫂', '🎓', '👨‍💻', '👩‍💻', '🧑‍🤝‍🧑', '🫱🏻‍🫲🏼'],
  'Status': ['✅', '❌', '⚠️', '🔴', '🟢', '🟡', '🔵', '⭐', '🌟', '❤️', '🔥', '💎', '🎉', '🚀', '✨', '🏁'],
  'Natureza': ['🌱', '🌿', '🍀', '🌳', '🌸', '🌻', '🌈', '☀️', '🌙', '⛰️', '🌊', '🦋', '🐝', '🕊️', '🌍', '🔮'],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const filtered = search
    ? allEmojis.filter(e => e.includes(search))
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-12 text-2xl p-0 shrink-0"
        >
          {value || '📁'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <Input
          placeholder="Buscar emoji..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2 h-8 text-xs"
        />
        <ScrollArea className="h-48">
          {filtered ? (
            <div className="grid grid-cols-8 gap-1">
              {filtered.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
                  onClick={() => { onChange(emoji); setOpen(false); setSearch(''); }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
              <div key={cat} className="mb-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{cat}</p>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
                      onClick={() => { onChange(emoji); setOpen(false); setSearch(''); }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
