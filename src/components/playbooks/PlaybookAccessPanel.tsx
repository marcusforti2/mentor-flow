import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Lock, Users, UserCheck, Globe, Search, Loader2, Eye, Edit3, Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PlaybookAccessPanelProps {
  playbookId: string;
  visibility: string;
  onVisibilityChange: (v: string) => void;
  publicSlug?: string | null;
  variant?: 'sidebar' | 'sheet';
}

interface MenteeInfo {
  membership_id: string;
  full_name: string;
  email: string;
  can_view: boolean;
  can_edit: boolean;
}

const visibilityOptions = [
  { value: 'mentor_only', label: 'Somente mentor', icon: Lock, desc: 'Apenas você pode ver', color: 'text-amber-500' },
  { value: 'all_mentees', label: 'Todos mentorados', icon: Users, desc: 'Todos os mentorados do tenant', color: 'text-green-500' },
  { value: 'specific_mentees', label: 'Mentorados específicos', icon: UserCheck, desc: 'Escolha quem pode ver', color: 'text-blue-500' },
  { value: 'public', label: 'Público', icon: Globe, desc: 'Qualquer pessoa com o link', color: 'text-purple-500' },
];

export function PlaybookAccessPanel({ playbookId, visibility, onVisibilityChange, publicSlug, variant = 'sidebar' }: PlaybookAccessPanelProps) {
  const { activeMembership } = useTenant();
  const tenantId = activeMembership?.tenant_id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);

  // Fetch all mentees in the tenant
  const { data: mentees = [], isLoading: menteesLoading } = useQuery({
    queryKey: ['tenant-mentees', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase
        .from('memberships')
        .select('id, user_id, role') as any)
        .eq('tenant_id', tenantId)
        .eq('role', 'mentee')
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((m: any) => ({
        membership_id: m.id,
        full_name: m.profiles?.full_name || 'Sem nome',
        email: m.profiles?.email || '',
      }));
    },
    enabled: !!tenantId && visibility === 'specific_mentees',
  });

  // Fetch existing access rules
  const { data: accessRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['playbook-access-rules', playbookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playbook_access_rules')
        .select('*')
        .eq('playbook_id', playbookId);
      if (error) throw error;
      return data || [];
    },
    enabled: visibility === 'specific_mentees',
  });

  // Merge mentees with rules
  const menteeList: MenteeInfo[] = mentees.map((m: any) => {
    const rule = accessRules.find((r: any) => r.membership_id === m.membership_id);
    return {
      ...m,
      can_view: rule ? rule.can_view : false,
      can_edit: rule ? rule.can_edit : false,
    };
  });

  const filtered = menteeList.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.full_name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s);
  });

  const visibleCount = menteeList.filter(m => m.can_view).length;

  const handleToggleView = async (membershipId: string, currentView: boolean) => {
    setSaving(true);
    try {
      if (currentView) {
        await supabase
          .from('playbook_access_rules')
          .delete()
          .eq('playbook_id', playbookId)
          .eq('membership_id', membershipId);
      } else {
        await supabase
          .from('playbook_access_rules')
          .upsert({
            playbook_id: playbookId,
            membership_id: membershipId,
            can_view: true,
            can_edit: false,
          }, { onConflict: 'playbook_id,membership_id' });
      }
      queryClient.invalidateQueries({ queryKey: ['playbook-access-rules', playbookId] });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar acesso');
    }
    setSaving(false);
  };

  const handleToggleEdit = async (membershipId: string, currentEdit: boolean) => {
    setSaving(true);
    try {
      await supabase
        .from('playbook_access_rules')
        .upsert({
          playbook_id: playbookId,
          membership_id: membershipId,
          can_view: true,
          can_edit: !currentEdit,
        }, { onConflict: 'playbook_id,membership_id' });
      queryClient.invalidateQueries({ queryKey: ['playbook-access-rules', playbookId] });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar permissão');
    }
    setSaving(false);
  };

  const handleSelectAll = async () => {
    setSaving(true);
    try {
      const upserts = mentees.map((m: any) => ({
        playbook_id: playbookId,
        membership_id: m.membership_id,
        can_view: true,
        can_edit: false,
      }));
      if (upserts.length > 0) {
        await supabase
          .from('playbook_access_rules')
          .upsert(upserts, { onConflict: 'playbook_id,membership_id' });
      }
      queryClient.invalidateQueries({ queryKey: ['playbook-access-rules', playbookId] });
      toast.success('Todos selecionados');
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    }
    setSaving(false);
  };

  const handleDeselectAll = async () => {
    setSaving(true);
    try {
      await supabase
        .from('playbook_access_rules')
        .delete()
        .eq('playbook_id', playbookId);
      queryClient.invalidateQueries({ queryKey: ['playbook-access-rules', playbookId] });
      toast.success('Todos removidos');
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    }
    setSaving(false);
  };

  // Public link management - always available
  const publicUrl = publicSlug ? `${window.location.origin}/p/${publicSlug}` : null;

  const handleGenerateSlug = async () => {
    setGeneratingSlug(true);
    try {
      const { data: pb } = await supabase
        .from('playbooks')
        .select('title')
        .eq('id', playbookId)
        .single();
      const title = pb?.title || 'playbook';
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
      await supabase.from('playbooks').update({ public_slug: slug }).eq('id', playbookId);
      queryClient.invalidateQueries({ queryKey: ['playbook-detail', playbookId] });
      toast.success('Link público gerado!');
    } catch {
      toast.error('Erro ao gerar link');
    }
    setGeneratingSlug(false);
  };

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const isSheet = variant === 'sheet';

  return (
    <div className={`space-y-4 ${isSheet ? '' : ''}`}>
      {/* Visibility selector */}
      <div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Visibilidade</span>
        <div className="mt-2 space-y-1">
          {visibilityOptions.map(opt => {
            const Icon = opt.icon;
            const isActive = visibility === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onVisibilityChange(opt.value)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-primary/10 border border-primary/20 text-foreground'
                    : 'hover:bg-muted/50 text-muted-foreground border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? opt.color : ''}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${isActive ? 'font-medium' : ''}`}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Public Link section - ALWAYS visible regardless of visibility setting */}
      <Separator />
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" /> Link Compartilhável
        </span>

        {!publicUrl ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Gere um link público para compartilhar este playbook com qualquer pessoa, mesmo fora da plataforma.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateSlug}
              disabled={generatingSlug}
              className="w-full gap-1.5"
            >
              {generatingSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Gerar link público
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <Input value={publicUrl} readOnly className="text-xs h-8 bg-muted/50 font-mono" />
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-8 w-8 p-0"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-8 w-8 p-0"
                onClick={() => window.open(publicUrl, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {visibility === 'public'
                ? '✅ Qualquer pessoa com o link pode ver.'
                : '⚠️ Link gerado, mas a visibilidade não está em "Público". Apenas usuários com permissão poderão acessar.'}
            </p>
          </div>
        )}
      </div>

      {/* Mentee list for specific_mentees */}
      {visibility === 'specific_mentees' && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Mentorados com acesso
              </span>
              <Badge variant="secondary" className="text-xs font-mono">
                {visibleCount}/{menteeList.length}
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={handleSelectAll} disabled={saving}>
                Selecionar todos
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={handleDeselectAll} disabled={saving}>
                Limpar
              </Button>
            </div>

            {(menteesLoading || rulesLoading) ? (
              <div className="py-6 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-2">Carregando mentorados...</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {search ? 'Nenhum mentorado encontrado' : 'Nenhum mentorado ativo'}
              </p>
            ) : (
              <ScrollArea className={isSheet ? 'max-h-[400px]' : 'max-h-[280px]'}>
                <div className="space-y-1">
                  {filtered.map(mentee => (
                    <div
                      key={mentee.membership_id}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                        mentee.can_view
                          ? 'bg-primary/5 border border-primary/10'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                      onClick={() => handleToggleView(mentee.membership_id, mentee.can_view)}
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                          {getInitials(mentee.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-xs">{mentee.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{mentee.email}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={mentee.can_view}
                          onCheckedChange={() => handleToggleView(mentee.membership_id, mentee.can_view)}
                          disabled={saving}
                          className="scale-75"
                        />
                        {mentee.can_view && (
                          <button
                            onClick={() => handleToggleEdit(mentee.membership_id, mentee.can_edit)}
                            disabled={saving}
                            className={`p-1 rounded transition-colors ${mentee.can_edit ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                            title={mentee.can_edit ? 'Remover edição' : 'Permitir edição'}
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </>
      )}

      {/* Summary for other modes */}
      {visibility === 'all_mentees' && (
        <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3">
          <p className="text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 inline mr-1 text-green-500" />
            Todos os mentorados ativos podem visualizar este playbook.
          </p>
        </div>
      )}

      {visibility === 'mentor_only' && (
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
          <p className="text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
            Apenas você e outros membros da equipe podem ver.
          </p>
        </div>
      )}
    </div>
  );
}
