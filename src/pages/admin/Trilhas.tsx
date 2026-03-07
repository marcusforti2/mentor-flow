import { useState } from 'react';
import { Plus, Edit, Eye, Trash2, GripVertical, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrailEditorSheet } from '@/components/admin/TrailEditorSheet';
import { TrailPreviewModal } from '@/components/admin/TrailPreviewModal';
import { AiTrailGenerator } from '@/components/admin/AiTrailGenerator';
import { TrailScriptSender } from '@/components/admin/TrailScriptSender';
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
  const { trails, isLoading, createTrail, updateTrail, deleteTrail } = useTrails();
  const [editingTrail, setEditingTrail] = useState<Trail | null>(null);
  const [previewTrail, setPreviewTrail] = useState<Trail | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreateNew = () => {
    setEditingTrail(null);
    setIsCreating(true);
  };

  const handleEdit = (trail: Trail) => {
    setEditingTrail(trail);
    setIsCreating(true);
  };

  const handlePreview = (trail: Trail) => {
    setPreviewTrail(trail);
  };

  const handleDelete = (trailId: string) => {
    setDeleteConfirm(trailId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteTrail.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleSave = (trailData: TrailInput) => {
    if (editingTrail) {
      updateTrail.mutate({ ...trailData, id: editingTrail.id });
    } else {
      createTrail.mutate(trailData);
    }
    setIsCreating(false);
  };

  const handleAiTrailCreated = (trailData: TrailInput) => {
    createTrail.mutate(trailData);
  };

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
          <h1 className="text-2xl font-display font-bold text-foreground">
            Gerenciar Trilhas
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e edite trilhas de conteúdo para seus mentorados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AiTrailGenerator onTrailCreated={handleAiTrailCreated} />
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Trilha
          </Button>
        </div>
      </div>

      {/* Trail List */}
      <div className="grid gap-4">
        {trails.map((trail) => (
          <Card
            key={trail.id}
            className={cn(
              "glass-card border-border/50 hover:border-primary/30 transition-all duration-300",
              "group"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Drag Handle */}
                <div className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* Thumbnail */}
                <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={trail.thumbnail_url}
                    alt={trail.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {trail.title}
                    </h3>
                    <Badge variant={trail.is_featured ? "default" : "secondary"}>
                      {trail.is_featured ? "Destaque" : "Normal"}
                    </Badge>
                    {!trail.is_published && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Rascunho
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                    {trail.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{trail.modules.length} módulos</span>
                    <span>{trail.total_lessons} aulas</span>
                    <span>{formatDuration(trail.total_duration)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TrailScriptSender
                    trail={trail}
                    lessons={trail.modules.flatMap(m => m.lessons)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePreview(trail)}
                    className="h-9 w-9 hover:bg-accent/20 hover:text-accent"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(trail)}
                    className="h-9 w-9 hover:bg-primary/20 hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(trail.id)}
                    className="h-9 w-9 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {trails.length === 0 && (
          <Card className="glass-card border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Você ainda não criou nenhuma trilha
              </p>
              <div className="flex items-center justify-center gap-3">
                <AiTrailGenerator onTrailCreated={handleAiTrailCreated} />
                <Button onClick={handleCreateNew} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar manualmente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Editor Sheet */}
      <TrailEditorSheet
        open={isCreating}
        onOpenChange={setIsCreating}
        trail={editingTrail}
        onSave={handleSave}
      />

      {/* Preview Modal */}
      <TrailPreviewModal
        open={!!previewTrail}
        onOpenChange={(open) => !open && setPreviewTrail(null)}
        trail={previewTrail}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Trilha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta trilha? Esta ação não pode ser desfeita.
              Todos os módulos e aulas serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
