import { Outlet } from 'react-router-dom';
import { FloatingDock } from '@/components/FloatingDock';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Calendar,
  Headphones,
  Trophy,
  AlertTriangle,
  User,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/app' },
  { icon: BookOpen, label: 'Trilhas', path: '/app/trilhas' },
  { icon: Target, label: 'Meu CRM', path: '/app/meu-crm' },
  { icon: Calendar, label: 'Calendário', path: '/app/calendario' },
  { icon: Headphones, label: 'Treinamento', path: '/app/treinamento' },
  { icon: Trophy, label: 'Ranking', path: '/app/ranking' },
  { icon: AlertTriangle, label: 'Centro SOS', path: '/app/sos' },
  { icon: User, label: 'Meu Perfil', path: '/app/perfil' },
];

export function MemberLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Animated gradient background */}
      <div className="animated-gradient-bg" />
      
      {/* Floating Dock */}
      <FloatingDock items={menuItems} position="left" />

      {/* Top bar with user */}
      <header className="fixed top-0 right-0 z-40 p-4 flex items-center gap-3">
        <div className="glass-card flex items-center gap-3 px-3 py-2 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-accent/20 text-accent text-sm">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground hidden sm:block">
            {profile?.full_name || 'Mentorado'}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sair</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main content */}
      <main className="ml-20 pt-20 pr-6 pb-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
