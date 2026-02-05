import { useState } from 'react';
import { useTenants } from '@/hooks/useTenants';
import { useCreateMembership } from '@/hooks/useCreateMembership';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

interface CreateMentorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateMentorModal({ open, onOpenChange, onSuccess }: CreateMentorModalProps) {
  const { tenants, isLoading: tenantsLoading } = useTenants();
  const createMembership = useCreateMembership();
  
  const [tenantId, setTenantId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [openWhatsApp, setOpenWhatsApp] = useState(true);
  
  // WhatsApp message state
  const [showWhatsAppMessage, setShowWhatsAppMessage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{
    full_name: string;
    email: string;
    tenant_name: string;
    login_url: string;
  } | null>(null);

  const resetForm = () => {
    setTenantId('');
    setFullName('');
    setEmail('');
    setPhone('');
    setOpenWhatsApp(true);
    setShowWhatsAppMessage(false);
    setCreatedInvite(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId || !email || !fullName) return;

    try {
      const result = await createMembership.mutateAsync({
        tenant_id: tenantId,
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role: 'mentor',
      });

      if (openWhatsApp) {
        setCreatedInvite({
          full_name: result.invite.full_name || fullName,
          email: result.invite.email,
          tenant_name: result.tenant.name,
          login_url: result.login_url,
        });
        setShowWhatsAppMessage(true);
      } else {
        resetForm();
        onOpenChange(false);
      }
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getWhatsAppMessage = () => {
    if (!createdInvite) return '';
    return `Olá, ${createdInvite.full_name}! 🎉

Seu acesso ao programa *${createdInvite.tenant_name}* está liberado!

📧 Email de login: ${createdInvite.email}
🔗 Link: ${createdInvite.login_url}

Como entrar:
1) Acesse o link acima
2) Digite seu email
3) Você receberá um código no email
4) Digite o código e pronto!

Qualquer dúvida, me avise! 🚀`;
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
            {showWhatsAppMessage ? 'Convite Criado!' : 'Adicionar Mentor'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {showWhatsAppMessage 
              ? 'Envie a mensagem de convite para o mentor'
              : 'Crie um convite para um novo mentor acessar a plataforma'
            }
          </DialogDescription>
        </DialogHeader>

        {!showWhatsAppMessage ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="tenant" className="text-slate-200">Programa (Tenant) *</Label>
              <Select value={tenantId} onValueChange={setTenantId} required>
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

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-200">Nome Completo *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do mentor" className="bg-slate-800 border-slate-700 text-slate-100" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-slate-800 border-slate-700 text-slate-100" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">Telefone WhatsApp</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11999999999" className="bg-slate-800 border-slate-700 text-slate-100" />
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Checkbox id="openWhatsApp" checked={openWhatsApp} onCheckedChange={(checked) => setOpenWhatsApp(checked === true)} />
              <Label htmlFor="openWhatsApp" className="text-sm text-slate-300 cursor-pointer">Abrir convite WhatsApp após criar</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 border-slate-700 text-slate-300">Cancelar</Button>
              <Button type="submit" disabled={createMembership.isPending || !tenantId || !email || !fullName} className="flex-1 gradient-gold text-primary-foreground">
                {createMembership.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : <><UserPlus className="mr-2 h-4 w-4" />Criar Mentor</>}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
              <Check className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-primary font-medium">Convite criado com sucesso!</p>
              <p className="text-sm text-slate-400 mt-1">{createdInvite?.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Mensagem de Convite</Label>
              <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">{getWhatsAppMessage()}</div>
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