import { useState } from 'react';
import { useTenants, Tenant, TenantFormData } from '@/hooks/useTenants';
import { TenantFormSheet } from '@/components/master/TenantFormSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Plus, Search, MoreHorizontal, Pencil, Power, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  active: { label: 'Ativo', variant: 'default' as const, color: 'bg-green-500' },
  trial: { label: 'Trial', variant: 'secondary' as const, color: 'bg-yellow-500' },
  suspended: { label: 'Suspenso', variant: 'destructive' as const, color: 'bg-red-500' },
};

export default function TenantsPage() {
  const { tenants, isLoading, createTenant, updateTenant, toggleStatus } = useTenants();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setEditingTenant(null);
    setSheetOpen(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setSheetOpen(true);
  };

  const handleSubmit = (data: TenantFormData) => {
    if (editingTenant) {
      updateTenant.mutate(
        { id: editingTenant.id, data },
        { onSuccess: () => setSheetOpen(false) }
      );
    } else {
      createTenant.mutate(data, { onSuccess: () => setSheetOpen(false) });
    }
  };

  const handleToggleStatus = (tenant: Tenant) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    toggleStatus.mutate({ id: tenant.id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestão de Tenants</h1>
          <p className="text-muted-foreground">Gerencie as empresas/clientes da plataforma</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Tenants ({filteredTenants.length})
              </CardTitle>
              <CardDescription>Lista de todas as empresas cadastradas</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tenant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum tenant encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => {
                  const status = statusConfig[tenant.status as keyof typeof statusConfig] || statusConfig.active;
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={tenant.logo_url || undefined} />
                          <AvatarFallback
                            style={{ backgroundColor: tenant.primary_color || undefined }}
                            className="text-xs"
                          >
                            {tenant.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {tenant.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <span className={`w-2 h-2 rounded-full ${status.color}`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{tenant.memberships_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tenant.created_at), "dd MMM yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(tenant)}>
                              <Power className="mr-2 h-4 w-4" />
                              {tenant.status === 'active' ? 'Suspender' : 'Ativar'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TenantFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tenant={editingTenant}
        onSubmit={handleSubmit}
        isSubmitting={createTenant.isPending || updateTenant.isPending}
      />
    </div>
  );
}
