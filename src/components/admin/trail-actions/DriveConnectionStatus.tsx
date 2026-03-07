import { useState, useEffect } from 'react';
import { HardDrive } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export function DriveConnectionStatus() {
  const { activeMembership } = useTenant();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnection = async () => {
    if (!activeMembership || checking) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-training', {
        body: { action: 'check_connection', membership_id: activeMembership.id, tenant_id: activeMembership.tenant_id },
      });
      setConnected(!error && data?.connected);
    } catch { setConnected(false); }
    setChecking(false);
  };

  useEffect(() => {
    if (activeMembership) checkConnection();
  }, [activeMembership?.id]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={checkConnection} className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors",
            connected ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}>
            <HardDrive className="h-3 w-3" />
            {checking ? '...' : connected ? 'Drive ✓' : 'Drive ✗'}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">
          {connected ? 'Google Drive conectado' : 'Google Drive não conectado — conecte no Perfil'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}