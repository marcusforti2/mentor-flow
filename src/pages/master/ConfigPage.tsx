import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useTenants } from '@/hooks/useTenants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings, Palette, ToggleLeft, Key,
  Save, Loader2, CheckCircle2, XCircle, Globe, Building2, MessageCircle,
  Download, Database, FolderDown, RefreshCw, FileJson,
} from 'lucide-react';

const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';

// ─── Platform Settings ───────────────────────────────────────

interface PlatformSettings {
  name: string;
  slug: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
}

function PlatformSection({ tenantId }: { tenantId: string }) {
  const [form, setForm] = useState<PlatformSettings>({
    name: '', slug: '', logo_url: '', primary_color: '', secondary_color: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (data) {
        setForm({
          name: data.name || '',
          slug: data.slug || '',
          logo_url: data.logo_url || '',
          primary_color: data.primary_color || '',
          secondary_color: data.secondary_color || '',
        });
      }
    };
    fetchTenant();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        name: form.name,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
      })
      .eq('id', tenantId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar configurações');
    } else {
      toast.success('Configurações salvas');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Identidade do Tenant Principal
          </CardTitle>
          <CardDescription>
            Configurações visuais e de marca da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Plataforma</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground">Slug não pode ser alterado</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>URL do Logo</Label>
            <Input
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  placeholder="#7c3aed"
                />
                {form.primary_color && (
                  <div
                    className="h-9 w-9 rounded-md border border-border shrink-0"
                    style={{ backgroundColor: form.primary_color }}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor Secundária</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.secondary_color}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                  placeholder="#06b6d4"
                />
                {form.secondary_color && (
                  <div
                    className="h-9 w-9 rounded-md border border-border shrink-0"
                    style={{ backgroundColor: form.secondary_color }}
                  />
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Feature Flags ───────────────────────────────────────────

const FEATURES = [
  { key: 'community', label: 'Comunidade', description: 'Feed de posts e chat entre mentorados' },
  { key: 'prize_shop', label: 'Loja de Prêmios', description: 'Resgate de pontos por prêmios' },
  { key: 'ranking', label: 'Ranking', description: 'Leaderboard de gamificação entre mentorados' },
  { key: 'meetings_mentee', label: 'Reuniões (Mentorado)', description: 'Visualização de reuniões pelo mentorado' },
  { key: 'ai_tools', label: 'Ferramentas de IA', description: 'Acesso às ferramentas de IA pelo mentorado' },
  { key: 'crm_mentee', label: 'CRM (Mentorado)', description: 'CRM de prospecção para mentorados' },
  { key: 'email_marketing', label: 'Email Marketing', description: 'Módulo de automação de emails' },
  { key: 'sos_center', label: 'Centro SOS', description: 'Canal de suporte urgente' },
];

function FeatureFlagsSection({ tenantId }: { tenantId: string }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [tenantSettings, setTenantSettings] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('tenants').select('settings').eq('id', tenantId).single();
      const settings = (data?.settings && typeof data.settings === 'object') ? data.settings as Record<string, any> : {};
      setTenantSettings(settings);
      const featureFlags = (settings.features as Record<string, boolean>) || {};
      const resolved: Record<string, boolean> = {};
      FEATURES.forEach(f => {
        resolved[f.key] = featureFlags[f.key] !== undefined ? featureFlags[f.key] : true;
      });
      setFlags(resolved);
    };
    fetchSettings();
  }, [tenantId]);

  const toggle = (key: string) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    const currentSettings = tenantSettings || {};
    const { error } = await supabase
      .from('tenants')
      .update({ settings: { ...currentSettings, features: flags } })
      .eq('id', tenantId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar feature flags');
    } else {
      toast.success('Feature flags atualizadas');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-primary" />
          Feature Flags
        </CardTitle>
        <CardDescription>
          Ative ou desative módulos da plataforma para este tenant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {FEATURES.map((feature) => (
          <div
            key={feature.key}
            className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{feature.label}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
            <Switch
              checked={flags[feature.key] ?? true}
              onCheckedChange={() => toggle(feature.key)}
            />
          </div>
        ))}
        <Separator className="my-4" />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Feature Flags
        </Button>
      </CardContent>
    </Card>
  );
}

// Auth section removed — static display, not actionable

// ─── Secrets / Integrations ──────────────────────────────────

const KNOWN_SECRETS = [
  { name: 'RESEND_API_KEY', label: 'Resend (Email)', description: 'Envio de emails transacionais e campanhas' },
  { name: 'APIFY_API_KEY', label: 'Apify', description: 'Web scraping e automação' },
  { name: 'FIRECRAWL_API_KEY', label: 'Firecrawl', description: 'Extração de dados web' },
  { name: 'LOVABLE_API_KEY', label: 'Lovable AI', description: 'Processamento de IA (gerenciado automaticamente)', managed: true },
  { name: 'PILOTERR_API_KEY', label: 'Piloterr', description: 'Análise de perfis sociais' },
];

function SecretsSection() {
  const configuredSecrets = [
    'APIFY_API_KEY', 'FIRECRAWL_API_KEY', 'LOVABLE_API_KEY',
    'PILOTERR_API_KEY', 'PILOTERR_API_KEY_2', 'PILOTERR_API_KEY_3',
    'PILOTERR_API_KEY_4', 'PILOTERR_API_KEY_5', 'RESEND_API_KEY',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Integrações & API Keys
        </CardTitle>
        <CardDescription>
          Chaves de API configuradas no backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {KNOWN_SECRETS.map((secret) => {
          const isConfigured = configuredSecrets.includes(secret.name);
          return (
            <div
              key={secret.name}
              className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{secret.label}</p>
                  <p className="text-xs text-muted-foreground">{secret.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {secret.managed && (
                  <Badge variant="outline" className="text-xs">
                    Auto
                  </Badge>
                )}
                {isConfigured ? (
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Configurada
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" /> Ausente
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        <Separator className="my-4" />

        <div className="text-xs text-muted-foreground">
          Total de secrets configuradas: <span className="font-bold text-foreground">{configuredSecrets.length}</span>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-2">
          <p className="text-xs text-amber-600">
            🔒 Valores das chaves são criptografados e não podem ser visualizados. Para atualizar, use o painel de Cloud Settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── WhatsApp Config per Tenant ──────────────────────────────

function WhatsAppConfigSection({ tenantId }: { tenantId: string }) {
  const [form, setForm] = useState({
    ultramsg_instance_id: '',
    ultramsg_token: '',
    is_active: false,
    sender_name: '',
  });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('tenant_whatsapp_config' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setExistingId(d.id);
        setForm({
          ultramsg_instance_id: d.ultramsg_instance_id || '',
          ultramsg_token: '', // Never load token into form — it stays on server
          is_active: d.is_active || false,
          sender_name: d.sender_name || '',
        });
      } else {
        setExistingId(null);
        setForm({ ultramsg_instance_id: '', ultramsg_token: '', is_active: false, sender_name: '' });
      }
      setLoading(false);
    };
    fetchConfig();
  }, [tenantId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build update payload — only include token if user typed a new one
      const payload: Record<string, any> = {
        ultramsg_instance_id: form.ultramsg_instance_id || null,
        is_active: form.is_active,
        sender_name: form.sender_name || null,
      };
      // Only update token if a new value was entered
      if (form.ultramsg_token.trim()) {
        payload.ultramsg_token = form.ultramsg_token;
      }

      if (existingId) {
        const { error } = await supabase
          .from('tenant_whatsapp_config' as any)
          .update(payload as any)
          .eq('id', existingId);
        if (error) throw error;
      } else {
        if (!form.ultramsg_token.trim()) {
          toast.error('Token é obrigatório para nova configuração');
          setSaving(false);
          return;
        }
        const { error } = await supabase.from('tenant_whatsapp_config' as any).insert({
          tenant_id: tenantId,
          ...payload,
        } as any);
        if (error) throw error;
      }
      toast.success('Configuração WhatsApp salva!');
      // Re-fetch to get the id
      const { data } = await supabase
        .from('tenant_whatsapp_config' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (data) setExistingId((data as any).id);
      // Clear token field after save
      setForm(f => ({ ...f, ultramsg_token: '' }));
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-500" />
          Configuração WhatsApp (UltraMsg)
        </CardTitle>
        <CardDescription>
          Configure as credenciais do UltraMsg para este tenant.
          Acesse{' '}
          <a href="https://ultramsg.com" target="_blank" rel="noopener" className="text-primary underline">
            ultramsg.com
          </a>{' '}
          para criar sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Instance ID</Label>
            <Input
              placeholder="Ex: instance12345"
              value={form.ultramsg_instance_id}
              onChange={(e) => setForm((f) => ({ ...f, ultramsg_instance_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Token</Label>
            <Input
              type="password"
              placeholder={existingId ? "••••••••(salvo) — digite para substituir" : "Seu token UltraMsg"}
              value={form.ultramsg_token}
              onChange={(e) => setForm((f) => ({ ...f, ultramsg_token: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Nome do Remetente (opcional)</Label>
          <Input
            placeholder="Ex: Mentoria Premium"
            value={form.sender_name}
            onChange={(e) => setForm((f) => ({ ...f, sender_name: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_active}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />
          <Label>Integração ativa</Label>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Configuração
          </Button>
          {existingId && form.is_active && (
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Ativa
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Backup Section ──────────────────────────────────────────

function BackupSection() {
  const [running, setRunning] = useState(false);
  const [backups, setBackups] = useState<{ name: string; created_at: string }[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoadingList(true);
    const { data, error } = await supabase.storage
      .from('data-backups')
      .list('', { limit: 50, sortBy: { column: 'name', order: 'desc' } });
    if (!error && data) {
      setBackups(data.filter(f => f.name.startsWith('backup-')).map(f => ({
        name: f.name,
        created_at: f.name.replace('backup-', '').replace(/_/g, ' '),
      })));
    }
    setLoadingList(false);
  };

  useEffect(() => { fetchBackups(); }, []);

  const runBackup = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-backup');
      if (error) throw error;
      toast.success(`Backup concluído! ${data.total_rows} registros em ${data.total_tables} tabelas.`);
      fetchBackups();
    } catch (err: any) {
      toast.error('Erro ao executar backup: ' + (err.message || 'Erro'));
    }
    setRunning(false);
  };

  const downloadBackup = async (folderName: string) => {
    setDownloading(folderName);
    try {
      // List files in the folder
      const { data: files, error } = await supabase.storage
        .from('data-backups')
        .list(folderName, { limit: 100 });
      if (error || !files) throw new Error('Erro ao listar arquivos');

      // Download each file and create a combined JSON
      const allData: Record<string, unknown> = {};
      for (const file of files) {
        const { data: blob, error: dlErr } = await supabase.storage
          .from('data-backups')
          .download(`${folderName}/${file.name}`);
        if (!dlErr && blob) {
          const text = await blob.text();
          try {
            allData[file.name.replace('.json', '')] = JSON.parse(text);
          } catch { allData[file.name] = text; }
        }
      }

      // Trigger browser download
      const jsonStr = JSON.stringify(allData, null, 2);
      const downloadBlob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download concluído!');
    } catch (err: any) {
      toast.error('Erro no download: ' + (err.message || 'Erro'));
    }
    setDownloading(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Backup de Dados
        </CardTitle>
        <CardDescription>
          Exporte todas as tabelas críticas como JSON. Backups automáticos rodam todo domingo às 3h UTC.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button onClick={runBackup} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FolderDown className="h-4 w-4 mr-2" />}
            {running ? 'Executando backup...' : 'Executar Backup Agora'}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchBackups} disabled={loadingList}>
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Backups disponíveis</p>
          {loadingList ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum backup encontrado</p>
          ) : (
            <div className="space-y-1">
              {backups.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono text-foreground">{b.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadBackup(b.name)}
                    disabled={downloading === b.name}
                  >
                    {downloading === b.name ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Baixar tudo
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Config Page ────────────────────────────────────────

export default function ConfigPage() {
  const { tenants, isLoading: tenantsLoading } = useTenants();
  const { tenant: contextTenant } = useTenant();
  
  const availableTenants = tenants.filter(t => t.id !== SANDBOX_TENANT_ID);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // Default to context tenant or first available
  useEffect(() => {
    if (!selectedTenantId && availableTenants.length > 0) {
      const defaultId = contextTenant?.id && availableTenants.some(t => t.id === contextTenant.id)
        ? contextTenant.id
        : availableTenants[0].id;
      setSelectedTenantId(defaultId);
    }
  }, [availableTenants, contextTenant, selectedTenantId]);

  const selectedTenantName = availableTenants.find(t => t.id === selectedTenantId)?.name;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie plataforma, módulos, autenticação e integrações
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Label className="text-xs text-muted-foreground mb-1 block">Configurando tenant:</Label>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger>
              <SelectValue placeholder={tenantsLoading ? 'Carregando...' : 'Selecione um tenant'} />
            </SelectTrigger>
            <SelectContent>
              {availableTenants.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTenantId ? (
        <Tabs defaultValue="platform" className="w-full">
          <TabsList className="p-1">
            <TabsTrigger value="platform" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Palette className="h-4 w-4 mr-2" />
              Plataforma
            </TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <ToggleLeft className="h-4 w-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="secrets" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Key className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-500">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="backup" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Database className="h-4 w-4 mr-2" />
              Backup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="mt-6">
            <PlatformSection tenantId={selectedTenantId} />
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <FeatureFlagsSection tenantId={selectedTenantId} />
          </TabsContent>

          <TabsContent value="secrets" className="mt-6">
            <SecretsSection />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6">
            <WhatsAppConfigSection tenantId={selectedTenantId} />
          </TabsContent>

          <TabsContent value="backup" className="mt-6">
            <BackupSection />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Selecione um tenant para configurar</p>
        </div>
      )}
    </div>
  );
}
