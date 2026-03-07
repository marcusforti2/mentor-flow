import { useState } from 'react';
import {
  Plus, Edit, Eye, Trash2, GripVertical, Loader2,
  BookOpen, Play, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrailEditorSheet } from '@/components/admin/TrailEditorSheet';
import { TrailPreviewModal } from '@/components/admin/TrailPreviewModal';
import { AiTrailGenerator } from '@/components/admin/AiTrailGenerator';
import { TrailScriptSender } from '@/components/admin/TrailScriptSender';
import { DriveConnectionStatus } from '@/components/admin/trail-actions/DriveConnectionStatus';
import { DriveCreateFoldersButton, DriveSyncButton } from '@/components/admin/trail-actions/DriveButtons';
import { CoverSearchButton } from '@/components/admin/trail-actions/CoverSearchButton';
import { PublishToggleButton } from '@/components/admin/trail-actions/PublishToggleButton';
import { AiLessonsButton } from '@/components/admin/trail-actions/AiLessonsButton';
import { useTrails, Trail, TrailInput } from '@/hooks/useTrails';
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

export default function AdminTrilhas() {
  const { trails, isLoading, createTrail, updateTrail, deleteTrail, invalidate } = useTrails();
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
                  <PublishToggleButton trail={trail} onDone={invalidate} />
                  <DriveCreateFoldersButton trailId={trail.id} trailTitle={trail.title} onDone={invalidate} />
                  <DriveSyncButton trailId={trail.id} trailTitle={trail.title} onDone={invalidate} />
                  <CoverSearchButton trailId={trail.id} currentTitle={trail.title} onDone={invalidate} />
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
                              onDone={invalidate}
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