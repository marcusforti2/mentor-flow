 import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
 import { FloatingDock } from '@/components/FloatingDock';
 import { useAuth } from '@/hooks/useAuth';
 import { useTenant } from '@/contexts/TenantContext';
 import { WhatsAppGroupModal } from '@/components/WhatsAppGroupModal';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { LogOut, ArrowLeft } from 'lucide-react';
 import { BrandLogo } from '@/components/BrandLogo';
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Calendar,
  AlertTriangle,
  User,
  Sparkles,
  FolderOpen,
  ClipboardCheck,
  
} from 'lucide-react';
 import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
 } from '@/components/ui/tooltip';
 import { cn } from '@/lib/utils';
 
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/mentorado' },
  { icon: BookOpen, label: 'Trilhas', path: '/mentorado/trilhas' },
  { icon: ClipboardCheck, label: 'Minhas Tarefas', path: '/mentorado/tarefas' },
  { icon: Target, label: 'Meu CRM', path: '/mentorado/meu-crm' },
  { icon: Sparkles, label: 'Arsenal de Vendas', path: '/mentorado/ferramentas' },
  { icon: FolderOpen, label: 'Arquivos & Reuniões', path: '/mentorado/meus-arquivos' },
  { icon: Calendar, label: 'Calendário', path: '/mentorado/calendario' },
  { icon: AlertTriangle, label: 'Centro SOS', path: '/mentorado/sos' },
  { icon: User, label: 'Meu Perfil', path: '/mentorado/perfil' },
];
 
  export function MentoradoLayout() {
    const { profile, signOut } = useAuth();
    const { activeMembership, realMembership, isImpersonating, endImpersonation } = useTenant();
    const location = useLocation();
    const navigate = useNavigate();

    // Fetch impersonated user's profile when impersonating
    const { data: impersonatedProfile } = useQuery({
      queryKey: ['impersonated-profile', activeMembership?.user_id],
      queryFn: async () => {
        if (!activeMembership?.user_id) return null;
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, email')
          .eq('user_id', activeMembership.user_id)
          .maybeSingle();
        return data;
      },
      enabled: isImpersonating && !!activeMembership?.user_id,
    });

    const displayProfile = isImpersonating && impersonatedProfile ? impersonatedProfile : profile;
  
    const isDashboard = location.pathname === '/mentorado';
    const currentPage = menuItems.find(item => item.path === location.pathname);
    const pageTitle = currentPage?.label || 'Página';

    const isMasterViewing = realMembership?.role === 'master_admin';
    const showReturnBanner = isImpersonating || isMasterViewing;
    const showReturnButton = showReturnBanner;

    const handleReturnToMaster = () => {
      if (isImpersonating) {
        endImpersonation();
      } else {
        navigate('/master');
      }
    };
  
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
       
       {/* Floating Dock - only visible on dashboard */}
       {isDashboard && <FloatingDock items={menuItems} position="left" />}
 
       {/* Back Header - visible on sub-pages */}
       {!isDashboard && (
          <header className="fixed left-0 right-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border/50 top-0">
           <div className="flex items-center gap-3">
             <Button
               variant="ghost"
               size="icon"
               onClick={() => navigate('/mentorado')}
               className="h-10 w-10 rounded-full hover:bg-primary/10"
             >
               <ArrowLeft className="h-5 w-5" />
             </Button>
             <h1 className="font-display font-semibold text-lg text-foreground">
               {pageTitle}
             </h1>
           </div>
 
           <div className="flex items-center gap-3">
             <Avatar className="h-8 w-8">
              <AvatarImage src={displayProfile?.avatar_url || ''} />
                <AvatarFallback className="bg-accent/20 text-accent text-sm">
                  {displayProfile?.full_name?.charAt(0) || 'U'}
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
          <header className="fixed left-0 right-0 z-40 p-4 flex items-center justify-between top-0">
           <Link to="/mentorado" className="ml-28">
             <BrandLogo variant="full" size="sm" />
           </Link>
 
           <div className="glass-card flex items-center gap-3 px-3 py-2 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={displayProfile?.avatar_url || ''} />
                <AvatarFallback className="bg-accent/20 text-accent text-sm">
                  {displayProfile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:block">
                {displayProfile?.full_name || 'Mentorado'}
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
 
        <main className={cn(
          "min-h-screen transition-all duration-300",
          isDashboard 
            ? "ml-28 pt-20 px-6 pb-6" 
            : "pt-16 pb-6"
        )}>
         <Outlet />
       </main>
 
       {!isImpersonating && <WhatsAppGroupModal />}
     </div>
   );
 }