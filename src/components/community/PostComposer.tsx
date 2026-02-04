import { useState } from 'react';
import { Send, Hash, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

interface PostComposerProps {
  onSubmit: (content: string, tags: string[]) => void;
  isLoading?: boolean;
}

export function PostComposer({ onSubmit, isLoading }: PostComposerProps) {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim(), tags);
    setContent('');
    setTags([]);
    setTagInput('');
    setShowTagInput(false);
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="glass-card p-4 rounded-xl space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="Compartilhe algo com a comunidade..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none bg-background/50 border-border/50"
          />

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs gap-1 pr-1"
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Tag Input */}
          {showTagInput && (
            <div className="flex gap-2">
              <Input
                placeholder="Digite uma tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addTag}>
                Adicionar
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTagInput(!showTagInput)}
              className="gap-2 text-muted-foreground"
            >
              <Hash className="h-4 w-4" />
              Tags
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
              size="sm"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Publicar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
