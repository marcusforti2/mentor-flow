import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Video, 
  Save,
  Image as ImageIcon,
  Upload,
  Loader2,
  FileText,
  Type,
  HardDrive,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isGoogleDriveUrl } from '@/types/trails';
import type { Trail, TrailInput, TrailModule, TrailLesson } from '@/hooks/useTrails';

interface TrailEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trail: Trail | null;
  onSave: (trail: TrailInput) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const getYouTubeThumbnail = (url: string) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)?([^&\s]+)/);
  const videoId = match ? match[1] : url;
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
};

interface FormModule {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: FormLesson[];
}

interface FormLesson {
  id: string;
  title: string;
  description: string;
  content_url: string;
  duration_minutes: number;
  order_index: number;
  content_type: 'video' | 'text' | 'file';
  text_content: string;
  file_url: string;
  file_name: string;
}

interface FormData {
  id?: string;
  title: string;
  description: string;
  thumbnail_url: string;
  modules: FormModule[];
  total_lessons: number;
  total_duration: number;
  is_featured: boolean;
  is_published: boolean;
}

export function TrailEditorSheet({ open, onOpenChange, trail, onSave }: TrailEditorSheetProps) {
  const { activeMembership } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    thumbnail_url: '',
    modules: [],
    total_lessons: 0,
    total_duration: 0,
    is_featured: false,
    is_published: true,
  });

  useEffect(() => {
    if (trail) {
      setFormData({
        id: trail.id,
        title: trail.title,
        description: trail.description,
        thumbnail_url: trail.thumbnail_url,
        modules: trail.modules.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          order_index: m.order_index,
          lessons: m.lessons.map(l => ({
            id: l.id,
            title: l.title,
            description: l.description,
            content_url: l.content_url,
            duration_minutes: l.duration_minutes,
            order_index: l.order_index,
            content_type: l.content_type || 'video',
            text_content: l.text_content || '',
            file_url: l.file_url || '',
            file_name: l.file_name || '',
          })),
        })),
        total_lessons: trail.total_lessons,
        total_duration: trail.total_duration,
        is_featured: trail.is_featured,
        is_published: trail.is_published,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        thumbnail_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
        modules: [],
        total_lessons: 0,
        total_duration: 0,
        is_featured: false,
        is_published: true,
      });
    }
  }, [trail, open]);

  const recalculateTotals = (modules: FormModule[]): { total_lessons: number; total_duration: number } => {
    let total_lessons = 0;
    let total_duration = 0;
    modules.forEach(mod => {
      total_lessons += mod.lessons.length;
      mod.lessons.forEach(les => {
        total_duration += les.duration_minutes;
      });
    });
    return { total_lessons, total_duration };
  };

  const addModule = () => {
    const newModules = [
      ...formData.modules,
      {
        id: generateId(),
        title: `Módulo ${formData.modules.length + 1}`,
        description: '',
        order_index: formData.modules.length,
        lessons: [],
      },
    ];
    const totals = recalculateTotals(newModules);
    setFormData({ ...formData, modules: newModules, ...totals });
  };

  const removeModule = (moduleId: string) => {
    const newModules = formData.modules.filter((m) => m.id !== moduleId);
    const totals = recalculateTotals(newModules);
    setFormData({ ...formData, modules: newModules, ...totals });
  };

  const updateModule = (moduleId: string, updates: Partial<FormModule>) => {
    const newModules = formData.modules.map((m) =>
      m.id === moduleId ? { ...m, ...updates } : m
    );
    const totals = recalculateTotals(newModules);
    setFormData({ ...formData, modules: newModules, ...totals });
  };

  const addLesson = (moduleId: string) => {
    const module = formData.modules.find((m) => m.id === moduleId);
    if (!module) return;

    const newLessons: FormLesson[] = [
      ...module.lessons,
      {
        id: generateId(),
        title: `Aula ${module.lessons.length + 1}`,
        description: '',
        content_url: '',
        duration_minutes: 10,
        order_index: module.lessons.length,
        content_type: 'video',
        text_content: '',
        file_url: '',
        file_name: '',
      },
    ];
    updateModule(moduleId, { lessons: newLessons });
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    const module = formData.modules.find((m) => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      lessons: module.lessons.filter((l) => l.id !== lessonId),
    });
  };

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<FormLesson>) => {
    const module = formData.modules.find((m) => m.id === moduleId);
    if (!module) return;

    const newLessons = module.lessons.map((l) =>
      l.id === lessonId ? { ...l, ...updates } : l
    );
    updateModule(moduleId, { lessons: newLessons });
  };

  const [titleError, setTitleError] = useState('');

  const handleSave = () => {
    if (!formData.title.trim()) {
      setTitleError('Título é obrigatório');
      return;
    }
    setTitleError('');
    const trailInput: TrailInput = {
      id: formData.id,
      title: formData.title,
      description: formData.description,
      thumbnail_url: formData.thumbnail_url,
      is_featured: formData.is_featured,
      is_published: formData.is_published,
      modules: formData.modules.map((m, mi) => ({
        title: m.title,
        description: m.description,
        order_index: mi,
        lessons: m.lessons.map((l, li) => ({
          title: l.title,
          description: l.description,
          duration_minutes: l.duration_minutes,
          content_url: l.content_url,
          content_type: l.content_type,
          text_content: l.text_content,
          file_url: l.file_url,
          file_name: l.file_name,
          order_index: li,
        })),
      })),
    };
    onSave(trailInput);
    toast.success('Trilha salva com sucesso!');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl p-0 bg-background border-border"
      >
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="text-xl font-display">
            {trail ? 'Editar Trilha' : 'Nova Trilha'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-10rem)] px-6">
          <div className="space-y-6 py-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Trilha</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setTitleError(''); }}
                  placeholder="Ex: Fundamentos do High Ticket"
                  className={cn("bg-muted/50", titleError && "border-destructive")}
                />
                {titleError && <p className="text-xs text-destructive mt-1">{titleError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o conteúdo desta trilha..."
                  className="bg-muted/50 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Capa da Trilha</Label>
                <p className="text-xs text-muted-foreground">
                  Formato ideal: <strong>1280×720px (16:9)</strong> • JPG ou PNG • Máx 2MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
                    if (!ALLOWED_TYPES.includes(file.type)) {
                      toast.error('Use JPG, PNG ou WebP');
                      return;
                    }
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error('Arquivo muito grande. Máximo 2MB.');
                      return;
                    }
                    setIsUploading(true);
                    try {
                      const ext = file.name.split('.').pop();
                      const path = `${activeMembership?.tenant_id || 'default'}/${Date.now()}.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from('trail-covers')
                        .upload(path, file, { upsert: true });
                      if (uploadError) throw uploadError;
                      const { data: urlData } = supabase.storage
                        .from('trail-covers')
                        .getPublicUrl(path);
                      setFormData({ ...formData, thumbnail_url: urlData.publicUrl });
                      toast.success('Capa enviada!');
                    } catch (err) {
                      console.error('Upload error:', err);
                      toast.error('Erro ao enviar capa');
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                />
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-border rounded-lg overflow-hidden cursor-pointer transition-colors hover:border-primary/50",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                >
                  {formData.thumbnail_url ? (
                    <div className="relative w-full h-36">
                      <img 
                        src={formData.thumbnail_url} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-sm font-medium flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Trocar capa
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      ) : (
                        <Upload className="h-8 w-8 mb-2" />
                      )}
                      <span className="text-sm font-medium">
                        {isUploading ? 'Enviando...' : 'Clique para enviar a capa'}
                      </span>
                      <span className="text-xs mt-1">1280×720px • JPG/PNG</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="featured">Trilha em Destaque</Label>
                  <p className="text-xs text-muted-foreground">
                    Trilhas em destaque aparecem no banner principal
                  </p>
                </div>
                <Switch
                  id="featured"
                  checked={formData.is_featured || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="published">Publicada</Label>
                  <p className="text-xs text-muted-foreground">
                    Trilhas não publicadas ficam como rascunho
                  </p>
                </div>
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>
            </div>

            <Separator />

            {/* Modules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Módulos</h3>
                  <p className="text-xs text-muted-foreground">
                    Organize o conteúdo em módulos e aulas
                  </p>
                </div>
                <Button onClick={addModule} variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Módulo
                </Button>
              </div>

              {formData.modules.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhum módulo criado ainda
                  </p>
                  <Button onClick={addModule} variant="outline" size="sm" className="gap-1">
                    <Plus className="h-3 w-3" />
                    Criar primeiro módulo
                  </Button>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {formData.modules.map((module, moduleIndex) => (
                    <AccordionItem 
                      key={module.id} 
                      value={module.id}
                      className="border border-border rounded-lg overflow-hidden bg-muted/30"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">
                            {String(moduleIndex + 1).padStart(2, '0')}
                          </span>
                          <span className="font-medium text-foreground">
                            {module.title || 'Módulo sem título'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto mr-2">
                            {module.lessons.length} aulas
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4 pt-2">
                          {/* Module Info */}
                          <div className="grid gap-3">
                            <Input
                              value={module.title}
                              onChange={(e) => updateModule(module.id, { title: e.target.value })}
                              placeholder="Título do módulo"
                              className="bg-background"
                            />
                            <Textarea
                              value={module.description}
                              onChange={(e) => updateModule(module.id, { description: e.target.value })}
                              placeholder="Descrição do módulo (opcional)"
                              className="bg-background min-h-[60px]"
                            />
                          </div>

                          {/* Lessons */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Aulas</span>
                              <Button 
                                onClick={() => addLesson(module.id)} 
                                variant="ghost" 
                                size="sm"
                                className="h-7 text-xs gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Aula
                              </Button>
                            </div>

                            {module.lessons.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                Nenhuma aula neste módulo
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {module.lessons.map((lesson) => (
                                  <div 
                                    key={lesson.id}
                                    className="flex items-start gap-2 p-3 bg-background rounded-lg border border-border"
                                  >
                                    <div className="flex items-center gap-2 mt-2">
                                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                                      {lesson.content_type === 'video' && <Video className="h-4 w-4 text-accent" />}
                                      {lesson.content_type === 'text' && <Type className="h-4 w-4 text-blue-400" />}
                                      {lesson.content_type === 'file' && <FileText className="h-4 w-4 text-orange-400" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <div className="flex gap-2">
                                        <Input
                                          value={lesson.title}
                                          onChange={(e) => updateLesson(module.id, lesson.id, { title: e.target.value })}
                                          placeholder="Título da aula"
                                          className="h-8 text-sm flex-1"
                                        />
                                        <Select
                                          value={lesson.content_type}
                                          onValueChange={(val) => updateLesson(module.id, lesson.id, { content_type: val as 'video' | 'text' | 'file' })}
                                        >
                                          <SelectTrigger className="h-8 w-[130px] text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="video">
                                              <span className="flex items-center gap-1.5"><Video className="h-3 w-3" /> Vídeo</span>
                                            </SelectItem>
                                            <SelectItem value="text">
                                              <span className="flex items-center gap-1.5"><Type className="h-3 w-3" /> Texto</span>
                                            </SelectItem>
                                            <SelectItem value="file">
                                              <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> Arquivo</span>
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Video fields */}
                                      {lesson.content_type === 'video' && (
                                        <>
                                          <div className="flex gap-2">
                                            <Input
                                              value={lesson.content_url}
                                              onChange={(e) => updateLesson(module.id, lesson.id, { content_url: e.target.value })}
                                              placeholder="ID YouTube ou link do Google Drive"
                                              className="h-8 text-sm flex-1"
                                            />
                                            <Input
                                              type="number"
                                              value={lesson.duration_minutes}
                                              onChange={(e) => updateLesson(module.id, lesson.id, { duration_minutes: parseInt(e.target.value) || 0 })}
                                              placeholder="Min"
                                              className="h-8 text-sm w-16"
                                            />
                                          </div>
                                          {lesson.content_url && isGoogleDriveUrl(lesson.content_url) ? (
                                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                              <HardDrive className="h-3.5 w-3.5 text-primary" />
                                              <span>Google Drive embed configurado</span>
                                            </div>
                                          ) : lesson.content_url && getYouTubeThumbnail(lesson.content_url) ? (
                                            <div className="w-24 h-14 rounded overflow-hidden bg-muted">
                                              <img 
                                                src={getYouTubeThumbnail(lesson.content_url)}
                                                alt="Thumbnail"
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          ) : null}
                                          <p className="text-[10px] text-muted-foreground">
                                            YouTube: cole o ID do vídeo • Drive: cole o link completo (ex: https://drive.google.com/file/d/.../view)
                                          </p>
                                        </>
                                      )}

                                      {/* Text/Markdown fields */}
                                      {lesson.content_type === 'text' && (
                                        <div className="space-y-1">
                                          <p className="text-xs text-muted-foreground">
                                            Suporta <strong>Markdown</strong>: # título, **negrito**, *itálico*, - listas, ```código```
                                          </p>
                                          <Textarea
                                            value={lesson.text_content}
                                            onChange={(e) => updateLesson(module.id, lesson.id, { text_content: e.target.value })}
                                            placeholder="# Título da aula&#10;&#10;Escreva seu conteúdo aqui usando **Markdown**...&#10;&#10;- Item 1&#10;- Item 2"
                                            className="min-h-[200px] text-sm font-mono bg-muted/50"
                                          />
                                          <Input
                                            type="number"
                                            value={lesson.duration_minutes}
                                            onChange={(e) => updateLesson(module.id, lesson.id, { duration_minutes: parseInt(e.target.value) || 0 })}
                                            placeholder="Tempo estimado de leitura (min)"
                                            className="h-8 text-sm w-48"
                                          />
                                        </div>
                                      )}

                                      {/* File upload fields */}
                                      {lesson.content_type === 'file' && (
                                        <div className="space-y-2">
                                          {lesson.file_url ? (
                                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                                              <FileText className="h-4 w-4 text-primary" />
                                              <span className="flex-1 truncate">{lesson.file_name || 'Arquivo enviado'}</span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs"
                                                onClick={() => updateLesson(module.id, lesson.id, { file_url: '', file_name: '' })}
                                              >
                                                Trocar
                                              </Button>
                                            </div>
                                          ) : (
                                            <div>
                                              <input
                                                type="file"
                                                className="hidden"
                                                id={`file-${lesson.id}`}
                                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
                                                onChange={async (e) => {
                                                  const file = e.target.files?.[0];
                                                  if (!file) return;
                                                  if (file.size > 20 * 1024 * 1024) {
                                                    toast.error('Arquivo muito grande. Máximo 20MB.');
                                                    return;
                                                  }
                                                  try {
                                                    const ext = file.name.split('.').pop();
                                                    const path = `${activeMembership?.tenant_id || 'default'}/${Date.now()}.${ext}`;
                                                    const { error: uploadError } = await supabase.storage
                                                      .from('lesson-files')
                                                      .upload(path, file, { upsert: true });
                                                    if (uploadError) throw uploadError;
                                                    const { data: urlData } = supabase.storage
                                                      .from('lesson-files')
                                                      .getPublicUrl(path);
                                                    updateLesson(module.id, lesson.id, { 
                                                      file_url: urlData.publicUrl, 
                                                      file_name: file.name 
                                                    });
                                                    toast.success('Arquivo enviado!');
                                                  } catch (err) {
                                                    console.error('Upload error:', err);
                                                    toast.error('Erro ao enviar arquivo');
                                                  }
                                                }}
                                              />
                                              <label
                                                htmlFor={`file-${lesson.id}`}
                                                className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground"
                                              >
                                                <Upload className="h-4 w-4" />
                                                Enviar arquivo (PDF, DOC, XLS, PPT... até 20MB)
                                              </label>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeLesson(module.id, lesson.id)}
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Remove Module */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeModule(module.id)}
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Remover módulo
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1 gap-2">
              <Save className="h-4 w-4" />
              Salvar Trilha
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
