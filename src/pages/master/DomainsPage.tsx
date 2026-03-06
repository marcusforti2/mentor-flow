import { useState } from 'react';
import { useTenants } from '@/hooks/useTenants';
import { useTenantDomains, type TenantDomain } from '@/hooks/useTenantDomains';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Building2, Globe, Plus, Trash2, RefreshCw, Star, Copy, CheckCircle2,
  AlertTriangle, Clock, XCircle, Loader2, ExternalLink, ArrowRight, ArrowLeft,
  Check, Settings, Rocket
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const WIZARD_STEPS = [
  { key: 'domain', title: 'Domínio', description: 'Informe o domínio do cliente' },
  { key: 'lovable', title: 'Registrar no Lovable', description: 'Adicione nas Settings do projeto' },
  { key: 'dns', title: 'Configurar DNS', description: 'Cliente aponta os registros' },
  { key: 'verify', title: 'Verificar', description: 'Confirmar propagação' },
];

export default function DomainsPage() {
  const { tenants, isLoading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [newDomain, setNewDomain] = useState('');
  const [addedDomain, setAddedDomain] = useState<TenantDomain | null>(null);

  const filteredTenants = tenants.filter(t => t.id !== SANDBOX_TENANT_ID);
  const selectedTenant = filteredTenants.find(t => t.id === selectedTenantId);

  const { domains, isLoading, addDomain, removeDomain, setPrimary, verifyDomain } = useTenantDomains(selectedTenantId);

  const openWizard = () => {
    setNewDomain('');
    setAddedDomain(null);
    setWizardStep(0);
    setWizardOpen(true);
  };

  const handleWizardAdd = () => {
    if (!newDomain.trim()) return;
    addDomain.mutate({ domain: newDomain, isPrimary: domains.length === 0 }, {
      onSuccess: (data) => {
        setAddedDomain(data);
        setWizardStep(1);
      },
    });
  };

  const handleWizardVerify = () => {
    if (!addedDomain) return;
    verifyDomain.mutate(addedDomain.id, {
      onSuccess: (data) => {
        if (data?.status === 'active') {
          setWizardStep(4); // done!
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const projectSettingsUrl = `https://lovable.dev/projects/${import.meta.env.VITE_SUPABASE_PROJECT_ID ? '' : ''}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Gerenciador de Domínios</h1>
          <p className="text-muted-foreground">Configure domínios customizados para cada tenant do SaaS</p>
        </div>
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
          {/* Quick Action - Add Domain Wizard */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Rocket className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Conectar novo domínio</h3>
                    <p className="text-sm text-muted-foreground">Wizard guiado em 4 etapas para configurar tudo</p>
                  </div>
                </div>
                <Button onClick={openWizard} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Iniciar Setup
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Domain List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domínios de {selectedTenant.name}
                <Badge variant="secondary" className="ml-auto">{domains.length}</Badge>
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
                  <Button variant="link" onClick={openWizard} className="mt-2 gap-1">
                    <Plus className="h-3 w-3" /> Adicionar primeiro domínio
                  </Button>
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

      {/* ===== WIZARD DIALOG ===== */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Configurar Domínio — {selectedTenant?.name}
            </DialogTitle>
            <DialogDescription>
              Siga as etapas para conectar o domínio do cliente
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-1 py-2">
            {WIZARD_STEPS.map((step, i) => {
              const isCompleted = wizardStep > i || wizardStep === 4;
              const isCurrent = wizardStep === i;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all shrink-0",
                    isCompleted ? "bg-primary text-primary-foreground" :
                    isCurrent ? "bg-primary/20 text-primary border-2 border-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < WIZARD_STEPS.length - 1 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-1 transition-colors",
                      wizardStep > i ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="min-h-[200px] py-2">
            {/* Step 0: Domain Input */}
            {wizardStep === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Domínio do cliente</label>
                  <p className="text-xs text-muted-foreground mb-2">Ex: sistema.empresa.com.br ou app.empresa.com</p>
                  <Input
                    placeholder="meucliente.com.br"
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleWizardAdd()}
                    autoFocus
                  />
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p>💡 <strong>Dica:</strong> Use um subdomínio como <code>sistema.empresa.com.br</code> para facilitar o apontamento DNS.</p>
                  <p>O domínio raiz (empresa.com.br) também funciona.</p>
                </div>
              </div>
            )}

            {/* Step 1: Register in Lovable Settings */}
            {wizardStep === 1 && addedDomain && (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Settings className="h-4 w-4 text-primary" />
                    Registre o domínio nas Settings do projeto
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Abra as <strong>Settings → Domains</strong> do projeto Lovable e adicione:
                  </p>
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 font-mono text-sm">
                    <span className="font-bold text-primary flex-1">{addedDomain.domain}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(addedDomain.domain)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Também adicione <strong>www.{addedDomain.domain}</strong> se desejado.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    // Open project settings - user needs to do this in Lovable UI
                    toast.info('Abra as Settings do projeto Lovable → Domains e adicione o domínio listado acima.');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Settings do Projeto (Lovable)
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Após adicionar, clique em "Próximo" para continuar
                </p>
              </div>
            )}

            {/* Step 2: DNS Instructions */}
            {wizardStep === 2 && addedDomain && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Envie estas instruções para o cliente configurar no provedor de DNS:
                </p>

                <div className="space-y-2">
                  {/* A record @ */}
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-3 font-mono text-xs">
                    <div>
                      <span className="text-muted-foreground">A</span> &nbsp;
                      <span className="font-semibold">@</span> → <span className="font-semibold text-primary">{LOVABLE_IP}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(LOVABLE_IP)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* A record www */}
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-3 font-mono text-xs">
                    <div>
                      <span className="text-muted-foreground">A</span> &nbsp;
                      <span className="font-semibold">www</span> → <span className="font-semibold text-primary">{LOVABLE_IP}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(LOVABLE_IP)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* TXT record */}
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-3 font-mono text-xs">
                    <div>
                      <span className="text-muted-foreground">TXT</span> &nbsp;
                      <span className="font-semibold">_lovable</span> → <span className="font-semibold text-primary">lovable_verify={addedDomain.verification_token}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(`lovable_verify=${addedDomain.verification_token}`)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2 text-xs"
                  onClick={() => {
                    const msg = `📋 Configuração de Domínio\n\nConfigure os seguintes registros DNS:\n\n1. Tipo: A | Nome: @ | Valor: ${LOVABLE_IP}\n2. Tipo: A | Nome: www | Valor: ${LOVABLE_IP}\n3. Tipo: TXT | Nome: _lovable | Valor: lovable_verify=${addedDomain.verification_token}\n\n⏳ A propagação pode levar até 72h.`;
                    navigator.clipboard.writeText(msg);
                    toast.success('Instruções copiadas! Cole e envie para o cliente.');
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copiar tudo para enviar ao cliente
                </Button>

                <p className="text-xs text-muted-foreground text-center">⏳ A propagação DNS pode levar até 72h</p>
              </div>
            )}

            {/* Step 3: Verify */}
            {wizardStep === 3 && addedDomain && (
              <div className="space-y-4 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <RefreshCw className={cn("h-8 w-8 text-primary", verifyDomain.isPending && "animate-spin")} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Verificar DNS</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clique para verificar se o domínio <strong>{addedDomain.domain}</strong> já está apontando corretamente.
                  </p>
                </div>
                <Button
                  onClick={handleWizardVerify}
                  disabled={verifyDomain.isPending}
                  size="lg"
                  className="gap-2"
                >
                  {verifyDomain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Verificar Agora
                </Button>
                <p className="text-xs text-muted-foreground">
                  Não se preocupe se não passar agora. Você pode verificar depois na lista de domínios.
                </p>
              </div>
            )}

            {/* Step 4: Done! */}
            {wizardStep === 4 && addedDomain && (
              <div className="space-y-4 text-center py-4">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">Domínio Ativo! 🎉</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>{addedDomain.domain}</strong> está configurado e funcionando para <strong>{selectedTenant?.name}</strong>.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  O sistema já detecta automaticamente o tenant pelo domínio. O cliente pode acessar a plataforma em{' '}
                  <strong>https://{addedDomain.domain}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {wizardStep > 0 && wizardStep < 4 && (
                <Button variant="ghost" size="sm" onClick={() => setWizardStep(s => s - 1)} className="gap-1">
                  <ArrowLeft className="h-3 w-3" /> Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {wizardStep === 0 && (
                <Button onClick={handleWizardAdd} disabled={addDomain.isPending || !newDomain.trim()} className="gap-1">
                  {addDomain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Cadastrar <ArrowRight className="h-3 w-3" /></>}
                </Button>
              )}
              {wizardStep === 1 && (
                <Button onClick={() => setWizardStep(2)} className="gap-1">
                  Já adicionei <ArrowRight className="h-3 w-3" />
                </Button>
              )}
              {wizardStep === 2 && (
                <Button onClick={() => setWizardStep(3)} className="gap-1">
                  Próximo <ArrowRight className="h-3 w-3" />
                </Button>
              )}
              {wizardStep === 3 && (
                <Button variant="outline" onClick={() => { setWizardOpen(false); toast.info('Você pode verificar depois na lista.'); }}>
                  Fechar e verificar depois
                </Button>
              )}
              {wizardStep === 4 && (
                <Button onClick={() => setWizardOpen(false)}>
                  Concluir
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
