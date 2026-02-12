import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  Loader2,
  Mail,
  Users,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Recipient {
  membership_id: string;
  full_name: string | null;
  email: string | null;
}

interface FlowSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
  flowName: string;
  nodes: any[];
  audienceType: string;
  audienceMembershipIds: string[];
}

export default function FlowSendModal({
  open,
  onOpenChange,
  flowId,
  flowName,
  nodes,
  audienceType,
  audienceMembershipIds,
}: FlowSendModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendImmediate, setSendImmediate] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  const emailNodes = nodes.filter(n => n.type === 'email');
  const waitNodes = nodes.filter(n => n.type === 'wait');
  const hasWaitNodes = waitNodes.length > 0;

  useEffect(() => {
    if (open && activeMembership) {
      loadRecipients();
      setResult(null);
    }
  }, [open, activeMembership, audienceType, audienceMembershipIds]);

  const loadRecipients = async () => {
    if (!activeMembership) return;
    setIsLoading(true);
    try {
      const tenantId = activeMembership.tenant_id;

      if (audienceType === 'specific' && audienceMembershipIds.length > 0) {
        const { data, error } = await supabase
          .from('memberships')
          .select('id, user_id')
          .in('id', audienceMembershipIds)
          .eq('status', 'active');

        if (error) throw error;

        const userIds = data?.map(m => m.user_id) || [];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setRecipients(
          data?.map(m => ({
            membership_id: m.id,
            full_name: profileMap.get(m.user_id)?.full_name || null,
            email: profileMap.get(m.user_id)?.email || null,
          })) || []
        );
      } else {
        // All mentees in tenant
        const { data, error } = await supabase
          .from('memberships')
          .select('id, user_id')
          .eq('tenant_id', tenantId)
          .eq('role', 'mentee')
          .eq('status', 'active');

        if (error) throw error;

        const userIds = data?.map(m => m.user_id) || [];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          setRecipients(
            data?.map(m => ({
              membership_id: m.id,
              full_name: profileMap.get(m.user_id)?.full_name || null,
              email: profileMap.get(m.user_id)?.email || null,
            })) || []
          );
        } else {
          setRecipients([]);
        }
      }
    } catch (error: any) {
      console.error('Error loading recipients:', error);
      toast({ title: "Erro ao carregar destinatários", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast({ title: "Nenhum destinatário encontrado", variant: "destructive" });
      return;
    }

    setIsSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('execute-email-flow', {
        body: {
          flowId,
          immediate: sendImmediate,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult({ success: true, message: data.message || 'Emails enviados com sucesso!' });
      toast({ title: "Envio realizado!", description: data.message });
    } catch (error: any) {
      console.error('Error sending flow:', error);
      setResult({ success: false, message: error.message });
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const recipientsWithEmail = recipients.filter(r => r.email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Fluxo: {flowName}
          </DialogTitle>
          <DialogDescription>
            Confirme o envio para os destinatários selecionados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{emailNodes.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Email(s) no fluxo</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">
                  {isLoading ? '...' : recipientsWithEmail.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Destinatário(s)</p>
            </div>
          </div>

          {/* Send Mode Toggle */}
          {hasWaitNodes && (
            <div className="p-3 rounded-lg border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {sendImmediate ? (
                    <Zap className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-500" />
                  )}
                  <Label className="text-sm font-medium">
                    {sendImmediate ? 'Envio Imediato' : 'Respeitar Automação'}
                  </Label>
                </div>
                <Switch
                  checked={sendImmediate}
                  onCheckedChange={setSendImmediate}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {sendImmediate
                  ? 'Todos os emails serão enviados agora, ignorando as esperas do fluxo.'
                  : 'O fluxo será ativado e respeitará os tempos de espera configurados.'}
              </p>
            </div>
          )}

          {/* Recipients List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Destinatários</Label>
              <Badge variant="outline" className="text-xs">
                {audienceType === 'all' ? 'Todos os mentorados' : 'Selecionados'}
              </Badge>
            </div>
            <ScrollArea className="h-[160px] border rounded-lg p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : recipientsWithEmail.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-5 w-5 mb-2" />
                  <p className="text-sm">Nenhum destinatário com email encontrado</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recipientsWithEmail.map(r => (
                    <div key={r.membership_id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{r.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Result */}
          {result && (
            <div className={`p-3 rounded-lg border ${result.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <p className="text-sm">{result.message}</p>
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isSending || isLoading || recipientsWithEmail.length === 0 || emailNodes.length === 0}
            className="w-full gradient-gold text-primary-foreground h-12"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar {emailNodes.length} email(s) para {recipientsWithEmail.length} mentorado(s)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
