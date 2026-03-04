import { useState, Suspense } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { FloatingDock, type DockItem } from '@/components/FloatingDock';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { SOSNotificationAlert } from '@/components/admin/SOSNotificationAlert';
import { AlertsBell } from '@/components/admin/AlertsBell';
import { AlertsPanel } from '@/components/admin/AlertsPanel';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, ArrowLeft, UserCircle, BookMarked, Zap, MessageSquare, MessageCircle, ClipboardList } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { PageSpinner } from '@/components/PageSpinner';
 import {
   LayoutDashboard,
   Users,
   BookOpen,
   Calendar,
   AlertTriangle,
   Mail,
   BarChart3,
   Compass,
   Target,
 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const menuItems: DockItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/mentor' },
  {
    icon: Users, label: 'Mentorados',
    children: [
      { icon: Users, label: 'Mentorados', path: '/mentor/mentorados' },
      { icon: Compass, label: 'Jornada CS', path: '/mentor/jornada-cs' },
      { icon: Target, label: 'CRM', path: '/mentor/crm' },
      { icon: ClipboardList, label: 'Formulários', path: '/mentor/formularios' },
    ],
  },
  {
    icon: BookOpen, label: 'Conteúdo',
    children: [
      { icon: BookOpen, label: 'Trilhas', path: '/mentor/trilhas' },
      { icon: BookMarked, label: 'Playbooks', path: '/mentor/playbooks' },
    ],
  },
  { icon: Calendar, label: 'Calendário', path: '/mentor/calendario' },
  {
    icon: Mail, label: 'Comunicação',
    children: [
      { icon: Mail, label: 'Emails', path: '/mentor/emails' },
      { icon: MessageCircle, label: 'WhatsApp', path: '/mentor/whatsapp' },
      { icon: MessageSquare, label: 'Popups', path: '/mentor/popups' },
      { icon: AlertTriangle, label: 'Centro SOS', path: '/mentor/sos' },
      { icon: Zap, label: 'Automações', path: '/mentor/automacoes' },
    ],
  },
  { icon: BarChart3, label: 'Relatórios', path: '/mentor/relatorios' },
  { icon: UserCircle, label: 'Meu Perfil', path: '/mentor/perfil' },
];
 
  export function MentorLayout() {
    const { profile, signOut } = useAuth();
    const { tenant, activeMembership, realMembership, isImpersonating, endImpersonation, isLoading: tenantContextLoading } = useTenant();
    const [alertsOpen, setAlertsOpen] = useState(false);
    const smartAlerts = useSmartAlerts();
    const location = useLocation();
    const navigate = useNavigate();
  
  const isDashboard = location.pathname === '/mentor';
  const allPages = menuItems.flatMap(item => item.children ? item.children : [item]);
  const currentPage = allPages.find(item => item.path === location.pathname);
  const pageTitle = currentPage?.label || 'Página';

    const isMasterViewing = realMembership?.role === 'master_admin';
    const showReturnBanner = isImpersonating || isMasterViewing;

    const handleReturnToMaster = () => {
      if (isImpersonating) {
        endImpersonation();
      } else {
        navigate('/master');
      }
    };
  
    // Show loading only during initial load, not when tenant is null after load
    if (tenantContextLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animated-gradient-bg" />
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Carregando ambiente...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen">
        {/* Animated gradient background */}
        <div className="animated-gradient-bg" />
        
        {/* Return to Master - discrete icon */}
        {showReturnBanner && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={handleReturnToMaster}
                className="fixed top-3 right-3 z-50 h-7 w-7 rounded-full bg-amber-500/80 hover:bg-amber-500 text-black shadow-md backdrop-blur-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Voltar ao Master</TooltipContent>
          </Tooltip>
        )}
       
       {/* Floating Dock - expanded on dashboard, collapsed on subpages */}
       <FloatingDock items={menuItems} position="left" collapsed={!isDashboard} />
 
       {/* Content area - everything scrolls */}
       <div className={cn(
         "min-h-screen px-4 md:px-6 pb-24 md:pb-6 pt-4",
         isDashboard ? "md:ml-28" : ""
       )}>
         {/* Top bar - scrolls with content */}
         <header className="flex items-center justify-between py-3 mb-4">
           <div className="flex items-center gap-2 md:gap-4 min-w-0">
             {!isDashboard && (
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={() => navigate('/mentor')}
                 className="h-9 w-9 rounded-full hover:bg-primary/10 shrink-0"
               >
                 <ArrowLeft className="h-4 w-4" />
               </Button>
             )}
             <Link to="/mentor">
               <BrandLogo variant="full" size="sm" logoUrl={tenant?.logo_url || undefined} brandName={tenant?.name} />
             </Link>
             {!isDashboard && (
               <>
                 <div className="hidden md:block h-6 w-px bg-border/50" />
                 <h1 className="font-display font-semibold text-base md:text-lg text-foreground truncate">
                   {pageTitle}
                 </h1>
               </>
             )}
           </div>

           <div className="flex items-center gap-3">
             <AlertsBell onClick={() => setAlertsOpen(true)} unreadCount={smartAlerts.unreadCount} />
             {isDashboard && (
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                     <Settings className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>Configurações</TooltipContent>
               </Tooltip>
             )}
             <div className="flex items-center gap-3 px-3 py-2 rounded-full">
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

          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
       </div>
 
        <SOSNotificationAlert />
        <AlertsPanel open={alertsOpen} onOpenChange={setAlertsOpen} smartAlerts={smartAlerts} />
      </div>
   );
 }