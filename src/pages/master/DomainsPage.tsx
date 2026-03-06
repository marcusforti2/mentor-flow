import { useState } from 'react';
import { useTenants } from '@/hooks/useTenants';
import { useTenantDomains, type TenantDomain } from '@/hooks/useTenantDomains';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Globe, Plus, Trash2, RefreshCw, Star, Copy, CheckCircle2, AlertTriangle, Clock, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LOVABLE_IP = '185.158.133.1';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Ativo', color: 'bg-green-500/20 text-green-700 border-green-500/30', icon: CheckCircle2 },
  verifying: { label: 'Verificando', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', icon: Clock },
  pending: { label: 'Pendente', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  error: { label: 'Erro', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: XCircle },
  offline: { label: 'Offline', color: 'bg-orange-500/20 text-orange-700 border-orange-500/30', icon: AlertTriangle },
  removed: { label: 'Removido', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';

export default function DomainsPage() {
  const { tenants, isLoading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');

  const filteredTenants = tenants.filter(t => t.id !== SANDBOX_TENANT_ID);
  const selectedTenant = filteredTenants.find(t => t.id === selectedTenantId);

  const { domains, isLoading, addDomain, removeDomain, setPrimary, verifyDomain } = useTenantDomains(selectedTenantId);

  const handleAdd = () => {
    if (!newDomain.trim()) return;
    addDomain.mutate({ domain: newDomain, isPrimary: domains.length === 0 }, {
      onSuccess: () => setNewDomain(''),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Gerenciador de Domínios</h1>
        <p className="text-muted-foreground">Configure domínios customizados para cada tenant do SaaS</p>
      </div>

      {/* Tenant Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Selecionar Tenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTenantId || ''} onValueChange={setSelectedTenantId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um tenant..." />
            </SelectTrigger>
            <SelectContent>
              {filteredTenants.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: t.primary_color || '#666' }} />
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTenantId && selectedTenant ? (
        <>
          {/* Add Domain */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Domínio
              </CardTitle>
              <CardDescription>Cadastre o domínio customizado do cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="exemplo.com.br"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} disabled={addDomain.isPending || !newDomain.trim()}>
                  {addDomain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* DNS Instructions */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                📋 Instruções de DNS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">O cliente deve configurar os seguintes registros DNS no provedor dele:</p>
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-md bg-muted/50 p-3 font-mono text-xs">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span> <span className="font-semibold">A</span> &nbsp;|&nbsp;
                    <span className="text-muted-foreground">Nome:</span> <span className="font-semibold">@</span> &nbsp;|&nbsp;
                    <span className="text-muted-foreground">Valor:</span> <span className="font-semibold text-primary">{LOVABLE_IP}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(LOVABLE_IP)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 p-3 font-mono text-xs">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span> <span className="font-semibold">A</span> &nbsp;|&nbsp;
                    <span className="text-muted-foreground">Nome:</span> <span className="font-semibold">www</span> &nbsp;|&nbsp;
                    <span className="text-muted-foreground">Valor:</span> <span className="font-semibold text-primary">{LOVABLE_IP}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(LOVABLE_IP)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {domains.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-md bg-muted/50 p-3 font-mono text-xs">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span> <span className="font-semibold">TXT</span> &nbsp;|&nbsp;
                      <span className="text-muted-foreground">Nome:</span> <span className="font-semibold">_lovable</span> &nbsp;|&nbsp;
                      <span className="text-muted-foreground">Valor:</span> <span className="font-semibold text-primary">lovable_verify={d.verification_token}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(`lovable_verify=${d.verification_token}`)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">⏳ A propagação DNS pode levar até 72h. Clique em "Verificar" para checar o status.</p>
            </CardContent>
          </Card>

          {/* Domain List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domínios de {selectedTenant.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : domains.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum domínio cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {domains.map(d => {
                    const st = STATUS_MAP[d.status] || STATUS_MAP.pending;
                    const Icon = st.icon;
                    return (
                      <div key={d.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="h-5 w-5 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{d.domain}</span>
                              {d.is_primary && (
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary shrink-0">
                                  <Star className="h-3 w-3 mr-1" /> Primário
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${st.color}`}>{st.label}</Badge>
                              {d.dns_verified && <span className="text-xs text-green-600">DNS ✓</span>}
                              {d.ssl_active && <span className="text-xs text-green-600">SSL ✓</span>}
                              {d.error_message && <span className="text-xs text-destructive truncate max-w-[200px]">{d.error_message}</span>}
                            </div>
                            {d.last_check_at && (
                              <span className="text-xs text-muted-foreground">
                                Última verificação: {new Date(d.last_check_at).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => verifyDomain.mutate(d.id)}
                            disabled={verifyDomain.isPending}
                          >
                            {verifyDomain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Verificar
                          </Button>
                          {!d.is_primary && (
                            <Button variant="ghost" size="sm" onClick={() => setPrimary.mutate(d.id)} disabled={setPrimary.isPending}>
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Remover ${d.domain}?`)) removeDomain.mutate(d.id);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Selecione um tenant para gerenciar seus domínios</p>
        </div>
      )}
    </div>
  );
}
