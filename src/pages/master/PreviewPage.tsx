 import { useState } from 'react';
 import { useTenant } from '@/contexts/TenantContext';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Eye, Users, User, ExternalLink, AlertTriangle } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Badge } from '@/components/ui/badge';
 
 // Sandbox tenant ID
 const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';
 
 export default function PreviewPage() {
   const { switchMembership, memberships } = useTenant();
   const navigate = useNavigate();
   const [selectedMentee, setSelectedMentee] = useState<string>('');
 
   // Get sandbox memberships for preview
   const sandboxMemberships = memberships.filter(m => m.tenant_id === SANDBOX_TENANT_ID);
   const menteeMemberships = sandboxMemberships.filter(m => m.role === 'mentee');
   const mentorMemberships = sandboxMemberships.filter(m => m.role === 'mentor');
 
   const handleMentorPreview = async () => {
     const mentorMembership = mentorMemberships[0];
     if (mentorMembership) {
       await switchMembership(mentorMembership.id);
     } else {
       // Navigate directly to mentor area with sandbox context
       navigate('/mentor');
     }
   };
 
   const handleMenteePreview = async () => {
     if (selectedMentee) {
       await switchMembership(selectedMentee);
     }
   };
 
   return (
     <div className="space-y-8">
       {/* Header */}
       <div>
         <h1 className="text-3xl font-display font-bold text-slate-100">
           Preview do Sistema
         </h1>
         <p className="text-slate-400 mt-1">
           Visualize as áreas do Mentor e Mentorado usando dados do sandbox
         </p>
       </div>
 
       {/* Info Card */}
       <Card className="bg-amber-500/10 border-amber-500/30">
         <CardContent className="p-4 flex items-start gap-3">
           <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
           <div>
             <p className="text-sm text-amber-200 font-medium">
               Preview usa dados do tenant sandbox (LBV Preview)
             </p>
             <p className="text-xs text-amber-300/70 mt-1">
               Nenhum dado real será alterado. O preview troca apenas o contexto de visualização.
             </p>
           </div>
         </CardContent>
       </Card>
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Mentor Preview */}
         <Card className="bg-slate-800/50 border-slate-700/50">
           <CardHeader>
             <CardTitle className="text-slate-100 flex items-center gap-2">
               <Users className="h-5 w-5 text-primary" />
               Área do Mentor
             </CardTitle>
             <CardDescription className="text-slate-400">
               Visualize o painel do mentor com todos os mentorados do sandbox
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="p-4 rounded-lg bg-slate-900/50 space-y-2">
               <p className="text-sm text-slate-300">O que você verá:</p>
               <ul className="text-xs text-slate-400 space-y-1">
                 <li>• Dashboard com métricas dos 20 mentorados fake</li>
                 <li>• Lista completa de mentorados</li>
                 <li>• Trilhas e progresso</li>
                 <li>• Centro SOS e rankings</li>
               </ul>
             </div>
 
             <Button 
               onClick={handleMentorPreview}
               className="w-full bg-primary hover:bg-primary/90"
             >
               <Eye className="mr-2 h-4 w-4" />
               Abrir Preview do Mentor
               <ExternalLink className="ml-2 h-3 w-3" />
             </Button>
           </CardContent>
         </Card>
 
         {/* Mentee Preview */}
         <Card className="bg-slate-800/50 border-slate-700/50">
           <CardHeader>
             <CardTitle className="text-slate-100 flex items-center gap-2">
               <User className="h-5 w-5 text-accent" />
               Área do Mentorado
             </CardTitle>
             <CardDescription className="text-slate-400">
               Visualize a experiência individual de um mentorado específico
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <label className="text-sm text-slate-300">Selecione um mentorado:</label>
               <Select value={selectedMentee} onValueChange={setSelectedMentee}>
                 <SelectTrigger className="bg-slate-900/50 border-slate-700">
                   <SelectValue placeholder="Escolha um mentorado..." />
                 </SelectTrigger>
                 <SelectContent>
                   {menteeMemberships.length > 0 ? (
                     menteeMemberships.map((m) => (
                       <SelectItem key={m.id} value={m.id}>
                         Mentorado {m.id.slice(0, 8)}
                       </SelectItem>
                     ))
                   ) : (
                     <SelectItem value="none" disabled>
                       Nenhum mentorado no sandbox
                     </SelectItem>
                   )}
                 </SelectContent>
               </Select>
             </div>
 
             <div className="p-4 rounded-lg bg-slate-900/50 space-y-2">
               <p className="text-sm text-slate-300">O que você verá:</p>
               <ul className="text-xs text-slate-400 space-y-1">
                 <li>• Dashboard pessoal do mentorado</li>
                 <li>• Trilhas e progresso individual</li>
                 <li>• CRM pessoal</li>
                 <li>• Ranking (apenas posição, sem nomes)</li>
               </ul>
             </div>
 
             <Button 
               onClick={handleMenteePreview}
               disabled={!selectedMentee}
               className="w-full bg-accent hover:bg-accent/90"
             >
               <Eye className="mr-2 h-4 w-4" />
               Abrir Preview do Mentorado
               <ExternalLink className="ml-2 h-3 w-3" />
             </Button>
           </CardContent>
         </Card>
       </div>
 
       {/* Dev Tools Section */}
       <Card className="bg-slate-800/50 border-slate-700/50">
         <CardHeader>
           <CardTitle className="text-slate-100 flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-amber-400" />
             Impersonation (Dev)
             <Badge variant="outline" className="ml-2 text-amber-400 border-amber-400/50">
               Debug Only
             </Badge>
           </CardTitle>
           <CardDescription className="text-slate-400">
             Troque o contexto para qualquer membership existente. Logs são registrados.
           </CardDescription>
         </CardHeader>
         <CardContent>
           <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
             <p className="text-sm text-red-300">
               ⚠️ Impersonation troca o contexto ativo. Use apenas para debug.
               <br />
               <span className="text-xs text-red-400">
                 Todos os acessos são registrados na tabela impersonation_logs.
               </span>
             </p>
           </div>
 
           <div className="space-y-2">
             <label className="text-sm text-slate-300">Memberships disponíveis:</label>
             <div className="grid gap-2">
               {memberships.map((m) => (
                 <Button
                   key={m.id}
                   variant="outline"
                   size="sm"
                   className="justify-start text-left border-slate-700 hover:bg-slate-700"
                   onClick={() => switchMembership(m.id)}
                 >
                   <Badge 
                     variant="outline" 
                     className={`mr-2 ${
                       m.role === 'master_admin' ? 'text-amber-400 border-amber-400/50' :
                       m.role === 'mentor' ? 'text-primary border-primary/50' :
                       'text-accent border-accent/50'
                     }`}
                   >
                     {m.role}
                   </Badge>
                   <span className="text-slate-300">{m.tenant_name}</span>
                   <span className="text-slate-500 text-xs ml-auto">{m.id.slice(0, 8)}</span>
                 </Button>
               ))}
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }