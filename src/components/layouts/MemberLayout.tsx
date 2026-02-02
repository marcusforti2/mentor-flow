import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DevModeSelector } from '@/components/DevModeSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Desktop } from '@/components/desktop/Desktop';
import { useIsMobile } from '@/hooks/use-mobile';

export function MemberLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Check if we're on the main dashboard (exact /app path)
  const isDashboard = location.pathname === '/app';
  
  // Get current page title from menu items
  const menuItems = [
    { label: 'Dashboard', path: '/app' },
    { label: 'Trilhas', path: '/app/trilhas' },
    { label: 'Meu CRM', path: '/app/meu-crm' },
    { label: 'Calendário', path: '/app/calendario' },
    { label: 'Treinamento', path: '/app/treinamento' },
    { label: 'Ranking', path: '/app/ranking' },
    { label: 'Centro SOS', path: '/app/sos' },
    { label: 'Meu Perfil', path: '/app/perfil' },
  ];
  
  const currentPage = menuItems.find(item => item.path === location.pathname);
  const pageTitle = currentPage?.label || 'Página';

  // Desktop experience on main dashboard (desktop only)
  if (isDashboard && !isMobile) {
    return <Desktop />;
  }

  return (
    <div className="min-h-screen">
      {/* Animated gradient background */}
      <div className="animated-gradient-bg" />

      {/* Back Header - visible on sub-pages or mobile */}
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

        {/* User info */}
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

      {/* Main content */}
      <main className="min-h-screen pt-16 pb-6 px-4 md:px-6">
        <Outlet />
      </main>

      {/* Dev Mode Selector */}
      <DevModeSelector />
    </div>
  );
}
