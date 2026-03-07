import { useState } from 'react';
import { FolderPlus, FolderSync, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function DriveCreateFoldersButton({ trailId, trailTitle, onDone }: { trailId: string; trailTitle: string; onDone: () => void }) {
  const { activeMembership } = useTenant();
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeMembership) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-training', {
        body: { action: 'create_folders', trail_id: trailId, membership_id: activeMembership.id, tenant_id: activeMembership.tenant_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.folders?.length || 0} pastas criadas no Google Drive!`);
      onDone();
    } catch (err: any) {
      const msg = err?.message || '';
      toast.error(msg.includes('not_connected') ? 'Conecte o Google Drive primeiro (Perfil → Conexões)' : 'Erro ao criar pastas: ' + msg);
    } finally { setLoading(false); }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={handleCreate} disabled={loading} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">Criar pastas no Drive para "{trailTitle}"</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DriveSyncButton({ trailId, trailTitle, onDone }: { trailId: string; trailTitle: string; onDone: () => void }) {
  const { activeMembership } = useTenant();
  const [loading, setLoading] = useState(false);

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeMembership) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-training', {
        body: { action: 'sync_videos', trail_id: trailId, membership_id: activeMembership.id, tenant_id: activeMembership.tenant_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast[data.synced === 0 ? 'info' : 'success'](
        data.synced === 0 ? 'Nenhum vídeo novo encontrado nas pastas do Drive' : `${data.synced} vídeo(s) sincronizado(s)!`
      );
      onDone();
    } catch (err: any) {
      const msg = err?.message || '';
      toast.error(msg.includes('not_connected') ? 'Conecte o Google Drive primeiro' : 'Erro ao sincronizar: ' + msg);
    } finally { setLoading(false); }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={handleSync} disabled={loading} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderSync className="h-3.5 w-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">Sincronizar vídeos do Drive para "{trailTitle}"</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}