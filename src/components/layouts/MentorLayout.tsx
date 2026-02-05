 import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
 import { FloatingDock } from '@/components/FloatingDock';
 import { useAuth } from '@/hooks/useAuth';
 import { useTenant } from '@/contexts/TenantContext';
 import { SOSNotificationAlert } from '@/components/admin/SOSNotificationAlert';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Button } from '@/components/ui/button';
 import { LogOut, Settings, ArrowLeft } from 'lucide-react';
 import { LBVLogo } from '@/components/LBVLogo';
  import {
    LayoutDashboard,
    Users,
    BookOpen,
    Calendar,
    AlertTriangle,
    Trophy,
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
 
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/mentor' },
    { icon: Compass, label: 'Jornada CS', path: '/mentor/jornada-cs' },
    { icon: Users, label: 'Mentorados', path: '/mentor/mentorados' },
    { icon: Target, label: 'CRM', path: '/mentor/crm' },
    { icon: BookOpen, label: 'Trilhas', path: '/mentor/trilhas' },
    { icon: Calendar, label: 'Calendário', path: '/mentor/calendario' },
    { icon: AlertTriangle, label: 'Centro SOS', path: '/mentor/sos' },
    { icon: Trophy, label: 'Rankings', path: '/mentor/ranking' },
    { icon: Mail, label: 'Emails', path: '/mentor/emails' },
    { icon: BarChart3, label: 'Relatórios', path: '/mentor/relatorios' },
  ];
 
 export function MentorLayout() {
   const { profile, signOut } = useAuth();
   const { tenant, activeMembership, isImpersonating, endImpersonation } = useTenant();
   const location = useLocation();
   const navigate = useNavigate();
 
   const isDashboard = location.pathname === '/mentor';
   const currentPage = menuItems.find(item => item.path === location.pathname);
   const pageTitle = currentPage?.label || 'Página';
 
   return (
     <div className="min-h-screen">
       {/* Animated gradient background */}
       <div className="animated-gradient-bg" />
       
       {/* Impersonation Banner */}
       {isImpersonating && (
         <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black px-4 py-2 flex items-center justify-between">
           <span className="text-sm font-medium">
             ⚠️ Visualizando como: {activeMembership?.role} ({activeMembership?.tenant_name})
           </span>
           <Button size="sm" variant="outline" onClick={endImpersonation} className="h-7 text-xs">
             Encerrar Preview
           </Button>
         </div>
       )}
       
       {/* Floating Dock - only visible on dashboard */}
       {isDashboard && <FloatingDock items={menuItems} position="left" />}
 
       {/* Back Header - visible on sub-pages */}
       {!isDashboard && (
         <header className={cn(
           "fixed left-0 right-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border/50",
           isImpersonating ? "top-10" : "top-0"
         )}>
           <div className="flex items-center gap-4">
             <Link to="/mentor">
               <LBVLogo variant="full" size="sm" />
             </Link>
             <div className="h-6 w-px bg-border/50" />
             <Button
               variant="ghost"
               size="icon"
               onClick={() => navigate('/mentor')}
               className="h-9 w-9 rounded-full hover:bg-primary/10"
             >
               <ArrowLeft className="h-4 w-4" />
             </Button>
             <h1 className="font-display font-semibold text-lg text-foreground">
               {pageTitle}
             </h1>
           </div>
 
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
         <header className={cn(
           "fixed left-0 right-0 z-40 p-4 flex items-center justify-between",
           isImpersonating ? "top-10" : "top-0"
         )}>
           <Link to="/mentor" className="ml-28">
             <LBVLogo variant="full" size="sm" />
           </Link>
 
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
 
       <main className={cn(
         "min-h-screen transition-all duration-300",
         isDashboard 
           ? "ml-28 pt-20 px-6 pb-6" 
           : "pt-20 px-4 md:px-6 pb-6",
         isImpersonating && "pt-30"
       )}>
         <Outlet />
       </main>
 
       <SOSNotificationAlert />
     </div>
   );
 }