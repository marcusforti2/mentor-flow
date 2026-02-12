 import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
 import { FloatingDock } from '@/components/FloatingDock';
 import { useAuth } from '@/hooks/useAuth';
 import { SOSNotificationAlert } from '@/components/admin/SOSNotificationAlert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  Mail,
  BarChart3,
  Compass,
  ClipboardList,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Compass, label: 'Jornada CS', path: '/admin/jornada-cs' },
  { icon: Users, label: 'Mentorados', path: '/admin/mentorados' },
  { icon: BookOpen, label: 'Trilhas', path: '/admin/trilhas' },
  { icon: Calendar, label: 'Calendário', path: '/admin/calendario' },
  { icon: AlertTriangle, label: 'Centro SOS', path: '/admin/sos' },
  { icon: Mail, label: 'Emails', path: '/admin/emails' },
  { icon: BarChart3, label: 'Relatórios', path: '/admin/relatorios' },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're on the main dashboard (exact /admin path)
  const isDashboard = location.pathname === '/admin';
  
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
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <BrandLogo variant="full" size="sm" />
            </Link>
            <div className="h-6 w-px bg-border/50" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="h-9 w-9 rounded-full hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-display font-semibold text-lg text-foreground">
              {pageTitle}
            </h1>
          </div>

          {/* User info on sub-pages */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {profile?.full_name?.charAt(0) || 'M'}
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
          <Link to="/admin" className="ml-28">
            <BrandLogo variant="full" size="sm" />
          </Link>

          {/* User controls on the right */}
          <div className="flex items-center gap-3">
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
          </div>
        </header>
      )}

      {/* Main content - full width on sub-pages, with margin on dashboard */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        isDashboard 
          ? "ml-28 pt-20 px-6 pb-6" 
          : "pt-20 px-4 md:px-6 pb-6"
      )}>
        <Outlet />
      </main>

      {/* SOS Notification Alert - Realtime */}
      <SOSNotificationAlert />
    </div>
  );
}
