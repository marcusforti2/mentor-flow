import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Wand2, Loader2, BookOpen, Play, Trash2, Plus, ChevronDown, ChevronRight,
  Check, RefreshCw, Edit2, Lightbulb
} from 'lucide-react';
import type { TrailInput } from '@/hooks/useTrails';

type AiLesson = { title: string; description: string; dica_gravacao: string; duration_minutes: number };
type AiModule = { title: string; description: string; lessons: AiLesson[] };
type AiTrailStructure = { title: string; description: string; modules: AiModule[] };

interface AiTrailGeneratorProps {
  onTrailCreated: (trailData: TrailInput) => void;
}

export function AiTrailGenerator({ onTrailCreated }: AiTrailGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [generating, setGenerating] = useState(false);
  const [structure, setStructure] = useState<AiTrailStructure | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedMod, setExpandedMod] = useState<number | null>(0);

  const [structureMode, setStructureMode] = useState<'auto' | 'manual'>('auto');
  const [customModules, setCustomModules] = useState(3);
  const [customLessons, setCustomLessons] = useState(3);

  const [equipment, setEquipment] = useState('celular');
  const [recordStyle, setRecordStyle] = useState('talking_head');
  const [videoFormat, setVideoFormat] = useState('medio');
  const [extraNotes, setExtraNotes] = useState('');

  const equipmentOptions = [
    { value: 'celular', label: '📱 Celular' },
    { value: 'webcam', label: '💻 Webcam/Notebook' },
    { value: 'camera_pro', label: '🎥 Câmera profissional' },
    { value: 'tela', label: '🖥️ Gravação de tela' },
  ];
  const styleOptions = [
    { value: 'talking_head', label: '🗣️ Talking Head' },
    { value: 'tela_narrada', label: '🖥️ Tela narrada' },
    { value: 'roleplay', label: '🎭 Roleplay/Simulação' },
    { value: 'slides', label: '📊 Slides com narração' },
    { value: 'misto', label: '🔀 Misto' },
  ];
  const formatOptions = [
    { value: 'curto', label: '⚡ Curto (3-5 min)' },
    { value: 'medio', label: '⏱️ Médio (5-10 min)' },
    { value: 'longo', label: '🕐 Longo (10-20 min)' },
  ];

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setGenerating(true);
    setStructure(null);
    try {
      const body: Record<string, unknown> = { idea: idea.trim(), equipment, recordStyle, videoFormat };
      if (extraNotes.trim()) body.extraNotes = extraNotes.trim();
      if (structureMode === 'manual') {
        body.numModules = customModules;
        body.numLessonsPerModule = customLessons;
      }
      const { data, error } = await supabase.functions.invoke('generate-trail', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStructure(data);
      setExpandedMod(0);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar estrutura');
    }
    setGenerating(false);
  };

  const handleAccept = async () => {
    if (!structure) return;
    setCreating(true);
    try {
      // Search cover image
      let thumbnailUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop';
      try {
        const { data: coverData } = await supabase.functions.invoke('search-covers', {
          body: { query: structure.title, per_page: 1 },
        });
        if (coverData?.images?.[0]?.url) {
          thumbnailUrl = coverData.images[0].url;
        }
      } catch { /* use default */ }

      const trailInput: TrailInput = {
        title: structure.title,
        description: structure.description,
        thumbnail_url: thumbnailUrl,
        is_featured: false,
        is_published: false,
        modules: structure.modules.map((mod, mi) => ({
          title: mod.title,
          description: mod.description,
          order_index: mi,
          lessons: mod.lessons.map((les, li) => ({
            title: les.title,
            description: `${les.description}\n\n💡 Dica de gravação: ${les.dica_gravacao}`,
            duration_minutes: les.duration_minutes || 5,
            content_url: '',
            content_type: 'video' as const,
            order_index: li,
          })),
        })),
      };

      onTrailCreated(trailInput);
      toast.success(`Trilha "${structure.title}" criada com ${structure.modules.length} módulos! 🎉`);
      setOpen(false);
      setStructure(null);
      setIdea('');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar trilha');
    }
    setCreating(false);
  };

  // Editable helpers
  const updateStructure = (updater: (s: AiTrailStructure) => AiTrailStructure) => {
    if (structure) setStructure(updater(structure));
  };
  const updateModuleTitle = (mi: number, val: string) => {
    updateStructure(s => ({ ...s, modules: s.modules.map((m, i) => i === mi ? { ...m, title: val } : m) }));
  };
  const updateLessonTitle = (mi: number, li: number, val: string) => {
    updateStructure(s => ({
      ...s, modules: s.modules.map((m, i) => i === mi ? {
        ...m, lessons: m.lessons.map((l, j) => j === li ? { ...l, title: val } : l)
      } : m)
    }));
  };
  const updateLessonDesc = (mi: number, li: number, val: string) => {
    updateStructure(s => ({
      ...s, modules: s.modules.map((m, i) => i === mi ? {
        ...m, lessons: m.lessons.map((l, j) => j === li ? { ...l, description: val } : l)
      } : m)
    }));
  };
  const removeLesson = (mi: number, li: number) => {
    updateStructure(s => ({
      ...s, modules: s.modules.map((m, i) => i === mi ? {
        ...m, lessons: m.lessons.filter((_, j) => j !== li)
      } : m)
    }));
  };
  const removeModule = (mi: number) => {
    updateStructure(s => ({ ...s, modules: s.modules.filter((_, i) => i !== mi) }));
    if (expandedMod === mi) setExpandedMod(null);
  };
  const addLesson = (mi: number) => {
    updateStructure(s => ({
      ...s, modules: s.modules.map((m, i) => i === mi ? {
        ...m, lessons: [...m.lessons, { title: 'Nova Aula', description: 'Descrição da aula', dica_gravacao: 'Defina o formato e duração', duration_minutes: 5 }]
      } : m)
    }));
  };
  const addModule = () => {
    updateStructure(s => ({
      ...s, modules: [...s.modules, { title: 'Novo Módulo', description: '', lessons: [] }]
    }));
    setExpandedMod(structure ? structure.modules.length : 0);
  };

  const totalLessons = structure?.modules.reduce((sum, m) => sum + m.lessons.length, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setStructure(null); setIdea(''); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Wand2 className="h-4 w-4" /> IA Gerar Trilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Wand2 className="h-4 w-4 text-primary" /> Gerar Trilha com IA
          </DialogTitle>
        </DialogHeader>

        {!structure ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pt-1 pr-3">
              <div>
                <label className="text-[11px] font-medium text-foreground mb-1 block">Descreva a ideia da trilha</label>
                <Textarea
                  placeholder="Ex: Trilha de prospecção ativa para mentorados do nicho de coaching..."
                  value={idea}
                  onChange={e => setIdea(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-foreground mb-1 block">Estrutura</label>
                  <Select value={structureMode} onValueChange={(v: 'auto' | 'manual') => setStructureMode(v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">✨ IA decide</SelectItem>
                      <SelectItem value="manual">✏️ Personalizar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-foreground mb-1 block">Equipamento</label>
                  <Select value={equipment} onValueChange={setEquipment}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {equipmentOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {structureMode === 'manual' && (
                <div className="grid grid-cols-3 gap-2 bg-secondary/30 rounded-lg p-2.5 items-end">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Módulos</label>
                    <Select value={String(customModules)} onValueChange={v => setCustomModules(Number(v))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Aulas/módulo</label>
                    <Select value={String(customLessons)} onValueChange={v => setCustomLessons(Number(v))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[10px] text-muted-foreground pb-1">= <strong className="text-foreground">{customModules * customLessons}</strong> aulas</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-foreground mb-1 block">Estilo</label>
                  <Select value={recordStyle} onValueChange={setRecordStyle}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {styleOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-foreground mb-1 block">Duração</label>
                  <Select value={videoFormat} onValueChange={setVideoFormat}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {formatOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-foreground mb-1 block">Observações extras <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <Input
                  placeholder="Ex: Foco em vendas B2B, incluir exemplos do nicho de saúde..."
                  value={extraNotes}
                  onChange={e => setExtraNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <Button onClick={handleGenerate} disabled={generating || !idea.trim()} className="w-full gap-2 h-9 text-xs">
                {generating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...</> : <><Wand2 className="h-3.5 w-3.5" /> Gerar Estrutura</>}
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 pt-2">
            {/* Editable Header */}
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <Input
                value={structure.title}
                onChange={e => setStructure({ ...structure, title: e.target.value })}
                className="text-sm font-bold h-8 bg-background"
              />
              <Input
                value={structure.description}
                onChange={e => setStructure({ ...structure, description: e.target.value })}
                className="text-[11px] h-7 bg-background"
                placeholder="Descrição da trilha"
              />
              <div className="flex gap-3 mt-1">
                <Badge variant="outline" className="text-[9px]">{structure.modules.length} módulos</Badge>
                <Badge variant="outline" className="text-[9px]">{totalLessons} aulas</Badge>
                <span className="text-[9px] text-muted-foreground flex items-center gap-1"><Edit2 className="h-2 w-2" /> Clique para editar</span>
              </div>
            </div>

            {/* Editable Modules */}
            <ScrollArea className="flex-1 max-h-[350px]">
              <div className="space-y-2 pr-3">
                {structure.modules.map((mod, mi) => (
                  <div key={mi} className="rounded-lg border border-border bg-background">
                    <div className="flex items-center gap-2 p-2.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      <input
                        value={mod.title}
                        onChange={e => updateModuleTitle(mi, e.target.value)}
                        className="flex-1 text-xs font-semibold bg-transparent border-none outline-none focus:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
                      />
                      <span className="text-[10px] text-muted-foreground shrink-0">{mod.lessons.length} aulas</span>
                      <button onClick={() => removeModule(mi)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Remover módulo">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={() => setExpandedMod(expandedMod === mi ? null : mi)} className="p-0.5">
                        {expandedMod === mi ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    </div>
                    {expandedMod === mi && (
                      <div className="border-t border-border p-2.5 space-y-1.5 bg-secondary/5">
                        {mod.lessons.map((lesson, li) => (
                          <div key={li} className="rounded-md border border-border/50 bg-background p-2.5">
                            <div className="flex items-start gap-2">
                              <Play className="h-2.5 w-2.5 text-primary mt-1.5 shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <input
                                  value={lesson.title}
                                  onChange={e => updateLessonTitle(mi, li, e.target.value)}
                                  className="w-full text-[11px] font-semibold bg-transparent border-none outline-none focus:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
                                />
                                <textarea
                                  value={lesson.description}
                                  onChange={e => updateLessonDesc(mi, li, e.target.value)}
                                  className="w-full text-[10px] text-muted-foreground bg-transparent border-none outline-none focus:bg-secondary/30 rounded px-1 -mx-1 resize-none transition-colors"
                                  rows={2}
                                />
                                <div className="bg-primary/5 rounded-md p-2 flex gap-1.5">
                                  <Lightbulb className="h-2.5 w-2.5 text-primary shrink-0 mt-0.5" />
                                  <p className="text-[9px] text-muted-foreground leading-relaxed">{lesson.dica_gravacao}</p>
                                </div>
                              </div>
                              <button onClick={() => removeLesson(mi, li)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                <Trash2 className="h-2 w-2" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => addLesson(mi)} className="w-full flex items-center justify-center gap-1 text-[10px] text-primary hover:bg-primary/5 rounded-md py-1.5 transition-colors">
                          <Plus className="h-2.5 w-2.5" /> Adicionar Aula
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addModule} className="w-full flex items-center justify-center gap-1 text-[10px] text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 py-2 transition-colors">
                  <Plus className="h-2.5 w-2.5" /> Adicionar Módulo
                </button>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={handleGenerate} disabled={generating} className="flex-1 gap-1.5 text-xs">
                <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} /> Gerar Outra
              </Button>
              <Button onClick={handleAccept} disabled={creating} className="flex-1 gap-1.5 text-xs">
                {creating ? <><Loader2 className="h-3 w-3 animate-spin" /> Criando...</> : <><Check className="h-3 w-3" /> Aceitar e Criar</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
