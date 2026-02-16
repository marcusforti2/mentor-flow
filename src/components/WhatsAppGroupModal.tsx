import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, ExternalLink, Bell } from 'lucide-react';
import { toast } from 'sonner';

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/XXXXXXXXXX'; // TODO: Replace with actual group link
const STORAGE_KEY = 'whatsapp_group_joined';
const REMINDER_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds

export function WhatsAppGroupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasJoined, setHasJoined] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const showReminder = useCallback(() => {
    if (!hasJoined) {
      toast.info('Não esqueça de entrar no GRUPO ATLAZ no WhatsApp! 📱', {
        action: {
          label: 'Entrar agora',
          onClick: () => setIsOpen(true),
        },
        duration: 10000,
      });
    }
  }, [hasJoined]);

  useEffect(() => {
    // Show modal on first load if not joined — delay to avoid overlap with GuidedTour
    if (!hasJoined) {
      const timer = setTimeout(() => setIsOpen(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [hasJoined]);

  useEffect(() => {
    // Set up reminder interval
    if (!hasJoined) {
      const interval = setInterval(showReminder, REMINDER_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [hasJoined, showReminder]);

  const handleJoinGroup = () => {
    window.open(WHATSAPP_GROUP_URL, '_blank');
  };

  const handleConfirmJoined = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasJoined(true);
    setIsOpen(false);
    toast.success('Bem-vindo ao GRUPO ATLAZ! 🎉');
  };

  if (hasJoined) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <MessageCircle className="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Entre no GRUPO ATLAZ
          </DialogTitle>
          <DialogDescription className="text-base">
            Para aproveitar 100% da sua mentoria, é essencial que você faça parte do nosso grupo exclusivo no WhatsApp!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-medium">No grupo você terá acesso a:</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Avisos importantes e atualizações</li>
              <li>• Networking com outros mentorados</li>
              <li>• Conteúdo exclusivo do mentor</li>
              <li>• Suporte rápido da comunidade</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleJoinGroup}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir Link do Grupo
            </Button>
            
            <Button
              onClick={handleConfirmJoined}
              variant="outline"
              className="w-full"
            >
              Já entrei no grupo ✓
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Você receberá lembretes a cada 3 minutos até confirmar sua entrada.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
