import { useState } from 'react';
import { EyeOff, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Trail } from '@/hooks/useTrails';

export function PublishToggleButton({ trail, onDone }: { trail: Trail; onDone: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPublished = !trail.is_published;
    if (newPublished && !confirm(`Publicar "${trail.title}" para os mentorados?`)) return;
    setLoading(true);
    const { error } = await supabase.from('trails').update({ is_published: newPublished } as any).eq('id', trail.id);
    setLoading(false);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success(newPublished ? 'Trilha publicada! 🎉' : 'Trilha despublicada');
    onDone();
  };

  return trail.is_published ? (
    <button onClick={handleToggle} disabled={loading} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50">
      <EyeOff className="h-2.5 w-2.5" /> {loading ? '...' : 'Despublicar'}
    </button>
  ) : (
    <button onClick={handleToggle} disabled={loading} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
      <Send className="h-2.5 w-2.5" /> {loading ? '...' : 'Publicar'}
    </button>
  );
}