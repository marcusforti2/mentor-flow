import { useState } from 'react';
import {
  Plus, Edit, Eye, Trash2, GripVertical, Loader2, MessageSquare,
  Send, EyeOff, FolderPlus, FolderSync, HardDrive, Image as ImageIcon,
  Search, Wand2, BookOpen, Play, ChevronDown, ChevronRight, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrailEditorSheet } from '@/components/admin/TrailEditorSheet';
import { TrailPreviewModal } from '@/components/admin/TrailPreviewModal';
import { AiTrailGenerator } from '@/components/admin/AiTrailGenerator';
import { TrailScriptSender } from '@/components/admin/TrailScriptSender';
import { useTrails, Trail, TrailInput } from '@/hooks/useTrails';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Cover Search Dialog ──
function CoverSearchButton({ trailId, currentTitle, onDone, size = 'md' }: {
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
    setTimeout(() => {
      supabase.functions.invoke('search-covers', {
        body: { query: currentTitle, per_page: 12 },
      }).then(({ data }) => setImages(data?.images || []));
    }, 100);
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

// ── AI Lessons Generator per Module ──
function AiLessonsButton({ moduleId, moduleTitle, trailTitle, existingLessonTitles, onDone }: {
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

// ── Drive Connection Status ──
function DriveConnectionStatus() {
  const { activeMembership } = useTenant();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnection = async () => {
    if (!activeMembership) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-training', {
        body: { action: 'check_connection', membership_id: activeMembership.id, tenant_id: activeMembership.tenant_id },
      });
      setConnected(!error && data?.connected);
    } catch { setConnected(false); }
    setChecking(false);
  };

  if (connected === null && !checking) {
    checkConnection();
  }

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

// ── Drive Create Folders Button ──
function DriveCreateFoldersButton({ trailId, trailTitle, onDone }: { trailId: string; trailTitle: string; onDone: () => void }) {
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
      if (msg.includes('not_connected')) {
        toast.error('Conecte o Google Drive primeiro (Perfil → Conexões)');
      } else {
        toast.error('Erro ao criar pastas: ' + msg);
      }
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

// ── Drive Sync Videos Button ──
function DriveSyncButton({ trailId, trailTitle, onDone }: { trailId: string; trailTitle: string; onDone: () => void }) {
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
      if (data.synced === 0) {
        toast.info('Nenhum vídeo novo encontrado nas pastas do Drive');
      } else {
        toast.success(`${data.synced} vídeo(s) sincronizado(s)!`);
      }
      onDone();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('not_connected')) {
        toast.error('Conecte o Google Drive primeiro');
      } else {
        toast.error('Erro ao sincronizar: ' + msg);
      }
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

// ── Publish / Unpublish Button ──
function PublishToggleButton({ trail, onDone }: { trail: Trail; onDone: () => void }) {
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

export default function AdminTrilhas() {
  const { trails, isLoading, createTrail, updateTrail, deleteTrail } = useTrails();
  const [editingTrail, setEditingTrail] = useState<Trail | null>(null);
  const [previewTrail, setPreviewTrail] = useState<Trail | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedTrail, setExpandedTrail] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const handleCreateNew = () => { setEditingTrail(null); setIsCreating(true); };
  const handleEdit = (trail: Trail) => { setEditingTrail(trail); setIsCreating(true); };
  const handlePreview = (trail: Trail) => { setPreviewTrail(trail); };
  const handleDelete = (trailId: string) => { setDeleteConfirm(trailId); };
  const confirmDelete = () => { if (deleteConfirm) { deleteTrail.mutate(deleteConfirm); setDeleteConfirm(null); } };

  const handleSave = (trailData: TrailInput) => {
    if (editingTrail) { updateTrail.mutate({ ...trailData, id: editingTrail.id }); }
    else { createTrail.mutate(trailData); }
    setIsCreating(false);
  };

  const handleAiTrailCreated = (trailData: TrailInput) => { createTrail.mutate(trailData); };
  const invalidateAll = () => { /* useTrails auto-invalidates via queryClient */ };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Gerenciar Trilhas</h1>
          <p className="text-muted-foreground mt-1">Crie e edite trilhas de conteúdo para seus mentorados</p>
        </div>
        <div className="flex items-center gap-2">
          <DriveConnectionStatus />
          <AiTrailGenerator onTrailCreated={handleAiTrailCreated} />
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Trilha
          </Button>
        </div>
      </div>

      {/* Trail List */}
      <div className="space-y-3">
        {trails.map((trail) => {
          const isExpanded = expandedTrail === trail.id;
          return (
            <Card key={trail.id} className="glass-card border-border/50 hover:border-primary/30 transition-all duration-300 overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedTrail(isExpanded ? null : trail.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />

                {/* Thumbnail */}
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img src={trail.thumbnail_url} alt={trail.title} className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{trail.title}</h3>
                    <Badge variant={trail.is_featured ? 'default' : 'secondary'} className="text-[9px]">
                      {trail.is_featured ? 'Destaque' : 'Normal'}
                    </Badge>
                    {trail.is_published ? (
                      <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Publicada</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] text-yellow-600 border-yellow-600">Rascunho</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{trail.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span>{trail.modules.length} módulos</span>
                    <span>{trail.total_lessons} aulas</span>
                    <span>{formatDuration(trail.total_duration)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <PublishToggleButton trail={trail} onDone={invalidateAll} />
                  <DriveCreateFoldersButton trailId={trail.id} trailTitle={trail.title} onDone={invalidateAll} />
                  <DriveSyncButton trailId={trail.id} trailTitle={trail.title} onDone={invalidateAll} />
                  <CoverSearchButton trailId={trail.id} currentTitle={trail.title} onDone={invalidateAll} />
                  <TrailScriptSender trail={trail} lessons={trail.modules.flatMap(m => m.lessons)} />
                  <Button variant="ghost" size="icon" onClick={() => handlePreview(trail)} className="h-8 w-8 hover:bg-accent/20 hover:text-accent">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(trail)} className="h-8 w-8 hover:bg-primary/20 hover:text-primary">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(trail.id)} className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              </div>

              {/* Expanded Modules */}
              {isExpanded && (
                <div className="border-t border-border bg-secondary/10 p-4 space-y-2">
                  {trail.modules.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Nenhum módulo — edite a trilha para adicionar</p>
                  ) : trail.modules.map(mod => {
                    const modExpanded = expandedModule === mod.id;
                    return (
                      <div key={mod.id} className="rounded-lg border border-border bg-card">
                        <div
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/20 transition-colors"
                          onClick={() => setExpandedModule(modExpanded ? null : mod.id)}
                        >
                          <BookOpen className="h-3 w-3 text-primary shrink-0" />
                          <p className="text-xs font-semibold flex-1 truncate">{mod.title}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{mod.lessons.length} aulas</span>
                          <div onClick={e => e.stopPropagation()}>
                            <AiLessonsButton
                              moduleId={mod.id}
                              moduleTitle={mod.title}
                              trailTitle={trail.title}
                              existingLessonTitles={mod.lessons.map(l => l.title)}
                              onDone={invalidateAll}
                            />
                          </div>
                          <div onClick={e => e.stopPropagation()}>
                            <TrailScriptSender trail={trail} module={mod} lessons={mod.lessons} />
                          </div>
                          {modExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                        {modExpanded && (
                          <div className="border-t border-border p-2 space-y-1">
                            {mod.lessons.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma aula neste módulo</p>
                            ) : mod.lessons.map(lesson => (
                              <div key={lesson.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/20 transition-colors">
                                <Play className="h-2.5 w-2.5 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-medium text-foreground truncate">{lesson.title}</p>
                                  <p className="text-[9px] text-muted-foreground truncate">{lesson.content_url || 'Sem vídeo'} • {lesson.duration_minutes}min</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}

        {trails.length === 0 && (
          <Card className="glass-card border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Você ainda não criou nenhuma trilha</p>
              <div className="flex items-center justify-center gap-3">
                <AiTrailGenerator onTrailCreated={handleAiTrailCreated} />
                <Button onClick={handleCreateNew} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" /> Criar manualmente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Editor Sheet */}
      <TrailEditorSheet open={isCreating} onOpenChange={setIsCreating} trail={editingTrail} onSave={handleSave} />

      {/* Preview Modal */}
      <TrailPreviewModal open={!!previewTrail} onOpenChange={(open) => !open && setPreviewTrail(null)} trail={previewTrail} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Trilha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta trilha? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
