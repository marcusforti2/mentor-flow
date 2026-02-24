import { useState } from 'react';
import { usePopups, type TenantPopup } from '@/hooks/usePopups';
import { PopupPreviewCard } from '@/components/popups/PopupPreviewCard';
import { PopupFormDialog } from '@/components/popups/PopupFormDialog';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function Popups() {
  const { popups, dismissalCounts, isLoading, createPopup, updatePopup, deletePopup } = usePopups();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<TenantPopup | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (popup: TenantPopup) => {
    setEditingPopup(popup);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingPopup(null);
    setFormOpen(true);
  };

  const handleSubmit = (data: any) => {
    if (editingPopup) {
      updatePopup.mutate({ id: editingPopup.id, ...data }, {
        onSuccess: () => setFormOpen(false),
      });
    } else {
      createPopup.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleToggle = (id: string, active: boolean) => {
    updatePopup.mutate({ id, is_active: active });
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deletePopup.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Central de Popups
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie avisos e comunicados que aparecem para seus mentorados
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Popup
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : popups.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <h3 className="text-lg font-medium text-foreground">Nenhum popup criado</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Crie popups personalizados para comunicar novidades, convidar para grupos ou compartilhar avisos importantes com seus mentorados.
          </p>
          <Button onClick={handleCreate} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Criar primeiro popup
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popups.map(popup => (
            <PopupPreviewCard
              key={popup.id}
              popup={popup}
              dismissalCount={dismissalCounts[popup.id] || 0}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteId(id)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <PopupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        popup={editingPopup}
        onSubmit={handleSubmit}
        isSubmitting={createPopup.isPending || updatePopup.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover popup?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O popup será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
