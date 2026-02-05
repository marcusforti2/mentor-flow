 import { useState } from 'react';
 import { useTenant, MembershipRole } from '@/contexts/TenantContext';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { 
   Wrench, 
   X, 
   Eye, 
   Zap, 
   User, 
   UserCog,
   GraduationCap,
   Shield,
   AlertTriangle,
   Crown
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { Link } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 interface MembershipWithProfile {
   id: string;
   role: MembershipRole;
   user_id: string;
   user_name: string | null;
   user_email: string | null;
   avatar_url: string | null;
 }
 
 const roleConfig: Record<MembershipRole, { icon: typeof User; label: string; color: string }> = {
   master_admin: { icon: Crown, label: 'Master Admin', color: 'text-amber-500' },
   admin: { icon: Shield, label: 'Admin', color: 'text-destructive' },
   ops: { icon: UserCog, label: 'Operações', color: 'text-orange-500' },
   mentor: { icon: GraduationCap, label: 'Mentor', color: 'text-primary' },
   mentee: { icon: User, label: 'Mentorado', color: 'text-accent' },
 };
 
 export function SwitchContextPanel() {
   const [isExpanded, setIsExpanded] = useState(false);
   const { 
     tenant,
     activeMembership, 
     realMembership, 
     isImpersonating,
     canImpersonate,
     switchMembership,
     endImpersonation,
     isLoading: tenantLoading
   } = useTenant();
   const { profile } = useAuth();
 
   // Fetch all memberships in the tenant with profiles (for impersonation list)
   const { data: allMemberships, isLoading: membershipsLoading } = useQuery({
     queryKey: ['tenant-memberships', tenant?.id],
     queryFn: async () => {
       if (!tenant?.id) return [];
       
       // First get memberships
       const { data: membershipsData, error: membershipsError } = await supabase
         .from('memberships')
         .select('id, role, user_id')
         .eq('tenant_id', tenant.id)
         .eq('status', 'active')
         .order('role');
       
       if (membershipsError) throw membershipsError;
       if (!membershipsData) return [];
       
       // Get unique user IDs
       const userIds = [...new Set(membershipsData.map(m => m.user_id))];
       
       // Fetch profiles for these users
       const { data: profilesData, error: profilesError } = await supabase
         .from('profiles')
         .select('user_id, full_name, email, avatar_url')
         .in('user_id', userIds);
       
       if (profilesError) throw profilesError;
       
       // Create a map for quick lookup
       const profilesMap = new Map(
         (profilesData || []).map(p => [p.user_id, p])
       );
       
       return membershipsData.map((m) => {
         const profile = profilesMap.get(m.user_id);
         return {
         id: m.id,
         role: m.role,
         user_id: m.user_id,
           user_name: profile?.full_name || null,
           user_email: profile?.email || null,
           avatar_url: profile?.avatar_url || null,
         };
       }) as MembershipWithProfile[];
     },
     enabled: !!tenant?.id && canImpersonate,
   });
 
   // Don't render if user can't impersonate
   if (tenantLoading || !canImpersonate) {
     return null;
   }
 
   const currentRole = activeMembership?.role;
   const CurrentIcon = currentRole ? roleConfig[currentRole].icon : User;
 
   if (!isExpanded) {
     return (
       <Button
         onClick={() => setIsExpanded(true)}
         className={cn(
           "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg",
           "bg-background/80 backdrop-blur-xl border border-border/50",
           "hover:bg-background/90 hover:scale-105 transition-all duration-200",
           isImpersonating && "ring-2 ring-orange-500 ring-offset-2 ring-offset-background"
         )}
         size="icon"
       >
         <Wrench className="h-5 w-5 text-foreground" />
         {isImpersonating && (
           <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
         )}
       </Button>
     );
   }
 
   return (
     <div className={cn(
       "fixed bottom-6 right-6 z-50 w-80",
       "glass-card rounded-2xl shadow-2xl",
       "animate-in slide-in-from-bottom-4 duration-200"
     )}>
       {/* Header */}
       <div className="flex items-center justify-between p-4 border-b border-border/30">
         <div className="flex items-center gap-2">
           <Wrench className="h-4 w-4 text-primary" />
           <span className="font-semibold text-sm text-foreground">Switch Context</span>
           {isImpersonating && (
             <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-[10px]">
               IMPERSONANDO
             </Badge>
           )}
         </div>
         <Button
           variant="ghost"
           size="icon"
           onClick={() => setIsExpanded(false)}
           className="h-7 w-7 rounded-full hover:bg-muted"
         >
           <X className="h-4 w-4" />
         </Button>
       </div>
 
       {/* Impersonation Warning */}
       {isImpersonating && (
         <div className="mx-4 mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
           <div className="flex items-start gap-2">
             <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
             <div className="flex-1">
               <p className="text-xs font-medium text-orange-500">Modo Impersonation Ativo</p>
               <p className="text-xs text-muted-foreground mt-1">
                 Você está visualizando como outro usuário.
               </p>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={endImpersonation}
                 className="mt-2 h-7 text-xs border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
               >
                 Encerrar Impersonation
               </Button>
             </div>
           </div>
         </div>
       )}
 
       {/* Content */}
       <div className="p-4 space-y-4">
         {/* Current view indicator */}
         <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
           <div className={cn(
             "h-10 w-10 rounded-full flex items-center justify-center",
             "bg-gradient-to-br from-primary/20 to-accent/20"
           )}>
             <CurrentIcon className={cn("h-5 w-5", currentRole && roleConfig[currentRole].color)} />
           </div>
           <div className="flex-1">
             <p className="text-xs text-muted-foreground">Visualizando como</p>
             <p className={cn(
               "font-semibold text-sm",
               currentRole && roleConfig[currentRole].color
             )}>
               {currentRole ? roleConfig[currentRole].label : 'Nenhum'}
             </p>
           </div>
           <Eye className="h-4 w-4 text-muted-foreground" />
         </div>
 
         {/* Membership list */}
         <div className="space-y-2">
           <p className="text-xs font-medium text-muted-foreground px-1">
             Membros do tenant ({allMemberships?.length || 0})
           </p>
           
           <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
             {membershipsLoading ? (
               <div className="flex items-center justify-center py-4">
                 <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
               </div>
             ) : (
               allMemberships?.map((membership) => {
                 const config = roleConfig[membership.role];
                 const Icon = config.icon;
                 const isCurrentUser = membership.user_id === realMembership?.user_id;
                 const isActive = membership.id === activeMembership?.id;
                 
                 return (
                   <button
                     key={membership.id}
                     onClick={() => !isActive && switchMembership(membership.id)}
                     disabled={isActive}
                     className={cn(
                       "w-full flex items-center gap-3 p-2 rounded-lg transition-all",
                       "hover:bg-muted/70",
                       isActive && "bg-primary/10 border border-primary/30",
                       !isActive && "border border-transparent"
                     )}
                   >
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={membership.avatar_url || undefined} />
                       <AvatarFallback className="text-xs">
                         {(membership.user_name || membership.user_email || '?').charAt(0).toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
                     
                     <div className="flex-1 text-left min-w-0">
                       <p className="text-sm font-medium truncate">
                         {membership.user_name || membership.user_email || 'Usuário'}
                         {isCurrentUser && (
                           <span className="text-xs text-muted-foreground ml-1">(você)</span>
                         )}
                       </p>
                       <div className="flex items-center gap-1">
                         <Icon className={cn("h-3 w-3", config.color)} />
                         <span className={cn("text-xs", config.color)}>{config.label}</span>
                       </div>
                     </div>
                     
                     {isActive ? (
                       <Badge variant="outline" className="text-[10px] bg-primary/10">
                         Ativo
                       </Badge>
                     ) : (
                       <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                         Impersonar
                       </span>
                     )}
                   </button>
                 );
               })
             )}
           </div>
         </div>
 
         {/* Real user info */}
         {realMembership && (
           <div className="text-xs text-muted-foreground text-center border-t border-border/30 pt-3">
             Seu acesso real:{' '}
             <span className={cn("font-medium", roleConfig[realMembership.role].color)}>
               {roleConfig[realMembership.role].label}
             </span>
           </div>
         )}
 
         {/* DevTools Link - only for admin */}
         {(realMembership?.role === 'admin' || realMembership?.role === 'master_admin') && (
           <Link 
             to={realMembership?.role === 'master_admin' ? '/master/preview' : '/mentor/devtools'}
             className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 hover:from-primary/30 hover:to-accent/30 transition-all"
           >
             <Zap className="h-4 w-4 text-primary" />
             <span className="text-sm font-medium text-foreground">Abrir DevTools</span>
           </Link>
         )}
       </div>
     </div>
   );
 }