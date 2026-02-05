import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useTenants } from '@/hooks/useTenants';
import { useCreateMembership } from '@/hooks/useCreateMembership';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, UserPlus, MessageCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CreateMenteeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** If provided, tenant selector will be hidden and this tenant will be used */
  tenantId?: string;
}

export function CreateMenteeModal({ open, onOpenChange, onSuccess, tenantId: propTenantId }: CreateMenteeModalProps) {
  const { activeMembership, isMasterAdmin } = useTenant();
  const { tenants, isLoading: tenantsLoading } = useTenants();
  const createMembership = useCreateMembership();
  
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showWhatsAppMessage, setShowWhatsAppMessage] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [createdInvite, setCreatedInvite] = useState<{
    full_name: string;
    email: string;
    tenant_name: string;
    login_url: string;
  } | null>(null);

  // Determine if we need to show tenant selector
  const showTenantSelector = isMasterAdmin && !propTenantId && !activeMembership?.tenant_id;
  
  // Get effective tenant_id
  const effectiveTenantId = propTenantId || selectedTenantId || activeMembership?.tenant_id;

  const resetForm = () => {
    setSelectedTenantId('');
    setFullName('');
    setEmail('');
    setPhone('');
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

    // Get tenant name for the message
    const selectedTenant = tenants.find(t => t.id === effectiveTenantId);
    const tenantName = selectedTenant?.name || 'LBV TECH';

    try {
      await createMembership.mutateAsync({
        tenant_id: effectiveTenantId,
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role: 'mentee',
      });

      // Use local data for WhatsApp message (more secure - backend returns minimal data)
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
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
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

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">Telefone WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11999999999"
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
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
                disabled={createMembership.isPending || !email || !fullName || (showTenantSelector && !selectedTenantId)}
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
              <p className="text-green-400 font-medium">
                Convite criado com sucesso!
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {createdInvite?.email}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Mensagem de Convite</Label>
              <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {getWhatsAppMessage()}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCopyMessage}
                className="flex-1 border-slate-700 text-slate-300"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
              <Button
                onClick={handleOpenWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full text-slate-400"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
