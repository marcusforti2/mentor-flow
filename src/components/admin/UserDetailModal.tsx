import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  User, Mail, Phone, Building2, Calendar, Shield, 
  Eye, Power, MessageCircle, Link as LinkIcon, 
  Activity, Clock, UserCog, Copy
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MembershipWithDetails } from '@/hooks/useMemberships';

interface UserDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: MembershipWithDetails | null;
  onImpersonate: (membership: MembershipWithDetails) => void;
  onToggleStatus: (membership: MembershipWithDetails) => void;
  onToggleImpersonation: (membership: MembershipWithDetails) => void;
  onInvite: (membership: MembershipWithDetails) => void;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const roleConfig = {
  master_admin: { label: 'Master Admin', color: 'bg-amber-500' },
  admin: { label: 'Admin', color: 'bg-purple-500' },
  ops: { label: 'Ops', color: 'bg-blue-500' },
  mentor: { label: 'Mentor', color: 'bg-green-500' },
  mentee: { label: 'Mentorado', color: 'bg-slate-500' },
};

const statusConfig = {
  active: { label: 'Ativo', variant: 'default' as const },
  inactive: { label: 'Inativo', variant: 'secondary' as const },
  suspended: { label: 'Suspenso', variant: 'destructive' as const },
};

export function UserDetailModal({
  open,
  onOpenChange,
  membership,
  onImpersonate,
  onToggleStatus,
  onToggleImpersonation,
  onInvite,
}: UserDetailModalProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [impersonationHistory, setImpersonationHistory] = useState<any[]>([]);

  useEffect(() => {
    if (open && membership) {
      fetchActivities();
      fetchImpersonationHistory();
    }
  }, [open, membership]);

  const fetchActivities = async () => {
    if (!membership) return;
    setIsLoadingActivities(true);

    try {
      const activityList: ActivityItem[] = [];

      // Fetch audit logs for this user
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', membership.user_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (auditLogs) {
        auditLogs.forEach(log => {
          activityList.push({
            id: log.id,
            type: 'audit',
            description: log.action,
            timestamp: log.created_at || '',
            metadata: log.metadata as Record<string, unknown> | undefined,
          });
        });
      }

      // Sort by timestamp
      activityList.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(activityList.slice(0, 50));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const fetchImpersonationHistory = async () => {
    if (!membership) return;

    try {
      // Fetch times this user was impersonated
      const { data: asTarget } = await supabase
        .from('impersonation_logs')
        .select(`
          *,
          admin_membership:memberships!impersonation_logs_admin_membership_id_fkey(
            id,
            profiles:user_id(full_name, email)
          )
        `)
        .eq('target_membership_id', membership.id)
        .order('started_at', { ascending: false })
        .limit(10);

      setImpersonationHistory(asTarget || []);
    } catch (error) {
      console.error('Error fetching impersonation history:', error);
    }
  };

  const handleCopyEmail = () => {
    if (membership?.profile?.email) {
      navigator.clipboard.writeText(membership.profile.email);
      toast.success('Email copiado!');
    }
  };

  const handleCopyUserId = () => {
    if (membership?.user_id) {
      navigator.clipboard.writeText(membership.user_id);
      toast.success('User ID copiado!');
    }
  };

  if (!membership) return null;

  const role = roleConfig[membership.role] || roleConfig.mentee;
  const status = statusConfig[membership.status as keyof typeof statusConfig] || statusConfig.inactive;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-slate-600">
              <AvatarImage src={membership.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-slate-700 text-slate-300">
                {membership.profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-lg">{membership.profile?.full_name || 'Usuário'}</span>
              <div className="flex gap-2 mt-1">
                <Badge className={`${role.color} text-white text-xs`}>{role.label}</Badge>
                <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Detalhes e histórico do usuário
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="info" className="data-[state=active]:bg-slate-700">
              <User className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-slate-700">
              <Activity className="h-4 w-4 mr-2" />
              Atividade
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-slate-700">
              <Shield className="h-4 w-4 mr-2" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Contact Info */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <span>{membership.profile?.email || 'Não informado'}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={handleCopyEmail}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <span>{membership.profile?.phone || 'Não informado'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Tenant Info */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Organização</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <span>{membership.tenant?.name || 'Sem tenant'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <UserCog className="h-4 w-4 text-slate-500" />
                      <span>Papel: {role.label}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Datas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span>
                        Criado em: {membership.created_at 
                          ? format(new Date(membership.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span>
                        Atualizado: {membership.updated_at 
                          ? formatDistanceToNow(new Date(membership.updated_at), { addSuffix: true, locale: ptBR })
                          : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* IDs */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Identificadores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-slate-500">User ID: </span>
                        <span className="font-mono text-xs">{membership.user_id.slice(0, 8)}...</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={handleCopyUserId}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500">Membership ID: </span>
                      <span className="font-mono text-xs">{membership.id.slice(0, 8)}...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {isLoadingActivities ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 bg-slate-700" />
                        <Skeleton className="h-3 w-1/2 bg-slate-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-2">
                  {activities.map(activity => (
                    <div key={activity.id} className="flex gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-200">{activity.description}</p>
                        <p className="text-xs text-slate-500">
                          {activity.timestamp && formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma atividade registrada</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Impersonation Status */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Impersonation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pode ser impersonado</span>
                      <Badge variant={membership.can_impersonate ? 'default' : 'secondary'}>
                        {membership.can_impersonate ? 'Sim' : 'Não'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Impersonation History */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Histórico de Impersonation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {impersonationHistory.length > 0 ? (
                      <div className="space-y-2">
                        {impersonationHistory.map(log => (
                          <div key={log.id} className="text-sm p-2 bg-slate-900/50 rounded">
                            <p className="text-slate-300">
                              Impersonado por: {log.admin_membership?.profiles?.full_name || 'Admin'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {log.started_at && format(new Date(log.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              {log.ended_at && ` - ${format(new Date(log.ended_at), "HH:mm", { locale: ptBR })}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Nenhum registro de impersonation</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator className="bg-slate-700" />

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {membership.role !== 'master_admin' && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => onImpersonate(membership)}
              disabled={!membership.can_impersonate}
            >
              <Eye className="h-4 w-4 mr-2" />
              Impersonar
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => onToggleImpersonation(membership)}
          >
            <Shield className="h-4 w-4 mr-2" />
            {membership.can_impersonate ? 'Desativar' : 'Ativar'} Impersonation
          </Button>

          <Button
            size="sm"
            variant={membership.status === 'active' ? 'destructive' : 'default'}
            onClick={() => onToggleStatus(membership)}
          >
            <Power className="h-4 w-4 mr-2" />
            {membership.status === 'active' ? 'Suspender' : 'Ativar'}
          </Button>

          {membership.role === 'mentor' && membership.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              className="border-green-600 text-green-400 hover:bg-green-900/20"
              onClick={() => onInvite(membership)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Convidar WhatsApp
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
