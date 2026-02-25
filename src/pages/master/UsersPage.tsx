import { useState } from 'react';
import { useMemberships, MembershipWithDetails } from '@/hooks/useMemberships';
import { useQueryClient } from '@tanstack/react-query';
import { useInvites, InviteWithDetails } from '@/hooks/useInvites';
import { useTenants } from '@/hooks/useTenants';
import { useTenant } from '@/contexts/TenantContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Users, Search, MoreHorizontal, UserCog, Power, Eye, MessageCircle, Link, Info, X, Trash2, UserPlus, GraduationCap, Clock, RefreshCw, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InviteMentorModal } from '@/components/admin/InviteMentorModal';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { CreateMentorModal } from '@/components/admin/CreateMentorModal';
import { CreateMenteeModal } from '@/components/admin/CreateMenteeModal';
import { toast } from 'sonner';

const roleConfig = {
  master_admin: { label: 'Master Admin', variant: 'default' as const, color: 'bg-amber-500' },
  admin: { label: 'Admin', variant: 'default' as const, color: 'bg-purple-500', hidden: true },
  ops: { label: 'Ops', variant: 'secondary' as const, color: 'bg-blue-500', hidden: true },
  mentor: { label: 'Mentor', variant: 'secondary' as const, color: 'bg-green-500' },
  mentee: { label: 'Mentorado', variant: 'outline' as const, color: 'bg-muted-foreground' },
};

const statusConfig = {
  active: { label: 'Ativo', variant: 'default' as const },
  inactive: { label: 'Inativo', variant: 'secondary' as const },
  suspended: { label: 'Suspenso', variant: 'destructive' as const },
  convidado: { label: 'Convidado', variant: 'outline' as const },
};

