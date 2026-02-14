import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCommunityChat } from '@/hooks/useCommunityChat';
import { useAuth } from '@/hooks/useAuth';

export function ChatPanel() {
  const { profile } = useAuth();
  const { messages, isLoading, sendMessage, onlineUsers } = useCommunityChat();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage.trim());
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="glass-card rounded-xl flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Chat da Comunidade</h3>
        </div>
        <Badge variant="secondary" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          {onlineUsers.length} online
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Nenhuma mensagem ainda. Seja o primeiro a dizer oi! 👋
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const showAvatar =
                index === 0 ||
                messages[index - 1].author_membership_id !== message.author_membership_id;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    message.isOwn && 'flex-row-reverse'
                  )}
                >
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={message.author?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {message.author?.full_name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}

                  <div
                    className={cn(
                      'max-w-[70%] space-y-1',
                      message.isOwn && 'items-end'
                    )}
                  >
                    {showAvatar && (
                      <p
                        className={cn(
                          'text-xs text-muted-foreground',
                          message.isOwn && 'text-right'
                        )}
                      >
                        {message.isOwn
                          ? 'Você'
                          : message.author?.full_name || 'Anônimo'}
                      </p>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2',
                        message.isOwn
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted rounded-tl-sm'
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p
                      className={cn(
                        'text-[10px] text-muted-foreground',
                        message.isOwn && 'text-right'
                      )}
                    >
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border/50 flex gap-2"
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <Input
          ref={inputRef}
          placeholder="Digite sua mensagem..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-background/50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newMessage.trim() || sendMessage.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div className="px-4 pb-3 border-t border-border/50 pt-3">
          <p className="text-xs text-muted-foreground mb-2">Online agora:</p>
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 8).map((user, idx) => (
              <Avatar
                key={user.mentorado_id || idx}
                className="h-6 w-6 border-2 border-background"
                title={user.full_name}
              >
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                  {user.full_name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
            ))}
            {onlineUsers.length > 8 && (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-background">
                +{onlineUsers.length - 8}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
