import { useState } from 'react';
import { Image as ImageIcon, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function CoverSearchButton({ trailId, currentTitle, onDone, size = 'md' }: {
  trailId: string; currentTitle: string; onDone: () => void; size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(currentTitle);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('search-covers', {
        body: { query: query.trim(), per_page: 12 },
      });
      setImages(data?.images || []);
    } catch { setImages([]); }
    setLoading(false);
  };

  const handleSelect = async (url: string) => {
    setSaving(true);
    const { error } = await supabase.from('trails').update({ thumbnail_url: url } as any).eq('id', trailId);
    setSaving(false);
    if (error) { toast.error('Erro ao atualizar capa'); return; }
    toast.success('Capa atualizada!');
    setOpen(false);
    onDone();
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
    setQuery(currentTitle);
    setImages([]);
    supabase.functions.invoke('search-covers', {
      body: { query: currentTitle, per_page: 12 },
    }).then(({ data }) => setImages(data?.images || []));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleOpen} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <ImageIcon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">Buscar capa</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="max-w-2xl" onClick={e => e.stopPropagation()}>
        <DialogHeader><DialogTitle className="text-sm">Buscar Capa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Pesquisar imagens..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading} size="sm" className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Buscar
            </Button>
          </div>
          {saving && (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
            </div>
          )}
          {!saving && images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
              {images.map((img: any) => (
                <button
                  key={img.id}
                  onClick={() => handleSelect(img.url)}
                  className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all"
                >
                  <img src={img.thumb || img.url} alt="" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Selecionar</span>
                  </div>
                  {img.photographer && (
                    <p className="text-[8px] text-muted-foreground truncate px-1 py-0.5">📸 {img.photographer}</p>
                  )}
                </button>
              ))}
            </div>
          )}
          {!saving && !loading && images.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">Pesquise por um termo para ver imagens</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}