const LOGIN_URL = 'https://lbvtech.aceleracaoforti.online/auth';

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<MembershipWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [membershipToDelete, setMembershipToDelete] = useState<MembershipWithDetails | null>(null);
  const [createMentorOpen, setCreateMentorOpen] = useState(false);
  const [createMenteeOpen, setCreateMenteeOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [inviteToRevoke, setInviteToRevoke] = useState<InviteWithDetails | null>(null);
  
  const { tenants } = useTenants();
  const { realMembership } = useTenant();
  const { switchMembership, isImpersonating } = useTenant();
  const { memberships, isLoading, updateMembershipRole, updateMembershipStatus, toggleImpersonation, deleteMembership } = useMemberships(
    tenantFilter !== 'all' ? tenantFilter : undefined
  );
  const { invites, isLoading: invitesLoading, revokeInvite, resendInvite } = useInvites(
    tenantFilter !== 'all' ? tenantFilter : undefined
  );

  // Filter memberships
  const filteredMemberships = memberships.filter((m) => {
    const matchesSearch = 
      m.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.tenant?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'convidado' ? false : m.status === statusFilter);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filter invites
  const filteredInvites = invites.filter((i) => {
    const matchesSearch = 
      i.metadata?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      i.tenant?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || i.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || statusFilter === 'convidado';
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const hasActiveFilters = tenantFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' || search !== '';
  
  const clearFilters = () => {
    setSearch('');
    setTenantFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
  };

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
    // Master admin can impersonate anyone (except other master admins)
    const isMaster = realMembership?.role === 'master_admin';
    
    if (!isMaster && !membership.can_impersonate) {
      toast.error('Este usuário não tem permissão para ser impersonado. Ative a opção primeiro.');
      return;
    }
    
    if (membership.role === 'master_admin') {
      toast.error('Não é possível impersonar um Master Admin');
      return;
    }

    if (!realMembership) {
      // Context may be reloading — retry after a brief wait
      toast.info('Carregando contexto, tente novamente em instantes...');
      return;
    }

    try {
      await switchMembership(membership.id);
    } catch (err) {
      console.error('Impersonation error:', err);
      toast.error('Erro ao iniciar inspeção. Tente novamente.');
    }
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

  const handleDeleteClick = (membership: MembershipWithDetails) => {
    setMembershipToDelete(membership);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (membershipToDelete) {
      deleteMembership.mutate(membershipToDelete.id);
      setDeleteDialogOpen(false);
      setMembershipToDelete(null);
    }
  };

  const handleRevokeClick = (invite: InviteWithDetails) => {
    setInviteToRevoke(invite);
    setRevokeDialogOpen(true);
  };

  const handleConfirmRevoke = () => {
    if (inviteToRevoke) {
      revokeInvite.mutate(inviteToRevoke.id);
      setRevokeDialogOpen(false);
      setInviteToRevoke(null);
    }
  };

  const handleResendInvite = (invite: InviteWithDetails) => {
    resendInvite.mutate(invite.id);
  };

  const queryClient = useQueryClient();
  
  const handleRefreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['memberships'] });
    queryClient.invalidateQueries({ queryKey: ['invites'] });
    toast.success('Dados atualizados!');
  };

  // Stats - include invites count
  const stats = {
    total: memberships.length + invites.length,
    active: memberships.filter(m => m.status === 'active').length,
    convidados: invites.length,
    mentors: memberships.filter(m => m.role === 'mentor').length + invites.filter(i => i.role === 'mentor').length,
    mentees: memberships.filter(m => m.role === 'mentee').length + invites.filter(i => i.role === 'mentee').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie todos os memberships da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setCreateMenteeOpen(true)}
            variant="outline"
          >
            <GraduationCap className="mr-2 h-4 w-4" />
            Adicionar Mentorado
          </Button>
          <Button 
            onClick={() => setCreateMentorOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar Mentor
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-500">{stats.convidados}</div>
            <div className="text-sm text-muted-foreground">Convidados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.mentors}</div>
            <div className="text-sm text-muted-foreground">Mentores</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.mentees}</div>
            <div className="text-sm text-muted-foreground">Mentorados</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários ({filteredMemberships.length + filteredInvites.length})
              </CardTitle>
              <CardDescription>
                Lista de memberships ativos e convites pendentes
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tenants</SelectItem>
                  {tenants.filter(t => t.id !== 'b0000000-0000-0000-0000-000000000002').map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Papéis</SelectItem>
                  {Object.entries(roleConfig).filter(([, config]) => !(config as any).hidden).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredMemberships.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Impersonate</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Memberships */}
                  {filteredMemberships.map((membership) => {
                    const role = roleConfig[membership.role] || roleConfig.mentee;
                    const status = statusConfig[membership.status as keyof typeof statusConfig] || statusConfig.active;
                    
                    return (
                      <TableRow key={membership.id}>
                        <TableCell>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={membership.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {membership.profile?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {membership.profile?.full_name || 'Sem nome'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {membership.profile?.email || 'Sem email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-foreground">{membership.tenant?.name || '-'}</div>
                          <div className="text-xs text-muted-foreground font-mono">
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
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(membership.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedMembership(membership);
                                  setDetailModalOpen(true);
                                }}
                              >
                                <Info className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {membership.role === 'mentor' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleInviteMentor(membership)}
                                    disabled={!canInviteMentor(membership)}
                                  >
                                    <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
                                    Convidar (WhatsApp)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={handleCopyLoginLink}
                                  >
                                    <Link className="mr-2 h-4 w-4" />
                                    Copiar link de acesso
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem 
                                disabled={membership.role === 'master_admin'}
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                Alterar Papel
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStartImpersonation(membership)}
                                disabled={membership.role === 'master_admin' || (!membership.can_impersonate && realMembership?.role !== 'master_admin')}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Impersonar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleStatusToggle(membership)}
                                disabled={membership.role === 'master_admin'}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                {membership.status === 'active' ? 'Suspender' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(membership)}
                                className="text-destructive focus:text-destructive"
                                disabled={membership.role === 'master_admin'}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Pending Invites */}
                  {filteredInvites.map((invite) => {
                    const role = roleConfig[invite.role] || roleConfig.mentee;
                    
                    return (
                      <TableRow key={`invite-${invite.id}`} className="bg-amber-50/50 dark:bg-amber-950/10">
                        <TableCell>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300 text-xs">
                              <Clock className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {invite.metadata?.full_name || 'Sem nome'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {invite.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-foreground">{invite.tenant?.name || '-'}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {invite.tenant?.slug || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.variant} className="gap-1">
                            <span className={`w-2 h-2 rounded-full ${role.color}`} />
                            {role.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            Convidado
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(invite.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleResendInvite(invite)}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Renovar convite
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={handleCopyLoginLink}
                              >
                                <Link className="mr-2 h-4 w-4" />
                                Copiar link de acesso
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRevokeClick(invite)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Revogar convite
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

      <UserDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        membership={selectedMembership}
        onImpersonate={handleStartImpersonation}
        onToggleStatus={handleStatusToggle}
        onToggleImpersonation={handleImpersonationToggle}
        onInvite={handleInviteMentor}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o membership de <strong>{membershipToDelete?.profile?.full_name || 'este usuário'}</strong>?
              <br /><br />
              Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar o convite de <strong>{inviteToRevoke?.metadata?.full_name || inviteToRevoke?.email}</strong>?
              <br /><br />
              O usuário não poderá mais acessar a plataforma com este convite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateMentorModal
        open={createMentorOpen}
        onOpenChange={setCreateMentorOpen}
        onSuccess={() => {
          // Queries will be auto-invalidated by the hook
        }}
      />

      <CreateMenteeModal
        open={createMenteeOpen}
        onOpenChange={setCreateMenteeOpen}
        onSuccess={() => {
          // Queries will be auto-invalidated by the hook
        }}
      />
    </div>
  );
}
