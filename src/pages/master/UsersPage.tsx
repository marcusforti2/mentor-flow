import { useState } from 'react';
import { useMemberships, MembershipWithDetails } from '@/hooks/useMemberships';
import { useTenants } from '@/hooks/useTenants';
import { useTenant } from '@/contexts/TenantContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Users, Search, MoreHorizontal, UserCog, Power, Eye, MessageCircle, Link } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InviteMentorModal } from '@/components/admin/InviteMentorModal';
import { toast } from 'sonner';

const roleConfig = {
  master_admin: { label: 'Master Admin', variant: 'default' as const, color: 'bg-amber-500' },
  admin: { label: 'Admin', variant: 'default' as const, color: 'bg-purple-500' },
  ops: { label: 'Ops', variant: 'secondary' as const, color: 'bg-blue-500' },
  mentor: { label: 'Mentor', variant: 'secondary' as const, color: 'bg-green-500' },
  mentee: { label: 'Mentorado', variant: 'outline' as const, color: 'bg-slate-500' },
};

const statusConfig = {
  active: { label: 'Ativo', variant: 'default' as const },
  inactive: { label: 'Inativo', variant: 'secondary' as const },
  suspended: { label: 'Suspenso', variant: 'destructive' as const },
};

const LOGIN_URL = 'https://client-flourish-ai.lovable.app/auth';

const canInviteMentor = (membership: MembershipWithDetails): boolean => {
  return (
    membership.role === 'mentor' &&
    membership.status === 'active' &&
    !!membership.profile?.email &&
    !!membership.tenant?.name
  );
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<MembershipWithDetails | null>(null);
  
  const { tenants } = useTenants();
  const { realMembership } = useTenant();
  const { startImpersonation, isImpersonating } = useImpersonation();
  const { memberships, isLoading, updateMembershipRole, updateMembershipStatus, toggleImpersonation } = useMemberships(
    tenantFilter !== 'all' ? tenantFilter : undefined
  );

  const filteredMemberships = memberships.filter((m) => {
    const matchesSearch = 
      m.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.tenant?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (membership: MembershipWithDetails, newRole: MembershipWithDetails['role']) => {
    updateMembershipRole.mutate({ id: membership.id, role: newRole });
  };

  const handleStatusToggle = (membership: MembershipWithDetails) => {
    const newStatus = membership.status === 'active' ? 'suspended' : 'active';
    updateMembershipStatus.mutate({ id: membership.id, status: newStatus });
  };

  const handleImpersonationToggle = (membership: MembershipWithDetails) => {
    toggleImpersonation.mutate({ id: membership.id, canImpersonate: !membership.can_impersonate });
  };

  const handleStartImpersonation = async (membership: MembershipWithDetails) => {
    if (!membership.can_impersonate) {
      toast.error('Este usuário não tem permissão para ser impersonado. Ative a opção primeiro.');
      return;
    }
    
    if (membership.role === 'master_admin') {
      toast.error('Não é possível impersonar um Master Admin');
      return;
    }

    if (!realMembership) {
      toast.error('Erro: Membership do admin não encontrado');
      return;
    }

    await startImpersonation(membership, realMembership.id);
  };

  const handleInviteMentor = (membership: MembershipWithDetails) => {
    if (!canInviteMentor(membership)) {
      toast.error('Não é possível convidar este usuário. Verifique se é um mentor ativo com email e tenant válidos.');
      return;
    }
    setSelectedMembership(membership);
    setInviteModalOpen(true);
  };

  const handleCopyLoginLink = async () => {
    try {
      await navigator.clipboard.writeText(LOGIN_URL);
      toast.success('Link de acesso copiado!');
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  // Stats
  const stats = {
    total: memberships.length,
    active: memberships.filter(m => m.status === 'active').length,
    admins: memberships.filter(m => ['master_admin', 'admin'].includes(m.role)).length,
    mentors: memberships.filter(m => m.role === 'mentor').length,
    mentees: memberships.filter(m => m.role === 'mentee').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-100">Gestão de Usuários</h1>
          <p className="text-slate-400">Gerencie todos os memberships da plataforma</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
            <div className="text-sm text-slate-400">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            <div className="text-sm text-slate-400">Ativos</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-400">{stats.admins}</div>
            <div className="text-sm text-slate-400">Admins</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.mentors}</div>
            <div className="text-sm text-slate-400">Mentores</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-300">{stats.mentees}</div>
            <div className="text-sm text-slate-400">Mentorados</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Users className="h-5 w-5" />
                Memberships ({filteredMemberships.length})
              </CardTitle>
              <CardDescription className="text-slate-400">
                Lista de todos os usuários e seus papéis
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Buscar usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-slate-900/50 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tenants</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-slate-900/50 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Papéis</SelectItem>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-slate-700/50" />
              ))}
            </div>
          ) : filteredMemberships.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-slate-800/30">
                    <TableHead className="text-slate-400 w-12"></TableHead>
                    <TableHead className="text-slate-400">Usuário</TableHead>
                    <TableHead className="text-slate-400">Tenant</TableHead>
                    <TableHead className="text-slate-400">Papel</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 text-center">Impersonate</TableHead>
                    <TableHead className="text-slate-400">Desde</TableHead>
                    <TableHead className="text-slate-400 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMemberships.map((membership) => {
                    const role = roleConfig[membership.role] || roleConfig.mentee;
                    const status = statusConfig[membership.status as keyof typeof statusConfig] || statusConfig.active;
                    
                    return (
                      <TableRow key={membership.id} className="border-slate-700/50 hover:bg-slate-800/30">
                        <TableCell>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={membership.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                              {membership.profile?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-100">
                              {membership.profile?.full_name || 'Sem nome'}
                            </div>
                            <div className="text-sm text-slate-500">
                              {membership.profile?.email || 'Sem email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-slate-300">{membership.tenant?.name || '-'}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {membership.tenant?.slug || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.variant} className="gap-1">
                            <span className={`w-2 h-2 rounded-full ${role.color}`} />
                            {role.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={membership.can_impersonate || false}
                            onCheckedChange={() => handleImpersonationToggle(membership)}
                            disabled={membership.role === 'master_admin'}
                          />
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {format(new Date(membership.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              {membership.role === 'mentor' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleInviteMentor(membership)}
                                    className="text-slate-300 focus:text-slate-100 focus:bg-slate-700"
                                    disabled={!canInviteMentor(membership)}
                                  >
                                    <MessageCircle className="mr-2 h-4 w-4 text-green-400" />
                                    Convidar (WhatsApp)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={handleCopyLoginLink}
                                    className="text-slate-300 focus:text-slate-100 focus:bg-slate-700"
                                  >
                                    <Link className="mr-2 h-4 w-4" />
                                    Copiar link de acesso
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-slate-700" />
                                </>
                              )}
                              <DropdownMenuItem 
                                className="text-slate-300 focus:text-slate-100 focus:bg-slate-700"
                                disabled={membership.role === 'master_admin'}
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                Alterar Papel
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStartImpersonation(membership)}
                                className="text-slate-300 focus:text-slate-100 focus:bg-slate-700"
                                disabled={membership.role === 'master_admin' || !membership.can_impersonate}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Impersonar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-700" />
                              <DropdownMenuItem 
                                onClick={() => handleStatusToggle(membership)}
                                className="text-slate-300 focus:text-slate-100 focus:bg-slate-700"
                                disabled={membership.role === 'master_admin'}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                {membership.status === 'active' ? 'Suspender' : 'Ativar'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteMentorModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        membership={selectedMembership}
      />
    </div>
  );
}
