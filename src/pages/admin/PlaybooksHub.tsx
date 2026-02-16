import { useState } from 'react';
import { usePlaybookFolders, usePlaybooks, usePlaybookMutations, type PlaybookFolder, type Playbook } from '@/hooks/usePlaybooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BookOpen, Plus, FolderPlus, Search, MoreVertical, Edit3, Trash2,
  Loader2, Lock, Users, UserCheck, Globe, FileText, FolderOpen, ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const visibilityConfig = {
  mentor_only: { label: 'Somente mentor', icon: Lock, color: 'text-amber-500' },
  all_mentees: { label: 'Todos mentorados', icon: Users, color: 'text-green-500' },
  specific_mentees: { label: 'Mentorados específicos', icon: UserCheck, color: 'text-blue-500' },
  public: { label: 'Público', icon: Globe, color: 'text-purple-500' },
};

export default function PlaybooksHub() {
  const { data: folders = [], isLoading: foldersLoading } = usePlaybookFolders();
  const { data: playbooks = [], isLoading: playbooksLoading } = usePlaybooks();
  const { createFolder, updateFolder, deleteFolder, createPlaybook, updatePlaybook, deletePlaybook } = usePlaybookMutations();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');

  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [playbookDialogOpen, setPlaybookDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<PlaybookFolder | null>(null);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'playbook'; id: string; name: string } | null>(null);

  // Form states
  const [folderForm, setFolderForm] = useState({ name: '', description: '' });
  const [playbookForm, setPlaybookForm] = useState({ title: '', description: '', folder_id: '', visibility: 'mentor_only' });

  // Selected folder view
  const [selectedFolder, setSelectedFolder] = useState<PlaybookFolder | null>(null);

  const isLoading = foldersLoading || playbooksLoading;

  // Filter playbooks
  const filteredPlaybooks = playbooks.filter(pb => {
    if (selectedFolder && pb.folder_id !== selectedFolder.id) return false;
    if (!selectedFolder && filterFolder !== 'all') {
      if (filterFolder === 'none' && pb.folder_id !== null) return false;
      if (filterFolder !== 'none' && pb.folder_id !== filterFolder) return false;
    }
    if (filterVisibility !== 'all' && pb.visibility !== filterVisibility) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return pb.title.toLowerCase().includes(s) || pb.description?.toLowerCase().includes(s);
    }
    return true;
  });

  // Handlers
  const handleOpenFolderDialog = (folder?: PlaybookFolder) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderForm({ name: folder.name, description: folder.description || '' });
    } else {
      setEditingFolder(null);
      setFolderForm({ name: '', description: '' });
    }
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) return;
    if (editingFolder) {
      await updateFolder.mutateAsync({ id: editingFolder.id, name: folderForm.name, description: folderForm.description });
    } else {
      await createFolder.mutateAsync({ name: folderForm.name, description: folderForm.description });
    }
    setFolderDialogOpen(false);
  };

  const handleOpenPlaybookDialog = (playbook?: Playbook) => {
    if (playbook) {
      setEditingPlaybook(playbook);
      setPlaybookForm({
        title: playbook.title,
        description: playbook.description || '',
        folder_id: playbook.folder_id || '',
        visibility: playbook.visibility,
      });
    } else {
      setEditingPlaybook(null);
      setPlaybookForm({
        title: '',
        description: '',
        folder_id: selectedFolder?.id || '',
        visibility: 'mentor_only',
      });
    }
    setPlaybookDialogOpen(true);
  };

  const handleSavePlaybook = async () => {
    if (!playbookForm.title.trim()) return;
    if (editingPlaybook) {
      await updatePlaybook.mutateAsync({
        id: editingPlaybook.id,
        title: playbookForm.title,
        description: playbookForm.description,
        folder_id: playbookForm.folder_id || null,
        visibility: playbookForm.visibility,
      });
    } else {
      await createPlaybook.mutateAsync({
        title: playbookForm.title,
        description: playbookForm.description,
        folder_id: playbookForm.folder_id || null,
        visibility: playbookForm.visibility,
      });
    }
    setPlaybookDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'folder') {
      await deleteFolder.mutateAsync(deleteTarget.id);
      if (selectedFolder?.id === deleteTarget.id) setSelectedFolder(null);
    } else {
      await deletePlaybook.mutateAsync(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedFolder && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedFolder(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {selectedFolder ? selectedFolder.name : 'Playbooks Hub'}
            </h1>
            <p className="text-muted-foreground">
              {selectedFolder
                ? selectedFolder.description || 'Playbooks desta pasta'
                : 'O cérebro operacional do mentor. Conhecimento que governa a execução.'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!selectedFolder && (
            <Button variant="outline" size="sm" onClick={() => handleOpenFolderDialog()}>
              <FolderPlus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Nova Pasta</span>
            </Button>
          )}
          <Button className="gradient-gold text-primary-foreground" size="sm" onClick={() => handleOpenPlaybookDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Playbook
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      {selectedFolder && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => setSelectedFolder(null)} className="hover:text-foreground transition-colors">
            Playbooks
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">{selectedFolder.name}</span>
        </div>
      )}

      {/* Filters */}
      {!selectedFolder && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar playbooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterFolder} onValueChange={setFilterFolder}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Pasta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as pastas</SelectItem>
              <SelectItem value="none">Sem pasta</SelectItem>
              {folders.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterVisibility} onValueChange={setFilterVisibility}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Visibilidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="mentor_only">Somente mentor</SelectItem>
              <SelectItem value="all_mentees">Todos mentorados</SelectItem>
              <SelectItem value="specific_mentees">Específicos</SelectItem>
              <SelectItem value="public">Público</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Folders Grid (only on root view) */}
      {!selectedFolder && folders.length > 0 && filterFolder === 'all' && !searchTerm && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Pastas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {folders.map(folder => {
              const count = playbooks.filter(p => p.folder_id === folder.id).length;
              return (
                <Card
                  key={folder.id}
                  className="glass-card hover:border-primary/30 cursor-pointer transition-all group"
                  onClick={() => setSelectedFolder(folder)}
                >
                  <CardContent className="pt-5 pb-4 px-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => handleOpenFolderDialog(folder)}>
                            <Edit3 className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-semibold text-foreground truncate">{folder.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{count} playbook{count !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Playbooks Grid */}
      <div>
        {!selectedFolder && !searchTerm && filterFolder === 'all' && folders.length > 0 && (
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Playbooks</h2>
        )}

        {filteredPlaybooks.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? 'Nenhum resultado' : 'Nenhum playbook ainda'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente ajustar a busca.' : 'Crie seu primeiro playbook para centralizar seu conhecimento operacional.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => handleOpenPlaybookDialog()} className="gradient-gold text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Playbook
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlaybooks.map(pb => {
              const vis = visibilityConfig[pb.visibility];
              const VisIcon = vis.icon;
              return (
                <Card
                  key={pb.id}
                  className="glass-card hover:border-primary/30 transition-all group overflow-hidden"
                >
                  {/* Cover image */}
                  {pb.cover_image_url ? (
                    <div className="h-36 bg-muted overflow-hidden">
                      <img src={pb.cover_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-primary/30" />
                    </div>
                  )}

                  <CardContent className="pt-4 pb-4 px-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground line-clamp-1 flex-1">{pb.title}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenPlaybookDialog(pb)}>
                            <Edit3 className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget({ type: 'playbook', id: pb.id, name: pb.title })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {pb.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{pb.description}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <VisIcon className={`h-3.5 w-3.5 ${vis.color}`} />
                          {vis.label}
                        </span>
                        {pb.pages_count! > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {pb.pages_count}
                          </span>
                        )}
                      </div>
                      <span>{formatDistanceToNow(new Date(pb.updated_at), { addSuffix: true, locale: ptBR })}</span>
                    </div>

                    {pb.folder_name && !selectedFolder && (
                      <Badge variant="outline" className="mt-2 text-xs">{pb.folder_name}</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Editar Pasta' : 'Nova Pasta'}</DialogTitle>
            <DialogDescription>Organize seus playbooks em pastas temáticas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome *</Label>
              <Input value={folderForm.name} onChange={e => setFolderForm({ ...folderForm, name: e.target.value })} placeholder="Ex: Prospecção" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={folderForm.description} onChange={e => setFolderForm({ ...folderForm, description: e.target.value })} placeholder="Descrição opcional..." rows={2} />
            </div>
            <Button onClick={handleSaveFolder} disabled={!folderForm.name.trim() || createFolder.isPending || updateFolder.isPending} className="w-full">
              {(createFolder.isPending || updateFolder.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingFolder ? 'Salvar' : 'Criar Pasta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Playbook Dialog */}
      <Dialog open={playbookDialogOpen} onOpenChange={setPlaybookDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlaybook ? 'Editar Playbook' : 'Novo Playbook'}</DialogTitle>
            <DialogDescription>Configure título, pasta e visibilidade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título *</Label>
              <Input value={playbookForm.title} onChange={e => setPlaybookForm({ ...playbookForm, title: e.target.value })} placeholder="Ex: Playbook de Prospecção" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={playbookForm.description} onChange={e => setPlaybookForm({ ...playbookForm, description: e.target.value })} placeholder="Do que se trata este playbook?" rows={2} />
            </div>
            <div>
              <Label>Pasta</Label>
              <Select value={playbookForm.folder_id || 'none'} onValueChange={v => setPlaybookForm({ ...playbookForm, folder_id: v === 'none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pasta</SelectItem>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibilidade</Label>
              <Select value={playbookForm.visibility} onValueChange={v => setPlaybookForm({ ...playbookForm, visibility: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentor_only">🔒 Somente mentor</SelectItem>
                  <SelectItem value="all_mentees">👥 Todos os mentorados</SelectItem>
                  <SelectItem value="specific_mentees">🎯 Mentorados específicos</SelectItem>
                  <SelectItem value="public">🌐 Público</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSavePlaybook} disabled={!playbookForm.title.trim() || createPlaybook.isPending || updatePlaybook.isPending} className="w-full">
              {(createPlaybook.isPending || updatePlaybook.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingPlaybook ? 'Salvar' : 'Criar Playbook'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteTarget?.type === 'folder' ? 'pasta' : 'playbook'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'folder'
                ? `A pasta "${deleteTarget.name}" será excluída. Playbooks dentro dela ficarão sem pasta.`
                : `O playbook "${deleteTarget?.name}" será excluído permanentemente, incluindo todas as páginas internas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
