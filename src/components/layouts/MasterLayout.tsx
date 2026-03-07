import { Suspense, useState, useEffect, useCallback } from 'react';
import { LazyErrorBoundary } from '@/components/LazyErrorBoundary';
import { RouteTransition } from '@/components/RouteTransition';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft, Shield, Eye, Users, Building2, Settings, Palette, Globe, Download, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FloatingDock } from '@/components/FloatingDock';
import { PageSpinner } from '@/components/PageSpinner';
 
 const menuItems = [
   { icon: Shield, label: 'Dashboard', path: '/master' },
   { icon: Building2, label: 'Tenants', path: '/master/tenants' },
   { icon: Users, label: 'Usuários', path: '/master/users' },
   { icon: Globe, label: 'Domínios', path: '/master/domains' },
   { icon: Palette, label: 'Branding', path: '/master/branding' },
   { icon: Eye, label: 'Preview', path: '/master/preview' },
   { icon: Settings, label: 'Config', path: '/master/config' },
 ];
 
// ─── Backup Reminder Logic ────────────────────────────────────
const BACKUP_REMINDER_KEY = 'mentorflow_last_backup_download';

function useBackupReminder() {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const checkReminder = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
      if (dayOfWeek !== 1) { // Only show on Mondays
        setShowReminder(false);
        return;
      }
      const lastDownload = localStorage.getItem(BACKUP_REMINDER_KEY);
      if (!lastDownload) {
        setShowReminder(true);
        return;
      }
      const lastDate = new Date(lastDownload);
      const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      setShowReminder(diffDays >= 6); // Show if last download was 6+ days ago
    };
    checkReminder();
    const interval = setInterval(checkReminder, 60000); // Re-check every minute
    return () => clearInterval(interval);
  }, []);

  const markDone = useCallback(() => {
    localStorage.setItem(BACKUP_REMINDER_KEY, new Date().toISOString());
    setShowReminder(false);
  }, []);

  return { showReminder, markDone };
}

export function MasterLayout() {
  const { profile, signOut } = useAuth();
  const { realMembership } = useTenant();
  const { isImpersonating } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const { showReminder, markDone } = useBackupReminder();

  const isDashboard = location.pathname === '/master';
  const currentPage = menuItems.find(item => item.path === location.pathname);
  const pageTitle = currentPage?.label || 'Master Admin';

  // Add top padding when impersonation banner is active
  const bannerOffset = isImpersonating ? 'pt-10' : '';

  return (
    <div className={cn("min-h-screen theme-light", bannerOffset)}>
      {/* MentorFlow master admin light background */}
      <div className="animated-gradient-bg" />
       
       {/* Floating Dock - only visible on dashboard */}
       {isDashboard && <FloatingDock items={menuItems} position="left" />}
 
       {/* Back Header - visible on sub-pages */}
       {!isDashboard && (
         <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 md:px-6 bg-card/80 backdrop-blur-md border-b border-border/50">
           <div className="flex items-center gap-4">
             <Link to="/master">
              <BrandLogo variant="full" size="sm" />
             </Link>
             <div className="h-6 w-px bg-border/50" />
             <Button
               variant="ghost"
               size="icon"
               onClick={() => navigate('/master')}
               className="h-9 w-9 rounded-full hover:bg-primary/10 text-muted-foreground"
             >
               <ArrowLeft className="h-4 w-4" />
             </Button>
             <h1 className="font-display font-semibold text-lg text-foreground">
               {pageTitle}
             </h1>
           </div>
 
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
                <span className="text-xs font-medium text-primary">Master Admin</span>
              </div>
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
                   className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive text-slate-400"
                 >
                   <LogOut className="h-4 w-4" />
                 </Button>
               </TooltipTrigger>
               <TooltipContent>Sair</TooltipContent>
             </Tooltip>
           </div>
         </header>
       )}
 
       {/* Top bar - only on dashboard */}
       {isDashboard && (
         <header className="fixed top-0 left-0 right-0 z-40 p-4 flex items-center justify-between">
           <Link to="/master" className="ml-28">
             <BrandLogo variant="full" size="sm" />
           </Link>
 
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
                <span className="text-xs font-medium text-primary">Master Admin</span>
              </div>

              <div className="glass-card flex items-center gap-3 px-3 py-2 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                   {profile?.full_name?.charAt(0) || 'M'}
                 </AvatarFallback>
               </Avatar>
               <span className="text-sm font-medium text-foreground hidden sm:block">
                 {profile?.full_name || 'Master Admin'}
               </span>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={signOut}
                      className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive text-muted-foreground"
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
 
       {/* Backup Reminder Popup */}
       {showReminder && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
           <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
             <div className="flex items-start justify-between">
               <div className="flex items-center gap-3">
                 <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                   <Download className="h-6 w-6 text-amber-500" />
                 </div>
                 <div>
                   <h3 className="font-display font-bold text-foreground text-lg">Hora do Backup! 🛡️</h3>
                   <p className="text-sm text-muted-foreground">Segunda-feira — lembrete semanal</p>
                 </div>
               </div>
             </div>
             <p className="text-sm text-muted-foreground">
               Faça o download do backup semanal dos seus dados. Vá em <strong className="text-foreground">Configurações → Backup</strong> e clique em "Baixar tudo".
             </p>
             <div className="flex items-center gap-3">
               <Button
                 className="flex-1"
                 onClick={() => {
                   navigate('/master/config');
                   // Don't mark done — only mark when they actually download
                 }}
               >
                 <Download className="h-4 w-4 mr-2" />
                 Ir para Backup
               </Button>
               <Button
                 variant="outline"
                 onClick={markDone}
               >
                 Já baixei ✓
               </Button>
             </div>
             <p className="text-[10px] text-muted-foreground text-center">
               Este lembrete aparece toda segunda até você confirmar o download.
             </p>
           </div>
         </div>
       )}

       <main className={cn(
         "min-h-screen transition-all duration-300",
         isDashboard 
           ? "ml-28 pt-20 px-6 pb-6" 
           : "pt-20 px-4 md:px-6 pb-6"
       )}>
          <LazyErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
              <RouteTransition>
                <Outlet />
              </RouteTransition>
            </Suspense>
          </LazyErrorBoundary>
       </main>
     </div>
   );
 }