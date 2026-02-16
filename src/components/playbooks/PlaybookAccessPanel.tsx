import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, Users, UserCheck, Globe, Search, Loader2, Eye, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

interface PlaybookAccessPanelProps {
  playbookId: string;
  visibility: string;
  onVisibilityChange: (v: string) => void;
}

interface MenteeInfo {
  membership_id: string;
  full_name: string;
  email: string;
  can_view: boolean;
  can_edit: boolean;
}

const visibilityOptions = [
  { value: 'mentor_only', label: 'Somente mentor', icon: Lock, desc: 'Apenas você pode ver' },
  { value: 'all_mentees', label: 'Todos mentorados', icon: Users, desc: 'Todos os mentorados do tenant' },
  { value: 'specific_mentees', label: 'Mentorados específicos', icon: UserCheck, desc: 'Escolha quem pode ver' },
  { value: 'public', label: 'Público', icon: Globe, desc: 'Qualquer pessoa com o link' },
];

export function PlaybookAccessPanel({ playbookId, visibility, onVisibilityChange }: PlaybookAccessPanelProps) {
  const { activeMembership } = useTenant();
  const tenantId = activeMembership?.tenant_id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch all mentees in the tenant
  const { data: mentees = [], isLoading: menteesLoading } = useQuery({
    queryKey: ['tenant-mentees', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('memberships')
        .select('id, user_id, role, profiles:user_id(full_name, email)')
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
        // Remove rule
        await supabase
          .from('playbook_access_rules')
          .delete()
          .eq('playbook_id', playbookId)
          .eq('membership_id', membershipId);
      } else {
        // Upsert rule
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

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Visibilidade</span>
        <Select value={visibility} onValueChange={onVisibilityChange}>
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {visibilityOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {visibilityOptions.find(o => o.value === visibility)?.desc}
        </p>
      </div>

      {/* Summary */}
      {visibility === 'specific_mentees' && (
        <Badge variant="outline" className="text-xs">
          {visibleCount} de {menteeList.length} mentorado{menteeList.length !== 1 ? 's' : ''} com acesso
        </Badge>
      )}

      {visibility === 'all_mentees' && (
        <p className="text-xs text-muted-foreground">
          Visível para: <span className="text-foreground font-medium">Todos os mentorados</span>
        </p>
      )}

      {visibility === 'mentor_only' && (
        <p className="text-xs text-muted-foreground">
          Visível para: <span className="text-foreground font-medium">Somente você</span>
        </p>
      )}

      {/* Mentee list for specific_mentees */}
      {visibility === 'specific_mentees' && (
        <div className="space-y-2">
          <Separator />

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar mentorado..."
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
            <div className="py-4 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {search ? 'Nenhum mentorado encontrado' : 'Nenhum mentorado ativo no tenant'}
            </p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1">
                {filtered.map(mentee => (
                  <div
                    key={mentee.membership_id}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      mentee.can_view ? 'bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate text-xs">{mentee.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{mentee.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleView(mentee.membership_id, mentee.can_view)}
                        disabled={saving}
                        className={`p-1 rounded transition-colors ${mentee.can_view ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                        title={mentee.can_view ? 'Remover acesso' : 'Dar acesso'}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {mentee.can_view && (
                        <button
                          onClick={() => handleToggleEdit(mentee.membership_id, mentee.can_edit)}
                          disabled={saving}
                          className={`p-1 rounded transition-colors ${mentee.can_edit ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                          title={mentee.can_edit ? 'Remover edição' : 'Permitir edição'}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
