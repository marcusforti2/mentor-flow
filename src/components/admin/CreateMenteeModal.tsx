import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useTenants } from '@/hooks/useTenants';
import { useCreateMembership } from '@/hooks/useCreateMembership';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, MessageCircle, Copy, Check, CalendarIcon, ChevronDown, Instagram, Linkedin, Globe, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MentorOption {
  membership_id: string;
  full_name: string;
  email: string;
}

interface CreateMenteeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  tenantId?: string;
}

export function CreateMenteeModal({ open, onOpenChange, onSuccess, tenantId: propTenantId }: CreateMenteeModalProps) {
  const { activeMembership, isMasterAdmin } = useTenant();
  const { tenants, isLoading: tenantsLoading } = useTenants();
  const createMembership = useCreateMembership();
  
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joinedAt, setJoinedAt] = useState<Date | undefined>(undefined);
  const [businessName, setBusinessName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [installments, setInstallments] = useState('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [socialOpen, setSocialOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [showWhatsAppMessage, setShowWhatsAppMessage] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [createdInvite, setCreatedInvite] = useState<{
    full_name: string;
    email: string;
    tenant_name: string;
    login_url: string;
  } | null>(null);

  const effectiveTenantForMentors = propTenantId || selectedTenantId || (isMasterAdmin ? undefined : activeMembership?.tenant_id);

  // Fetch mentors when tenant changes or modal opens
  useEffect(() => {
    const fetchMentors = async () => {
      if (!effectiveTenantForMentors || !open) {
        if (!open) return;
        setMentorOptions([]);
        return;
      }
      
      setMentorsLoading(true);
      try {
        const { data, error } = await supabase
          .from('memberships')
          .select('id, user_id, tenant_id')
          .eq('tenant_id', effectiveTenantForMentors)
          .eq('role', 'mentor')
          .eq('status', 'active');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const userIds = data.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);
          
          const options: MentorOption[] = data.map(m => {
            const profile = profiles?.find(p => p.user_id === m.user_id);
            return {
              membership_id: m.id,
              full_name: profile?.full_name || 'Sem nome',
              email: profile?.email || '',
            };
          });
          setMentorOptions(options);
          
          if (options.length === 1) {
            setSelectedMentorId(options[0].membership_id);
          }
        } else {
          setMentorOptions([]);
        }
      } catch (err) {
        console.error('[CreateMenteeModal] Error fetching mentors:', err);
        setMentorOptions([]);
      } finally {
        setMentorsLoading(false);
      }
    };
    
    fetchMentors();
  }, [effectiveTenantForMentors, open]);

  const showTenantSelector = isMasterAdmin && !propTenantId;
  const effectiveTenantId = propTenantId || selectedTenantId || (isMasterAdmin ? undefined : activeMembership?.tenant_id);

  const resetForm = () => {
    setSelectedTenantId('');
    setSelectedMentorId('');
    setFullName('');
    setEmail('');
    setPhone('');
    setJoinedAt(undefined);
    setBusinessName('');
    setInstagram('');
    setLinkedin('');
    setWebsite('');
    setNotes('');
    setInvestmentAmount('');
    setMonthlyAmount('');
    setInstallments('');
    setNegotiationNotes('');
    setSocialOpen(false);
    setBusinessOpen(false);
    setShowWhatsAppMessage(false);
    setCreatedInvite(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!effectiveTenantId || !email || !fullName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!selectedMentorId) {
      toast.error('Selecione o mentor responsável');
      return;
    }

    const selectedTenant = tenants.find(t => t.id === effectiveTenantId);
    const tenantName = selectedTenant?.name || 'MentorFlow.io';

    try {
      const result = await createMembership.mutateAsync({
        tenant_id: effectiveTenantId,
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role: 'mentee',
        mentor_membership_id: selectedMentorId,
        joined_at: joinedAt ? joinedAt.toISOString() : undefined,
        business_name: businessName.trim() || undefined,
        instagram: instagram.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Save investment if provided
      if (investmentAmount && parseFloat(investmentAmount) > 0 && result?.membership_id) {
        const installmentsNum = installments ? parseInt(installments) : null;
        const monthlyAmountCents = monthlyAmount ? Math.round(parseFloat(monthlyAmount) * 100) : null;
        await supabase.from('program_investments').insert({
          membership_id: result.membership_id,
          tenant_id: effectiveTenantId,
          investment_amount_cents: Math.round(parseFloat(investmentAmount) * 100),
          installments: installmentsNum,
          monthly_amount_cents: monthlyAmountCents,
          negotiation_notes: negotiationNotes.trim() || null,
        });
      }

      setCreatedInvite({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        tenant_name: tenantName,
        login_url: `${window.location.origin}/auth`,
      });
      setShowWhatsAppMessage(true);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getWhatsAppMessage = () => {
    if (!createdInvite) return '';
    return `Olá, ${createdInvite.full_name}! 🎉

Seu acesso ao programa *${createdInvite.tenant_name}* está liberado!

📧 Email de login: ${createdInvite.email}
🔗 Link: ${createdInvite.login_url}

Acesse o link acima, digite seu email e confirme com o código que chegará no seu email.

Estou aqui para ajudar! 🚀`;
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(getWhatsAppMessage());
      setCopied(true);
      toast.success('Mensagem copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent(getWhatsAppMessage());
    const phoneNumber = phone.replace(/\D/g, '');
    const url = phoneNumber 
      ? `https://wa.me/55${phoneNumber}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <UserPlus className="h-5 w-5 text-primary" />
            {showWhatsAppMessage ? 'Convite Criado!' : 'Adicionar Mentorado'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {showWhatsAppMessage 
              ? 'Envie a mensagem de convite para o mentorado'
              : 'Crie um convite para um novo mentorado'
            }
          </DialogDescription>
        </DialogHeader>

        {!showWhatsAppMessage ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {showTenantSelector && (
              <div className="space-y-2">
                <Label htmlFor="tenant" className="text-slate-200">Programa (Tenant) *</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId} required>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Selecione o programa" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantsLoading ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : (
                      tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mentor" className="text-slate-200">Mentor Responsável *</Label>
              <Select value={selectedMentorId} onValueChange={setSelectedMentorId} required>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder={mentorsLoading ? "Carregando mentores..." : "Selecione o mentor"} />
                </SelectTrigger>
                <SelectContent>
                  {mentorsLoading ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : mentorOptions.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum mentor neste programa</SelectItem>
                  ) : (
                    mentorOptions.map((mentor) => (
                      <SelectItem key={mentor.membership_id} value={mentor.membership_id}>
                        {mentor.full_name} ({mentor.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-200">Nome Completo *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do mentorado"
                className="bg-slate-800 border-slate-700 text-slate-100"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-slate-800 border-slate-700 text-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-200">WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="11999999999"
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Data de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-slate-800 border-slate-700",
                        !joinedAt && "text-slate-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {joinedAt ? format(joinedAt, 'dd/MM/yyyy', { locale: ptBR }) : 'Hoje'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={joinedAt}
                      onSelect={setJoinedAt}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Collapsible: Redes Sociais */}
            <Collapsible open={socialOpen} onOpenChange={setSocialOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full justify-between text-slate-300 hover:text-slate-100 px-2 h-9">
                  <span className="flex items-center gap-2 text-sm">
                    <Instagram className="h-4 w-4" />
                    Redes Sociais
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", socialOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-xs">Instagram</Label>
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@usuario"
                    className="bg-slate-800 border-slate-700 text-slate-100 h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-xs">LinkedIn</Label>
                  <Input
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/usuario"
                    className="bg-slate-800 border-slate-700 text-slate-100 h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-xs">Site / Portfolio</Label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://meusite.com"
                    className="bg-slate-800 border-slate-700 text-slate-100 h-9"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible: Negócio */}
            <Collapsible open={businessOpen} onOpenChange={setBusinessOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full justify-between text-slate-300 hover:text-slate-100 px-2 h-9">
                  <span className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" />
                    Negócio
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", businessOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-xs">Empresa / Negócio</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Nome da empresa"
                    className="bg-slate-800 border-slate-700 text-slate-100 h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-xs">Observações</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anotações sobre o mentorado..."
                    className="bg-slate-800 border-slate-700 text-slate-100 min-h-[60px]"
                  />
                </div>
            </CollapsibleContent>
            </Collapsible>

            {/* Investimento do Programa */}
            <div className="space-y-3 rounded-xl border border-border/50 p-3 bg-muted/10">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">💰 Investimento</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-200 text-xs">Valor Total (R$)</Label>
                  <Input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    placeholder="Ex: 110000"
                    className="bg-slate-800 border-slate-700 text-slate-100 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-200 text-xs">Valor Mensal (R$)</Label>
                  <Input
                    type="number"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                    placeholder="Ex: 11000"
                    className="bg-slate-800 border-slate-700 text-slate-100 h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-200 text-xs">Parcelas</Label>
                <Input
                  type="number"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="Ex: 10"
                  className="bg-slate-800 border-slate-700 text-slate-100 h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-200 text-xs">Observações de Negociação</Label>
                <Textarea
                  value={negotiationNotes}
                  onChange={(e) => setNegotiationNotes(e.target.value)}
                  placeholder="Condições especiais, pactos, acordos..."
                  className="bg-slate-800 border-slate-700 text-slate-100 min-h-[50px]"
                />
              </div>
              <p className="text-[10px] text-slate-500">Usado para calcular ROI e acompanhar pagamentos.</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMembership.isPending || !email || !fullName || !selectedMentorId || (showTenantSelector && !selectedTenantId)}
                className="flex-1 gradient-gold text-primary-foreground"
              >
                {createMembership.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Convite
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-400 font-medium">Convite criado com sucesso!</p>
              <p className="text-sm text-slate-400 mt-1">{createdInvite?.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Mensagem de Convite</Label>
              <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {getWhatsAppMessage()}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCopyMessage} className="flex-1 border-slate-700 text-slate-300">
                {copied ? <><Check className="mr-2 h-4 w-4" />Copiado!</> : <><Copy className="mr-2 h-4 w-4" />Copiar</>}
              </Button>
              <Button onClick={handleOpenWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
                <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
              </Button>
            </div>

            <Button variant="ghost" onClick={handleClose} className="w-full text-slate-400">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
