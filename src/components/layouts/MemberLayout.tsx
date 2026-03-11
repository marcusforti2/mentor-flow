 import { Suspense } from 'react';
import { LazyErrorBoundary } from '@/components/LazyErrorBoundary';
import { RouteTransition } from '@/components/RouteTransition';
 import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
 import { FloatingDock } from '@/components/FloatingDock';
 import { useAuth } from '@/hooks/useAuth';
 import { TenantPopupRenderer } from '@/components/popups/TenantPopupRenderer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useTenant } from '@/contexts/TenantContext';
import { PageSpinner } from '@/components/PageSpinner';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Calendar,
  AlertTriangle,
  User,
  Sparkles,
  FolderOpen,
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
  { icon: Sparkles, label: 'Arsenal de Vendas', path: '/app/ferramentas' },
  { icon: FolderOpen, label: 'Meus Arquivos', path: '/app/meus-arquivos' },
  { icon: Calendar, label: 'Calendário', path: '/app/calendario' },
  { icon: AlertTriangle, label: 'Centro SOS', path: '/app/sos' },
  { icon: User, label: 'Meu Perfil', path: '/app/perfil' },
];

export function MemberLayout() {
  const { profile, signOut } = useAuth();
  const { tenant } = useTenant();
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
      {isDashboard && <FloatingDock items={menuItems} position="left" />}

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
            <NotificationBell />
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

      {/* Top bar with logo and user - only on dashboard */}
      {isDashboard && (
        <header className="fixed top-0 left-0 right-0 z-40 p-4 flex items-center justify-between">
          {/* Logo on the left */}
          <Link to="/app" className="ml-28">
            <BrandLogo variant="full" size="sm" logoUrl={tenant?.logo_url || undefined} brandName={tenant?.name} />
          </Link>

          {/* User controls on the right */}
          <div className="flex items-center gap-3">
            <NotificationBell />
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
        <LazyErrorBoundary>
          <Suspense fallback={<PageSpinner />}>
            <RouteTransition>
              <Outlet />
            </RouteTransition>
          </Suspense>
        </LazyErrorBoundary>
      </main>

      {/* WhatsApp Group Modal - First Login */}
      <TenantPopupRenderer />
    </div>
  );
}
