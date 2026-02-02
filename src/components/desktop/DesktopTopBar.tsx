import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings, Wifi, Battery } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesktopTopBarProps {
  userName: string;
  avatarUrl?: string;
  onLogout: () => void;
}

export function DesktopTopBar({ userName, avatarUrl, onLogout }: DesktopTopBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        'desktop-topbar fixed top-0 left-0 right-0 z-50 h-10',
        'flex items-center justify-between px-4',
        'bg-card/70 backdrop-blur-xl border-b border-border/30'
      )}
    >
      {/* Left: Logo/Brand */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gradient-gold">MentorHub</span>
      </div>

      {/* Right: System Tray */}
      <div className="flex items-center gap-4">
        {/* Status Icons */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wifi className="h-4 w-4" />
          <Battery className="h-4 w-4" />
        </div>

        {/* Date & Time */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">
            {format(time, "EEE, d 'de' MMM", { locale: ptBR })}
          </span>
          <span className="ml-2 font-mono">
            {format(time, 'HH:mm')}
          </span>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-2 px-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {userName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground max-w-24 truncate">
                {userName?.split(' ')[0] || 'Usuário'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Preferências
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
