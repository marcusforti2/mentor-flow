import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FloatingDock } from '@/components/FloatingDock';
import { useAuth } from '@/hooks/useAuth';
import { DevModeSelector } from '@/components/DevModeSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're on the main dashboard (exact /app path)
  const isDashboard = location.pathname === '/app';
  
  // Get current page title from menu items
  const currentPage = menuItems.find(item => item.path === location.pathname);
  const pageTitle = currentPage?.label || 'Página';

  return (
    <div className="min-h-screen">
      {/* Animated gradient background */}
      <div className="animated-gradient-bg" />
      
      {/* Floating Dock - only visible on dashboard */}
      <div className={cn(
        "transition-all duration-300",
        isDashboard ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full pointer-events-none"
      )}>
        <FloatingDock items={menuItems} position="left" />
      </div>

      {/* Back Header - visible on sub-pages */}
      {!isDashboard && (
        <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="h-10 w-10 rounded-full hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display font-semibold text-lg text-foreground">
              {pageTitle}
            </h1>
          </div>

          {/* User info on sub-pages */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-accent/20 text-accent text-sm">
                {profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
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
      )}

      {/* Top bar with user - only on dashboard */}
      {isDashboard && (
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
      )}

      {/* Main content - full width on sub-pages, with margin on dashboard */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        isDashboard 
          ? "ml-28 pt-20 px-6 pb-6" 
          : "pt-16 pb-6"
      )}>
        <Outlet />
      </main>

      {/* Dev Mode Selector */}
      <DevModeSelector />
    </div>
  );
}
