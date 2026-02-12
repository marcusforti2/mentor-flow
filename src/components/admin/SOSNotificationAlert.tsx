import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, MessageCircle, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SOSNotification {
  id: string;
  title: string;
  description: string;
  priority: string | null;
  category: string | null;
  created_at: string | null;
  membership_id: string | null;
  mentorado_id: string | null;
  initial_guidance: string | null;
  tenant_id: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export function SOSNotificationAlert() {
  const [notification, setNotification] = useState<SOSNotification | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { activeMembership } = useTenant();

  useEffect(() => {
    if (!activeMembership?.tenant_id) return;

    const tenantId = activeMembership.tenant_id;

    // Subscribe to new SOS requests for this tenant
    const channel = supabase
      .channel('sos-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        async (payload) => {
          console.log('New SOS received:', payload);
          const newRecord = payload.new as any;

          // Resolve profile from membership_id
          let profile: SOSNotification['profile'] = undefined;
          const membershipId = newRecord.membership_id;

          if (membershipId) {
            const { data: membership } = await supabase
              .from('memberships')
              .select('user_id')
              .eq('id', membershipId)
              .single();

            if (membership) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('user_id', membership.user_id)
                .single();

              profile = profileData || undefined;
            }
          }

          const enrichedNotification: SOSNotification = {
            id: newRecord.id,
            title: newRecord.title,
            description: newRecord.description,
            priority: newRecord.priority,
            category: newRecord.category,
            created_at: newRecord.created_at,
            membership_id: newRecord.membership_id,
            mentorado_id: newRecord.mentorado_id,
            initial_guidance: newRecord.initial_guidance,
            tenant_id: newRecord.tenant_id,
            profile,
          };

          setNotification(enrichedNotification);
          setIsOpen(true);
          playAlertSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMembership?.tenant_id]);

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        const osc2 = audioContext.createOscillator();
        osc2.connect(gainNode);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        osc2.start();
        setTimeout(() => osc2.stop(), 200);
      }, 200);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const handleViewSOS = () => {
    setIsOpen(false);
    navigate('/admin/sos');
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgente': return 'text-destructive';
      case 'alta': return 'text-destructive';
      case 'high': return 'text-destructive';
      case 'média':
      case 'medium': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityLabel = (priority: string | null) => {
    switch (priority) {
      case 'urgente':
      case 'high': return 'URGENTE';
      case 'alta': return 'ALTA';
      case 'média':
      case 'medium': return 'MÉDIA';
      default: return 'NORMAL';
    }
  };

  if (!notification) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-lg border-destructive/50 bg-background">
        {/* Pulsing header */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive rounded-full animate-ping opacity-75" />
            <div className="relative bg-destructive text-destructive-foreground px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              SOS RECEBIDO
            </div>
          </div>
        </div>

        <AlertDialogHeader className="pt-6">
          <AlertDialogTitle className="text-2xl font-display flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <span className="text-foreground">{notification.title}</span>
              <div className={`text-sm font-medium ${getPriorityColor(notification.priority)}`}>
                Prioridade: {getPriorityLabel(notification.priority)}
              </div>
            </div>
          </AlertDialogTitle>
          
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              {/* Mentorado info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {notification.profile?.full_name || 'Mentorado'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {notification.profile?.email}
                  </p>
                </div>
              </div>

              {/* Category and time */}
              <div className="flex items-center gap-4 text-sm">
                {notification.category && (
                  <span className="px-3 py-1 rounded-full bg-accent/20 text-accent font-medium">
                    {notification.category}
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {notification.created_at && 
                    format(new Date(notification.created_at), "HH:mm 'de' dd/MM", { locale: ptBR })
                  }
                </span>
              </div>

              {/* Description */}
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {notification.description}
                </p>
              </div>

              {/* Initial guidance from AI */}
              {notification.initial_guidance && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-2">💡 Orientação inicial da IA:</p>
                  <p className="text-sm text-muted-foreground">
                    {notification.initial_guidance.substring(0, 200)}...
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            Fechar
          </Button>
          <AlertDialogAction
            onClick={handleViewSOS}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Ver Centro SOS
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
