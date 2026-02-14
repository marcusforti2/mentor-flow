import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
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
import {
  Settings, Palette, ToggleLeft, Shield, Key,
  Save, Loader2, CheckCircle2, XCircle, Globe, Building2,
} from 'lucide-react';

// ─── Platform Settings ───────────────────────────────────────

interface PlatformSettings {
  name: string;
  slug: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
}

function PlatformSection() {
  const { tenant } = useTenant();
  const [form, setForm] = useState<PlatformSettings>({
    name: '', slug: '', logo_url: '', primary_color: '', secondary_color: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        slug: (tenant as any).slug || '',
        logo_url: tenant.logo_url || '',
        primary_color: tenant.primary_color || '',
        secondary_color: tenant.secondary_color || '',
      });
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        name: form.name,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
      })
      .eq('id', tenant.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar configurações');
    } else {
      toast.success('Configurações salvas');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-400" />
            Identidade do Tenant Principal
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configurações visuais e de marca da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome da Plataforma</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Slug</Label>
              <Input
                value={form.slug}
                disabled
                className="bg-slate-900/50 border-slate-600 text-slate-500"
              />
              <p className="text-xs text-slate-500">Slug não pode ser alterado</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">URL do Logo</Label>
            <Input
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://..."
              className="bg-slate-900/50 border-slate-600 text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Cor Primária</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  placeholder="#7c3aed"
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                />
                {form.primary_color && (
                  <div
                    className="h-9 w-9 rounded-md border border-slate-600 shrink-0"
                    style={{ backgroundColor: form.primary_color }}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Cor Secundária</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.secondary_color}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                  placeholder="#06b6d4"
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                />
                {form.secondary_color && (
                  <div
                    className="h-9 w-9 rounded-md border border-slate-600 shrink-0"
                    style={{ backgroundColor: form.secondary_color }}
                  />
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
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

function FeatureFlagsSection() {
  const { tenant } = useTenant();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant?.settings && typeof tenant.settings === 'object') {
      const settings = tenant.settings as Record<string, any>;
      const featureFlags = (settings.features as Record<string, boolean>) || {};
      // Default all to true if not set
      const resolved: Record<string, boolean> = {};
      FEATURES.forEach(f => {
        resolved[f.key] = featureFlags[f.key] !== undefined ? featureFlags[f.key] : true;
      });
      setFlags(resolved);
    } else {
      const defaults: Record<string, boolean> = {};
      FEATURES.forEach(f => { defaults[f.key] = true; });
      setFlags(defaults);
    }
  }, [tenant]);

  const toggle = (key: string) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    const currentSettings = (tenant.settings && typeof tenant.settings === 'object')
      ? tenant.settings as Record<string, any>
      : {};
    const { error } = await supabase
      .from('tenants')
      .update({ settings: { ...currentSettings, features: flags } })
      .eq('id', tenant.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar feature flags');
    } else {
      toast.success('Feature flags atualizadas');
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-amber-400" />
          Feature Flags
        </CardTitle>
        <CardDescription className="text-slate-400">
          Ative ou desative módulos da plataforma para este tenant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {FEATURES.map((feature) => (
          <div
            key={feature.key}
            className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-700/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-slate-200">{feature.label}</p>
              <p className="text-xs text-slate-500">{feature.description}</p>
            </div>
            <Switch
              checked={flags[feature.key] ?? true}
              onCheckedChange={() => toggle(feature.key)}
            />
          </div>
        ))}
        <Separator className="bg-slate-700/50 my-4" />
        <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Feature Flags
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Auth Settings ───────────────────────────────────────────

function AuthSection() {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-400" />
          Autenticação
        </CardTitle>
        <CardDescription className="text-slate-400">
          Configurações de acesso e segurança
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/30 space-y-2">
            <p className="text-sm font-medium text-slate-200">Método de Login</p>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> OTP via Email
            </Badge>
            <p className="text-xs text-slate-500">Login sem senha via código de verificação</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/30 space-y-2">
            <p className="text-sm font-medium text-slate-200">Governança</p>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Invite-Only
            </Badge>
            <p className="text-xs text-slate-500">Apenas usuários convidados podem acessar</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/30 space-y-2">
            <p className="text-sm font-medium text-slate-200">Auto-confirm Email</p>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              <XCircle className="h-3 w-3 mr-1" /> Desativado
            </Badge>
            <p className="text-xs text-slate-500">Emails precisam ser verificados</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/30 space-y-2">
            <p className="text-sm font-medium text-slate-200">OAuth / SSO</p>
            <Badge className="bg-slate-600/50 text-slate-400 border-slate-600/30">
              Não configurado
            </Badge>
            <p className="text-xs text-slate-500">Google e Apple disponíveis via Cloud</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400">
            ⚡ Para alterar configurações de auth avançadas, utilize o painel de Cloud Settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

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
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-400" />
          Integrações & API Keys
        </CardTitle>
        <CardDescription className="text-slate-400">
          Chaves de API configuradas no backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {KNOWN_SECRETS.map((secret) => {
          const isConfigured = configuredSecrets.includes(secret.name);
          return (
            <div
              key={secret.name}
              className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{secret.label}</p>
                  <p className="text-xs text-slate-500">{secret.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {secret.managed && (
                  <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                    Auto
                  </Badge>
                )}
                {isConfigured ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Configurada
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" /> Ausente
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        <Separator className="bg-slate-700/50 my-4" />

        <div className="text-xs text-slate-500">
          Total de secrets configuradas: <span className="font-bold text-slate-300">{configuredSecrets.length}</span>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-2">
          <p className="text-xs text-amber-400">
            🔒 Valores das chaves são criptografados e não podem ser visualizados. Para atualizar, use o painel de Cloud Settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Config Page ────────────────────────────────────────

export default function ConfigPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-amber-400" />
          Configurações
        </h1>
        <p className="text-slate-400 mt-1">
          Gerencie plataforma, módulos, autenticação e integrações
        </p>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
          <TabsTrigger value="platform" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <Palette className="h-4 w-4 mr-2" />
            Plataforma
          </TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <ToggleLeft className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="auth" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <Shield className="h-4 w-4 mr-2" />
            Auth
          </TabsTrigger>
          <TabsTrigger value="secrets" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <Key className="h-4 w-4 mr-2" />
            Integrações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="mt-6">
          <PlatformSection />
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <FeatureFlagsSection />
        </TabsContent>

        <TabsContent value="auth" className="mt-6">
          <AuthSection />
        </TabsContent>

        <TabsContent value="secrets" className="mt-6">
          <SecretsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}