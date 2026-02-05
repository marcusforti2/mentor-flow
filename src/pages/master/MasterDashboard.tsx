 import { useTenant } from '@/contexts/TenantContext';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Building2, Users, Eye, Settings, Shield, Activity } from 'lucide-react';
 import { Link } from 'react-router-dom';
 
 export default function MasterDashboard() {
   const { memberships, tenant } = useTenant();
 
   const stats = [
     { label: 'Tenants Ativos', value: '2', icon: Building2, color: 'text-blue-400' },
     { label: 'Usuários Totais', value: '25', icon: Users, color: 'text-green-400' },
     { label: 'Sessões Hoje', value: '12', icon: Activity, color: 'text-purple-400' },
   ];
 
   return (
     <div className="space-y-8">
       {/* Header */}
       <div>
         <h1 className="text-3xl font-display font-bold text-slate-100">
           Master Admin
         </h1>
         <p className="text-slate-400 mt-1">
           Gerenciamento global da plataforma LBV TECH
         </p>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {stats.map((stat) => (
           <Card key={stat.label} className="bg-slate-800/50 border-slate-700/50">
             <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-slate-400">{stat.label}</p>
                   <p className="text-3xl font-bold text-slate-100 mt-1">{stat.value}</p>
                 </div>
                 <stat.icon className={`h-10 w-10 ${stat.color}`} />
               </div>
             </CardContent>
           </Card>
         ))}
       </div>
 
       {/* Quick Actions */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Preview Card */}
         <Card className="bg-slate-800/50 border-slate-700/50">
           <CardHeader>
             <CardTitle className="text-slate-100 flex items-center gap-2">
               <Eye className="h-5 w-5 text-amber-400" />
               Preview do Sistema
             </CardTitle>
             <CardDescription className="text-slate-400">
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
         <Card className="bg-slate-800/50 border-slate-700/50">
           <CardHeader>
             <CardTitle className="text-slate-100 flex items-center gap-2">
               <Building2 className="h-5 w-5 text-blue-400" />
               Gestão de Tenants
             </CardTitle>
             <CardDescription className="text-slate-400">
               Gerencie empresas e configurações globais
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-3">
             <Button asChild variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
               <Link to="/master/tenants">
                 <Building2 className="mr-2 h-4 w-4" />
                 Ver Tenants
               </Link>
             </Button>
           </CardContent>
         </Card>
       </div>
 
       {/* Recent Activity */}
       <Card className="bg-slate-800/50 border-slate-700/50">
         <CardHeader>
           <CardTitle className="text-slate-100">Atividade Recente</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50">
               <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                 <Users className="h-5 w-5 text-green-400" />
               </div>
               <div className="flex-1">
                 <p className="text-sm text-slate-200">Novo mentorado cadastrado</p>
                 <p className="text-xs text-slate-500">Tenant: Atlas Sales Invest • há 2 horas</p>
               </div>
             </div>
             <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50">
               <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                 <Shield className="h-5 w-5 text-blue-400" />
               </div>
               <div className="flex-1">
                 <p className="text-sm text-slate-200">Mentor acessou o sistema</p>
                 <p className="text-xs text-slate-500">mariana@atlasalesinvest.com • há 3 horas</p>
               </div>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }