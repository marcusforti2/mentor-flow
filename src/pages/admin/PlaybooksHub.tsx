import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CoverImageUpload } from '@/components/playbooks/CoverImageUpload';
import { EmojiPicker } from '@/components/playbooks/EmojiPicker';
import { useNavigate } from 'react-router-dom';
import { usePlaybookFolders, usePlaybooks, usePlaybookMutations, useRecentPlaybooks, usePlaybookAnalytics, type PlaybookFolder, type Playbook } from '@/hooks/usePlaybooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BookOpen, Plus, FolderPlus, Search, MoreVertical, Edit3, Trash2,
  Loader2, Lock, Users, UserCheck, Globe, FileText, FolderOpen, ArrowLeft,
  LayoutGrid, List, Pin, PinOff, Copy, FolderInput, GripVertical, LayoutTemplate, Eye, TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const visibilityConfig: Record<string, { label: string; icon: any; color: string }> = {
  mentor_only: { label: 'Somente mentor', icon: Lock, color: 'text-amber-500' },
  all_mentees: { label: 'Todos mentorados', icon: Users, color: 'text-green-500' },
  specific_mentees: { label: 'Mentorados específicos', icon: UserCheck, color: 'text-blue-500' },
  public: { label: 'Público', icon: Globe, color: 'text-purple-500' },
};

const PLAYBOOK_TEMPLATES = [
  {
    id: 'onboarding',
    icon: '🚀',
    title: 'Onboarding do Mentorado',
    description: 'Guia completo para receber e integrar novos mentorados ao programa.',
    pages: [
      { title: 'Boas-vindas', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Boas-vindas ao Programa' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Parabéns por fazer parte! Aqui você encontra tudo que precisa para começar sua jornada.' }] }, { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'O que esperar' }] }, { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sessões semanais de mentoria' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Acesso a materiais exclusivos' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Comunidade de apoio' }] }] }] }] } },
      { title: 'Primeiros Passos', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Primeiros Passos' }] }, { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Complete seu perfil com foto e informações do negócio' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Assista o vídeo de orientação' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Agende sua primeira sessão' }] }] }] }] } },
      { title: 'Regras e Compromissos', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Regras e Compromissos' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Para que sua experiência seja a melhor possível, siga estas diretrizes:' }] }] } },
    ],
  },
  {
    id: 'sales-process',
    icon: '💰',
    title: 'Processo de Vendas',
    description: 'Estrutura completa do processo comercial com scripts e objeções.',
    pages: [
      { title: 'Funil de Vendas', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Funil de Vendas' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Estrutura do funil comercial com etapas e métricas de conversão.' }] }] } },
      { title: 'Scripts de Abordagem', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Scripts de Abordagem' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Modelos prontos para prospecção ativa e passiva.' }] }] } },
      { title: 'Quebra de Objeções', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Quebra de Objeções' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'As objeções mais comuns e como responder cada uma.' }] }] } },
    ],
  },
  {
    id: 'weekly-routine',
    icon: '📅',
    title: 'Rotina Semanal',
    description: 'Modelo de organização semanal para alta performance.',
    pages: [
      { title: 'Planejamento Semanal', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Planejamento Semanal' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Template para planejar suas atividades da semana.' }] }] } },
      { title: 'Checklist Diário', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Checklist Diário' }] }, { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Revisar metas do dia' }] }] }, { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Prospecção ativa (1h)' }] }] }, { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Follow-ups pendentes' }] }] }] }] } },
    ],
  },
  {
    id: 'mindset',
    icon: '🧠',
    title: 'Mindset & Desenvolvimento',
    description: 'Framework de desenvolvimento pessoal e mentalidade empreendedora.',
    pages: [
      { title: 'Pilares do Mindset', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Pilares do Mindset Empreendedor' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Os fundamentos para construir uma mentalidade de crescimento.' }] }] } },
      { title: 'Exercícios Práticos', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Exercícios Práticos' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Atividades para fortalecer sua mentalidade diariamente.' }] }] } },
    ],
  },
  {
    id: 'client-success',
    icon: '🏆',
    title: 'Sucesso do Cliente',
    description: 'Processo de acompanhamento e retenção de clientes.',
    pages: [
      { title: 'Jornada do Cliente', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Jornada do Cliente' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Mapa completo da experiência do cliente do onboarding ao sucesso.' }] }] } },
      { title: 'Métricas de Sucesso', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Métricas de Sucesso' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'KPIs para medir saúde e satisfação dos clientes.' }] }] } },
    ],
  },
  {
    id: 'social-media',
    icon: '📱',
    title: 'Conteúdo & Social Media',
    description: 'Estratégia de conteúdo e calendário editorial.',
    pages: [
      { title: 'Estratégia de Conteúdo', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Estratégia de Conteúdo' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Defina pilares de conteúdo, formatos e frequência de publicação.' }] }] } },
      { title: 'Calendário Editorial', content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Calendário Editorial' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Organize suas publicações semanais com antecedência.' }] }] } },
    ],
  },
];

export default function PlaybooksHub() {
  const navigate = useNavigate();
  const { data: folders = [], isLoading: foldersLoading } = usePlaybookFolders();
  const { data: playbooks = [], isLoading: playbooksLoading } = usePlaybooks();
  const { createFolder, updateFolder, deleteFolder, createPlaybook, updatePlaybook, deletePlaybook, togglePinFolder, togglePinPlaybook, duplicatePlaybook, trackPlaybookView, reorderFolders, reorderPlaybooks } = usePlaybookMutations();
  const { data: recentPlaybooks = [] } = useRecentPlaybooks(5);
  const { data: analytics } = usePlaybookAnalytics();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');

  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [playbookDialogOpen, setPlaybookDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<PlaybookFolder | null>(null);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'playbook'; id: string; name: string } | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Form states
  const [folderForm, setFolderForm] = useState({ name: '', description: '', cover_image_url: '', cover_position: 'center' as string, icon: '📁' });
  const [playbookForm, setPlaybookForm] = useState({ title: '', description: '', folder_id: '', visibility: 'mentor_only' });

  // Selected folder view
  const [selectedFolder, setSelectedFolder] = useState<PlaybookFolder | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const handleFolderDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ordered = [...filteredFolders];
    const fromIdx = ordered.findIndex(f => f.id === dragId);
    const toIdx = ordered.findIndex(f => f.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    reorderFolders.mutate(ordered.map((f, i) => ({ id: f.id, position: i })));
    setDragId(null);
  };

  const handlePlaybookDrop = (targetId: string, list: Playbook[]) => {
    if (!dragId || dragId === targetId) return;
    const ordered = [...list];
    const fromIdx = ordered.findIndex(p => p.id === dragId);
    const toIdx = ordered.findIndex(p => p.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    reorderPlaybooks.mutate(ordered.map((p, i) => ({ id: p.id, position: i })));
    setDragId(null);
  };

  const isLoading = foldersLoading || playbooksLoading;

  // Filter playbooks when inside a folder
  const folderPlaybooks = selectedFolder
    ? playbooks.filter(pb => pb.folder_id === selectedFolder.id)
    : [];

  // Filtered for search
  const filteredFolders = folders.filter(f => {
    if (!searchTerm) return true;
    return f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => (a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1));

  const filteredPlaybooks = folderPlaybooks.filter(pb => {
    if (!searchTerm) return true;
    return pb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pb.description?.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => (a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1));

  // Orphan playbooks (no folder)
  const orphanPlaybooks = playbooks.filter(pb => !pb.folder_id);

  const handleOpenPlaybook = (pb: Playbook) => {
    trackPlaybookView.mutate(pb.id);
    navigate(`/mentor/playbooks/${pb.id}`);
  };

  // Handlers
  const handleOpenFolderDialog = (folder?: PlaybookFolder) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderForm({ name: folder.name, description: folder.description || '', cover_image_url: folder.cover_image_url || '', cover_position: folder.cover_position || 'center', icon: folder.icon || '📁' });
    } else {
      setEditingFolder(null);
      setFolderForm({ name: '', description: '', cover_image_url: '', cover_position: 'center', icon: '📁' });
    }
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) return;
    if (editingFolder) {
      await updateFolder.mutateAsync({ id: editingFolder.id, name: folderForm.name, description: folderForm.description, cover_image_url: folderForm.cover_image_url || null, cover_position: folderForm.cover_position, icon: folderForm.icon });
    } else {
      await createFolder.mutateAsync({ name: folderForm.name, description: folderForm.description, cover_image_url: folderForm.cover_image_url || null, cover_position: folderForm.cover_position, icon: folderForm.icon });
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

  const handleCreateFromTemplate = async (template: typeof PLAYBOOK_TEMPLATES[0]) => {
    try {
      const result = await createPlaybook.mutateAsync({
        title: template.title,
        description: template.description,
        folder_id: selectedFolder?.id || null,
        visibility: 'mentor_only',
      });
      if (result && template.pages.length > 0) {
        const pages = template.pages.map((p, i) => ({
          playbook_id: result.id,
          tenant_id: result.tenant_id,
          title: p.title,
          content: p.content,
          position: i,
        }));
        await supabase.from('playbook_pages').insert(pages);
      }
      setTemplateDialogOpen(false);
      if (result) {
        navigate(`/mentor/playbooks/${result.id}`);
      }
    } catch (e) {
      // error already handled by mutation
    }
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
            <Button variant="ghost" size="icon" onClick={() => { setSelectedFolder(null); setSearchTerm(''); }}>
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
          {/* View toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('gallery')}
              className={`p-2 transition-colors ${viewMode === 'gallery' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
            <LayoutTemplate className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Templates</span>
          </Button>
          {!selectedFolder && (
            <Button variant="outline" size="sm" onClick={() => handleOpenFolderDialog()}>
              <FolderPlus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Nova Pasta</span>
            </Button>
          )}
          {selectedFolder && (
            <Button className="gradient-gold text-primary-foreground" size="sm" onClick={() => handleOpenPlaybookDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Playbook
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      {selectedFolder && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => { setSelectedFolder(null); setSearchTerm(''); }} className="hover:text-foreground transition-colors">
            Playbooks
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">{selectedFolder.name}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={selectedFolder ? 'Buscar playbooks...' : 'Buscar pastas...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* === ANALYTICS === */}
      {!selectedFolder && !searchTerm && analytics && analytics.totalViews > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics.totalViews}</p>
                <p className="text-xs text-muted-foreground">Visualizações</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics.uniqueViewers}</p>
                <p className="text-xs text-muted-foreground">Leitores únicos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <TrendingUp className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics.recentViews}</p>
                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">🔥 Mais acessados</p>
              <div className="space-y-1">
                {analytics.topPlaybooks.slice(0, 3).map((tp, i) => (
                  <div key={tp.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate flex-1 mr-2">{i + 1}. {tp.title}</span>
                    <span className="text-muted-foreground shrink-0">{tp.views}x</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedFolder && !searchTerm && recentPlaybooks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            🕐 Acessados recentemente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {recentPlaybooks.map(pb => (
              <Card
                key={pb.id}
                className="glass-card hover:border-primary/30 cursor-pointer transition-all group"
                onClick={() => handleOpenPlaybook(pb)}
              >
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{pb.title}</p>
                  {pb.folder_name && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" /> {pb.folder_name}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* === ROOT VIEW: Only Folders === */}
      {!selectedFolder && (
        <>
          {filteredFolders.length === 0 && orphanPlaybooks.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-16 text-center">
                <BookOpen className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma pasta criada</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Organize seus playbooks em pastas temáticas. Cada pasta pode ter uma imagem de capa personalizada.
                </p>
                <Button onClick={() => handleOpenFolderDialog()} className="gradient-gold text-primary-foreground">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Criar Primeira Pasta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Gallery View */}
              {viewMode === 'gallery' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredFolders.map(folder => {
                    const count = playbooks.filter(p => p.folder_id === folder.id).length;
                    return (
                      <FolderCardGallery
                        key={folder.id}
                        folder={folder}
                        playbookCount={count}
                        onClick={() => setSelectedFolder(folder)}
                        onEdit={() => handleOpenFolderDialog(folder)}
                        onDelete={() => setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })}
                        onTogglePin={() => togglePinFolder.mutate({ id: folder.id, is_pinned: !folder.is_pinned })}
                        onDragStart={() => setDragId(folder.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleFolderDrop(folder.id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFolders.map(folder => {
                    const count = playbooks.filter(p => p.folder_id === folder.id).length;
                    return (
                      <FolderCardList
                        key={folder.id}
                        folder={folder}
                        playbookCount={count}
                        onClick={() => setSelectedFolder(folder)}
                        onEdit={() => handleOpenFolderDialog(folder)}
                        onDelete={() => setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })}
                        onTogglePin={() => togglePinFolder.mutate({ id: folder.id, is_pinned: !folder.is_pinned })}
                        onDragStart={() => setDragId(folder.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleFolderDrop(folder.id)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Orphan playbooks */}
              {orphanPlaybooks.length > 0 && !searchTerm && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sem pasta</h2>
                    <Button className="gradient-gold text-primary-foreground" size="sm" onClick={() => handleOpenPlaybookDialog()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Novo Playbook
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orphanPlaybooks.map(pb => (
                      <PlaybookCard
                        key={pb.id}
                        playbook={pb}
                        onClick={() => handleOpenPlaybook(pb)}
                        onEdit={() => handleOpenPlaybookDialog(pb)}
                        onDelete={() => setDeleteTarget({ type: 'playbook', id: pb.id, name: pb.title })}
                        onTogglePin={() => togglePinPlaybook.mutate({ id: pb.id, is_pinned: !pb.is_pinned })}
                        onDuplicate={() => duplicatePlaybook.mutate(pb.id)}
                        onMove={(folderId) => updatePlaybook.mutate({ id: pb.id, folder_id: folderId })}
                        folders={folders}
                        onDragStart={() => setDragId(pb.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handlePlaybookDrop(pb.id, orphanPlaybooks)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* === FOLDER VIEW: Playbooks inside === */}
      {selectedFolder && (
        <>
          {filteredPlaybooks.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm ? 'Nenhum resultado' : 'Pasta vazia'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Tente ajustar a busca.' : 'Adicione playbooks a esta pasta.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => handleOpenPlaybookDialog()} className="gradient-gold text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Playbook
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'gallery' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlaybooks.map(pb => (
                <PlaybookCard
                  key={pb.id}
                  playbook={pb}
                  onClick={() => handleOpenPlaybook(pb)}
                  onEdit={() => handleOpenPlaybookDialog(pb)}
                  onDelete={() => setDeleteTarget({ type: 'playbook', id: pb.id, name: pb.title })}
                  onTogglePin={() => togglePinPlaybook.mutate({ id: pb.id, is_pinned: !pb.is_pinned })}
                  onDuplicate={() => duplicatePlaybook.mutate(pb.id)}
                  onMove={(folderId) => updatePlaybook.mutate({ id: pb.id, folder_id: folderId })}
                  folders={folders}
                  onDragStart={() => setDragId(pb.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handlePlaybookDrop(pb.id, filteredPlaybooks)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlaybooks.map(pb => (
                <PlaybookCardList
                  key={pb.id}
                  playbook={pb}
                  onClick={() => handleOpenPlaybook(pb)}
                  onEdit={() => handleOpenPlaybookDialog(pb)}
                  onDelete={() => setDeleteTarget({ type: 'playbook', id: pb.id, name: pb.title })}
                  onTogglePin={() => togglePinPlaybook.mutate({ id: pb.id, is_pinned: !pb.is_pinned })}
                  onDuplicate={() => duplicatePlaybook.mutate(pb.id)}
                  onMove={(folderId) => updatePlaybook.mutate({ id: pb.id, folder_id: folderId })}
                  folders={folders}
                  onDragStart={() => setDragId(pb.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handlePlaybookDrop(pb.id, filteredPlaybooks)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Editar Pasta' : 'Nova Pasta'}</DialogTitle>
            <DialogDescription>Organize seus playbooks em pastas temáticas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block">Imagem de Capa</Label>
              <CoverImageUpload
                currentUrl={folderForm.cover_image_url || null}
                folder="folders"
                coverPosition={(folderForm.cover_position || 'center') as 'top' | 'center' | 'bottom'}
                onUploaded={(url) => setFolderForm({ ...folderForm, cover_image_url: url })}
                onRemoved={() => setFolderForm({ ...folderForm, cover_image_url: '' })}
                onPositionChange={(pos) => setFolderForm({ ...folderForm, cover_position: pos })}
              />
            </div>
            <div>
              <Label>Ícone & Nome *</Label>
              <div className="flex items-center gap-2 mt-1">
                <EmojiPicker value={folderForm.icon} onChange={(emoji) => setFolderForm({ ...folderForm, icon: emoji })} />
                <Input value={folderForm.name} onChange={e => setFolderForm({ ...folderForm, name: e.target.value })} placeholder="Ex: Prospecção" className="flex-1" />
              </div>
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

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Criar a partir de template
            </DialogTitle>
            <DialogDescription>Escolha um modelo pré-definido para começar rapidamente.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {PLAYBOOK_TEMPLATES.map(tpl => (
              <Card
                key={tpl.id}
                className="glass-card hover:border-primary/30 cursor-pointer transition-all group"
                onClick={() => handleCreateFromTemplate(tpl)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm">{tpl.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tpl.pages.length} página{tpl.pages.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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

/* ========== Helpers ========== */

const coverPositionClass = (pos?: string) => {
  if (pos === 'top') return 'object-top';
  if (pos === 'bottom') return 'object-bottom';
  return 'object-center';
};

/* ========== Sub-components ========== */

function FolderCardGallery({
  folder, playbookCount, onClick, onEdit, onDelete, onTogglePin, onDragStart, onDragOver, onDrop,
}: {
  folder: PlaybookFolder;
  playbookCount: number;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    <Card
      className={`glass-card hover:border-primary/30 cursor-pointer transition-all group overflow-hidden ${folder.is_pinned ? 'ring-1 ring-primary/30' : ''}`}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Cover image - Notion-style */}
      <div className="relative h-44 overflow-hidden">
        {folder.cover_image_url ? (
          <img
            src={folder.cover_image_url}
            alt=""
            className={`w-full h-full object-cover ${coverPositionClass(folder.cover_position)} transition-transform duration-500 group-hover:scale-105`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-primary/30" />
          </div>
        )}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Text on image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-lg">
            <span className="mr-1.5">{folder.icon || '📁'}</span>{folder.name}
          </h3>
          {folder.description && (
            <p className="text-white/70 text-xs mt-1 line-clamp-1">{folder.description}</p>
          )}
        </div>

        {/* Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onTogglePin}>
                {folder.is_pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                {folder.is_pinned ? 'Desafixar' : 'Fixar no topo'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Footer */}
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {folder.is_pinned && <Pin className="h-3 w-3 text-primary" />}
            <FileText className="h-3.5 w-3.5" />
            {playbookCount} playbook{playbookCount !== 1 ? 's' : ''}
          </span>
          <span>{formatDistanceToNow(new Date(folder.updated_at), { addSuffix: true, locale: ptBR })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function FolderCardList({
  folder, playbookCount, onClick, onEdit, onDelete, onTogglePin, onDragStart, onDragOver, onDrop,
}: {
  folder: PlaybookFolder;
  playbookCount: number;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    <Card
      className="glass-card hover:border-primary/30 cursor-pointer transition-all group"
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardContent className="py-3 px-4 flex items-center gap-4">
        {/* Thumbnail */}
        <div className="h-14 w-20 rounded-lg overflow-hidden shrink-0">
          {folder.cover_image_url ? (
            <img src={folder.cover_image_url} alt="" className={`w-full h-full object-cover ${coverPositionClass(folder.cover_position)}`} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate"><span className="mr-1.5">{folder.icon || '📁'}</span>{folder.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {playbookCount} playbook{playbookCount !== 1 ? 's' : ''}
            {folder.description && ` • ${folder.description}`}
          </p>
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onTogglePin}>
                {folder.is_pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                {folder.is_pinned ? 'Desafixar' : 'Fixar no topo'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function PlaybookCard({
  playbook, onClick, onEdit, onDelete, onTogglePin, onDuplicate, onMove, folders, onDragStart, onDragOver, onDrop,
}: {
  playbook: Playbook;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onMove: (folderId: string | null) => void;
  folders: PlaybookFolder[];
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const vis = visibilityConfig[playbook.visibility] || visibilityConfig.mentor_only;
  const VisIcon = vis.icon;

  return (
    <Card
      className="glass-card hover:border-primary/30 transition-all group overflow-hidden cursor-pointer"
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="relative h-44 overflow-hidden">
        {playbook.cover_image_url ? (
          <img src={playbook.cover_image_url} alt="" className={`w-full h-full object-cover ${coverPositionClass(playbook.cover_position)} transition-transform duration-500 group-hover:scale-105`} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-lg">
            {playbook.title}
          </h3>
          {playbook.description && (
            <p className="text-white/70 text-xs mt-1 line-clamp-1">{playbook.description}</p>
          )}
        </div>
      </div>

      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <VisIcon className={`h-3.5 w-3.5 ${vis.color}`} />
              {vis.label}
            </span>
            {(playbook.pages_count ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {playbook.pages_count} pág.
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onTogglePin}>
                {playbook.is_pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                {playbook.is_pinned ? 'Desafixar' : 'Fixar no topo'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              {folders.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" /> Mover para
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {playbook.folder_id && (
                      <DropdownMenuItem onClick={() => onMove(null)}>
                        📂 Sem pasta
                      </DropdownMenuItem>
                    )}
                    {folders.filter(f => f.id !== playbook.folder_id).map(f => (
                      <DropdownMenuItem key={f.id} onClick={() => onMove(f.id)}>
                        {f.icon} {f.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(playbook.updated_at), { addSuffix: true, locale: ptBR })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PlaybookCardList({
  playbook, onClick, onEdit, onDelete, onTogglePin, onDuplicate, onMove, folders, onDragStart, onDragOver, onDrop,
}: {
  playbook: Playbook;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onMove: (folderId: string | null) => void;
  folders: PlaybookFolder[];
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const vis = visibilityConfig[playbook.visibility] || visibilityConfig.mentor_only;
  const VisIcon = vis.icon;

  return (
    <Card
      className="glass-card hover:border-primary/30 cursor-pointer transition-all group"
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardContent className="py-3 px-4 flex items-center gap-4">
        <div className="h-12 w-16 rounded-lg overflow-hidden shrink-0 bg-muted">
          {playbook.cover_image_url ? (
            <img src={playbook.cover_image_url} alt="" className={`w-full h-full object-cover ${coverPositionClass(playbook.cover_position)}`} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary/30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{playbook.title}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <VisIcon className={`h-3 w-3 ${vis.color}`} />
              {vis.label}
            </span>
            {(playbook.pages_count ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {playbook.pages_count} pág.
              </span>
            )}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onTogglePin}>
                {playbook.is_pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                {playbook.is_pinned ? 'Desafixar' : 'Fixar no topo'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              {folders.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" /> Mover para
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {playbook.folder_id && (
                      <DropdownMenuItem onClick={() => onMove(null)}>
                        📂 Sem pasta
                      </DropdownMenuItem>
                    )}
                    {folders.filter(f => f.id !== playbook.folder_id).map(f => (
                      <DropdownMenuItem key={f.id} onClick={() => onMove(f.id)}>
                        {f.icon} {f.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
