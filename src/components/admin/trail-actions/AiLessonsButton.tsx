import { useState } from 'react';
import { Wand2, Loader2, Play, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AiLessonsButton({ moduleId, moduleTitle, trailTitle, existingLessonTitles, onDone }: {
  moduleId: string; moduleTitle: string; trailTitle: string; existingLessonTitles: string[]; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lessons, setLessons] = useState<{ title: string; description: string; dica_gravacao: string; duration_minutes: number }[]>([]);
  const [creating, setCreating] = useState(false);
  const [count, setCount] = useState('3');

  const handleGenerate = async () => {
    setGenerating(true);
    setLessons([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lessons', {
        body: { moduleTitle, trailTitle, existingLessons: existingLessonTitles, count: parseInt(count) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLessons(data.lessons || []);
    } catch (e: any) { toast.error(e.message || 'Erro ao gerar aulas'); }
    setGenerating(false);
  };

  const handleCreate = async () => {
    if (lessons.length === 0) return;
    setCreating(true);
    try {
      const startOrder = existingLessonTitles.length;
      const inserts = lessons.map((l, i) => ({
        module_id: moduleId,
        title: l.title,
        description: `${l.description}\n\n💡 Dica de gravação: ${l.dica_gravacao}`,
        duration_minutes: l.duration_minutes || 5,
        content_url: '',
        content_type: 'video',
        order_index: startOrder + i,
      }));
      const { error } = await supabase.from('trail_lessons').insert(inserts);
      if (error) throw error;
      toast.success(`${lessons.length} aulas criadas!`);
      setOpen(false);
      setLessons([]);
      onDone();
    } catch (e: any) { toast.error(e.message || 'Erro ao criar aulas'); }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLessons([]); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1 border-primary/30 text-primary hover:bg-primary/10">
          <Wand2 className="h-2.5 w-2.5" /> IA Aulas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Wand2 className="h-4 w-4 text-primary" /> Gerar Aulas — {moduleTitle}
          </DialogTitle>
        </DialogHeader>
        {lessons.length === 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              A IA vai gerar aulas para "<span className="font-semibold text-foreground">{moduleTitle}</span>"
              {existingLessonTitles.length > 0 && ` (já tem ${existingLessonTitles.length} aulas)`}.
            </p>
            <div>
              <label className="text-xs font-medium mb-1 block">Quantas aulas gerar?</label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2 text-xs">
              {generating ? <><Loader2 className="h-3 w-3 animate-spin" /> Gerando...</> : <><Wand2 className="h-3 w-3" /> Gerar Aulas</>}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 pt-2">
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-2 pr-3">
                {lessons.map((lesson, i) => (
                  <div key={i} className="rounded-md border border-border bg-background p-2.5">
                    <div className="flex items-start gap-2">
                      <Play className="h-2.5 w-2.5 text-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          value={lesson.title}
                          onChange={e => setLessons(l => l.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                          className="w-full text-[11px] font-semibold bg-transparent border-none outline-none focus:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
                        />
                        <p className="text-[10px] text-muted-foreground">{lesson.description}</p>
                        <div className="bg-primary/5 rounded-md p-2 flex gap-1.5">
                          <span className="text-[9px] text-muted-foreground">💡 {lesson.dica_gravacao}</span>
                        </div>
                      </div>
                      <button onClick={() => setLessons(l => l.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <Trash2 className="h-2 w-2" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={handleGenerate} disabled={generating} className="flex-1 gap-1.5 text-xs">
                <Wand2 className="h-3 w-3" /> Gerar Outras
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="flex-1 gap-1.5 text-xs">
                {creating ? <><Loader2 className="h-3 w-3 animate-spin" /> Criando...</> : <><Check className="h-3 w-3" /> Criar {lessons.length} Aulas</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}