 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Building2, Users, Eye, Shield, Activity, UserPlus, Loader2 } from 'lucide-react';
 import { Link } from 'react-router-dom';
 import { useMasterDashboardStats } from '@/hooks/useMasterDashboardStats';
 import { PLATFORM } from '@/lib/platform';
 import { formatDistanceToNow } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { Skeleton } from '@/components/ui/skeleton';
 
 export default function MasterDashboard() {
   const { tenantsCount, usersCount, membershipsCount, recentActivity, isLoading } = useMasterDashboardStats();
 
    const stats = [
      { label: 'Tenants Ativos', value: tenantsCount, icon: Building2, color: 'text-primary' },
      { label: 'Pessoas Cadastradas', value: usersCount, icon: Users, color: 'text-accent' },
      { label: 'Vínculos Ativos', value: membershipsCount, icon: Activity, color: 'text-purple-400' },
    ];
 
   const getRoleIcon = (role: string) => {
     switch (role) {
       case 'mentor': return Shield;
       case 'mentee': return UserPlus;
       case 'master_admin': return Building2;
       default: return Users;
     }
   };
 
   const getRoleColor = (role: string) => {
    switch (role) {
      case 'mentor': return 'bg-blue-500/20 text-blue-400';
      case 'mentee': return 'bg-green-500/20 text-green-400';
      case 'master_admin': return 'bg-primary/20 text-primary';
      default: return 'bg-slate-500/20 text-slate-400';
    }
   };
 
   const getRoleLabel = (role: string) => {
     switch (role) {
       case 'mentor': return 'Mentor cadastrado';
       case 'mentee': return 'Mentorado cadastrado';
       case 'master_admin': return 'Admin Master cadastrado';
       default: return 'Usuário cadastrado';
     }
   };
 
   return (
     <div className="space-y-8">
       {/* Header */}
        <div>
         <h1 className="text-3xl font-display font-bold text-foreground">
            {PLATFORM.shortName} — Master Admin
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerenciamento global da plataforma {PLATFORM.name}
          </p>
        </div>
 
       {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.label === 'Tenants Ativos' ? '/master/tenants' : '/master/users'}>
            <Card className="glass-card-glow cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                        {isLoading ? (
                          <Skeleton className="h-9 w-16 mt-1 bg-muted" />
                        ) : (
                          <p className="text-3xl font-bold text-foreground mt-1">{stat.value ?? 0}</p>
                        )}
                    </div>
                    <stat.icon className={`h-10 w-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
 
       {/* Quick Actions */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Preview Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Eye className="h-5 w-5 text-accent" />
               Preview do Sistema
             </CardTitle>
              <CardDescription className="text-muted-foreground">
               Visualize as áreas do Mentor e Mentorado com dados do sandbox
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-3">
             <Button asChild className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
               <Link to="/master/preview">
                 <Eye className="mr-2 h-4 w-4" />
                 Acessar Previews
               </Link>
             </Button>
           </CardContent>
         </Card>
 
         {/* Tenants Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
               Gestão de Tenants
             </CardTitle>
              <CardDescription className="text-muted-foreground">
                Gerencie empresas e configurações globais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full border-border text-foreground hover:bg-muted">
               <Link to="/master/tenants">
                 <Building2 className="mr-2 h-4 w-4" />
                 Ver Tenants
               </Link>
             </Button>
           </CardContent>
         </Card>
       </div>
 
       {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-foreground">Atividade Recente</CardTitle>
         </CardHeader>
         <CardContent>
             {isLoading ? (
               <div className="space-y-4">
                 {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background/50">
                      <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48 bg-muted" />
                        <Skeleton className="h-3 w-32 bg-muted" />
                     </div>
                   </div>
                 ))}
               </div>
             ) : recentActivity && recentActivity.length > 0 ? (
               <div className="space-y-4">
                 {recentActivity.map((activity) => {
                   const IconComponent = getRoleIcon(activity.role);
                   const colorClass = getRoleColor(activity.role);
                   return (
                     <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-background/50">
                       <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                         <IconComponent className={`h-5 w-5 ${colorClass.split(' ')[1]}`} />
                       </div>
                       <div className="flex-1">
                          <p className="text-sm text-foreground">{getRoleLabel(activity.role)}</p>
                          <p className="text-xs text-muted-foreground">
                           {activity.profiles?.full_name || activity.profiles?.email || 'Usuário'} • {activity.tenants?.name} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                         </p>
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <p className="text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
             )}
         </CardContent>
       </Card>
     </div>
   );
 }