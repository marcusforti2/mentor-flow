import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
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
import { Loader2, UserPlus, MessageCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CreateMenteeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateMenteeModal({ open, onOpenChange, onSuccess }: CreateMenteeModalProps) {
  const { activeMembership } = useTenant();
  const createMembership = useCreateMembership();
  
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

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setShowWhatsAppMessage(false);
    setCreatedInvite(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeMembership?.tenant_id || !email || !fullName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const result = await createMembership.mutateAsync({
        tenant_id: activeMembership.tenant_id,
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role: 'mentee',
      });

      setCreatedInvite({
        full_name: result.invite.full_name || fullName,
        email: result.invite.email,
        tenant_name: result.tenant.name,
        login_url: result.login_url,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {showWhatsAppMessage ? 'Convite Criado!' : 'Adicionar Mentorado'}
          </DialogTitle>
          <DialogDescription>
            {showWhatsAppMessage 
              ? 'Envie a mensagem de convite para o mentorado'
              : 'Crie um convite para um novo mentorado'
            }
          </DialogDescription>
        </DialogHeader>

        {!showWhatsAppMessage ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do mentorado"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11999999999"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMembership.isPending || !email || !fullName}
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
              <p className="text-sm text-muted-foreground mt-1">
                {createdInvite?.email}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mensagem de Convite</Label>
              <div className="bg-secondary rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {getWhatsAppMessage()}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCopyMessage}
                className="flex-1"
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
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
