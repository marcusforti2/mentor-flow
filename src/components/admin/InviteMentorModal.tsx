import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { MembershipWithDetails } from '@/hooks/useMemberships';

interface InviteMentorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: MembershipWithDetails | null;
}

const LOGIN_URL = 'https://lbvtech.aceleracaoforti.online/auth';

const generateMessage = (
  name: string,
  tenantName: string,
  email: string
): string => {
  return `Olá, ${name}. Seu acesso ao sistema ${tenantName} já está liberado.

Email de login: ${email}

Como entrar:
1) Acesse: ${LOGIN_URL}
2) Digite seu email
3) Você vai receber um código no email
4) Digite o código e pronto

Se não achar o código, veja spam e promoções. Se travar, me avise.`;
};

export function InviteMentorModal({ open, onOpenChange, membership }: InviteMentorModalProps) {
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [message, setMessage] = useState('');

  const mentorName = membership?.profile?.full_name || 'Mentor';
  const mentorEmail = membership?.profile?.email || '';
  const tenantName = membership?.tenant?.name || 'Sistema';

  useEffect(() => {
    if (open && membership) {
      setMessage(generateMessage(mentorName, tenantName, mentorEmail));
      setWhatsappPhone(membership.profile?.phone || '');
    }
  }, [open, membership, mentorName, tenantName, mentorEmail]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Mensagem copiada!');
    } catch {
      toast.error('Erro ao copiar mensagem');
    }
  };

  const handleOpenWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message);
    const phone = whatsappPhone.replace(/\D/g, '');

    let url: string;
    if (phone) {
      // Add Brazil country code if not present
      const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
      url = `https://wa.me/${fullPhone}?text=${encodedMessage}`;
    } else {
      url = `https://wa.me/?text=${encodedMessage}`;
    }

    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-400" />
            Convidar Mentor via WhatsApp
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Envie as instruções de acesso para o mentor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Nome do Mentor</Label>
            <Input
              value={mentorName}
              disabled
              className="bg-slate-900/50 border-slate-700 text-slate-400"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <Input
              value={mentorEmail}
              disabled
              className="bg-slate-900/50 border-slate-700 text-slate-400"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Telefone WhatsApp (opcional)</Label>
            <Input
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="11999999999"
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500">
              Sem o número, você poderá colar a mensagem manualmente
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="bg-slate-900/50 border-slate-700 text-slate-100 text-sm font-mono resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCopyMessage}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar mensagem
            </Button>
            <Button
              onClick={handleOpenWhatsApp}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
