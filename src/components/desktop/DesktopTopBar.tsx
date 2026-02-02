import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Wifi, Battery, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DesktopTopBar() {
  const { profile, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-7">
      {/* Frosted glass bar */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-2xl border-b border-white/[0.08]" />
      
      <div className="relative h-full flex items-center justify-between px-4">
        {/* Left side - Logo/Brand */}
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-semibold">
            <span className="bg-gradient-to-r from-primary to-[hsl(43_80%_60%)] bg-clip-text text-transparent">LBV</span>
            <span className="text-white/70 ml-1">TECH</span>
          </span>
        </div>

        {/* Right side - Status icons + Time + User */}
        <div className="flex items-center gap-4">
          {/* Status icons */}
          <div className="flex items-center gap-2 text-white/60">
            <Volume2 className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <div className="flex items-center gap-0.5">
              <Battery className="h-3 w-3" />
              <span className="text-[9px]">100%</span>
            </div>
          </div>

          {/* Date and Time */}
          <div className="flex items-center gap-2 text-[11px] text-white/80">
            <span>{formatDate(currentTime)}</span>
            <span className="font-medium">{formatTime(currentTime)}</span>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 hover:bg-white/10 rounded-md px-1.5 py-0.5 transition-colors">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-white/20 text-[8px] text-white">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-white/80 hidden sm:inline">
                  {profile?.full_name?.split(' ')[0] || 'Usuário'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-52 bg-gray-900/95 backdrop-blur-2xl border-white/10"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">{profile?.full_name}</p>
                <p className="text-xs text-white/50">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="text-white/80 focus:bg-white/10 focus:text-white">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/80 focus:bg-white/10 focus:text-white">
                <Settings className="mr-2 h-4 w-4" />
                Preferências
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={signOut}
                className="text-red-400 focus:bg-red-500/20 focus:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
