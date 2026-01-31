import { Outlet } from 'react-router-dom';
import { FloatingDock } from '@/components/FloatingDock';
import { useAuth } from '@/hooks/useAuth';
import { DevModeSelector } from '@/components/DevModeSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Target,
  BookOpen,
  Calendar,
  AlertTriangle,
  Trophy,
  Mail,
  BarChart3,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Target, label: 'CRM', path: '/admin/crm' },
  { icon: Users, label: 'Mentorados', path: '/admin/mentorados' },
  { icon: BookOpen, label: 'Trilhas', path: '/admin/trilhas' },
  { icon: Calendar, label: 'Calendário', path: '/admin/calendario' },
  { icon: AlertTriangle, label: 'Centro SOS', path: '/admin/sos' },
  { icon: Trophy, label: 'Rankings', path: '/admin/ranking' },
  { icon: Mail, label: 'Emails', path: '/admin/emails' },
  { icon: BarChart3, label: 'Relatórios', path: '/admin/relatorios' },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Animated gradient background */}
      <div className="animated-gradient-bg" />
      
      {/* Floating Dock */}
      <FloatingDock items={menuItems} position="left" />

      {/* Top bar with user */}
      <header className="fixed top-0 right-0 z-40 p-4 flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="glass-card h-10 w-10"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Configurações</TooltipContent>
        </Tooltip>

        <div className="glass-card flex items-center gap-3 px-3 py-2 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {profile?.full_name?.charAt(0) || 'M'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground hidden sm:block">
            {profile?.full_name || 'Mentor'}
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

      {/* Dev Mode Selector */}
      <DevModeSelector />
    </div>
  );
}
