import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlaybookMutations, usePlaybookPages, type Playbook, type PlaybookPage } from '@/hooks/usePlaybooks';
import { PlaybookTipTapEditor } from '@/components/playbooks/PlaybookTipTapEditor';
import { PlaybookAccessPanel } from '@/components/playbooks/PlaybookAccessPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Save, Check, Plus, FileText, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function PlaybookEditorPage() {
  const { playbookId } = useParams<{ playbookId: string }>();
  const navigate = useNavigate();
  const { updatePlaybook } = usePlaybookMutations();
  const queryClient = useQueryClient();
  
  const { data: playbook, isLoading } = useQuery({
    queryKey: ['playbook-detail', playbookId],
    queryFn: async () => {
      if (!playbookId) return null;
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('id', playbookId)
        .single();
      if (error) throw error;
      return data as Playbook;
    },
    enabled: !!playbookId,
  });

  const { data: pages = [], refetch: refetchPages } = usePlaybookPages(playbookId || null);

  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState(true);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [activePageContent, setActivePageContent] = useState<any>(null);

  useEffect(() => {
    if (playbook) {
      setTitle(playbook.title);
    }
  }, [playbook]);

  // Save playbook content
  const handleContentUpdate = useCallback(async (content: any) => {
    if (!playbookId) return;
    setSaved(false);
    try {
      await updatePlaybook.mutateAsync({ id: playbookId, content });
      setSaved(true);
    } catch (e) {
      // Error handled by mutation
    }
  }, [playbookId, updatePlaybook]);

  // Save page content
  const handlePageContentUpdate = useCallback(async (content: any) => {
    if (!activePage) return;
    setSaved(false);
    try {
      const { error } = await supabase
        .from('playbook_pages')
        .update({ content })
        .eq('id', activePage);
      if (error) throw error;
      setSaved(true);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar página');
    }
  }, [activePage]);

  // Save title on blur
  const handleTitleBlur = async () => {
    if (!playbookId || !title.trim() || title === playbook?.title) return;
    await updatePlaybook.mutateAsync({ id: playbookId, title });
    toast.success('Título salvo');
  };

  // Add subpage
  const handleAddPage = async () => {
    if (!playbookId || !playbook) return;
    const { data, error } = await supabase
      .from('playbook_pages')
      .insert({
        playbook_id: playbookId,
        tenant_id: playbook.tenant_id,
        title: 'Nova página',
        position: pages.length,
      })
      .select()
      .single();
    if (error) {
      toast.error('Erro ao criar página');
      return;
    }
    refetchPages();
    setActivePage(data.id);
    setActivePageContent(data.content);
    toast.success('Página criada');
  };

  // Delete subpage
  const handleDeletePage = async (pageId: string) => {
    const { error } = await supabase
      .from('playbook_pages')
      .delete()
      .eq('id', pageId);
    if (error) {
      toast.error('Erro ao excluir página');
      return;
    }
    if (activePage === pageId) {
      setActivePage(null);
      setActivePageContent(null);
    }
    refetchPages();
    toast.success('Página excluída');
  };

  // Update page title
  const handlePageTitleChange = async (pageId: string, newTitle: string) => {
    const { error } = await supabase
      .from('playbook_pages')
      .update({ title: newTitle })
      .eq('id', pageId);
    if (!error) refetchPages();
  };

  // Visibility change
  const handleVisibilityChange = async (v: string) => {
    if (!playbookId) return;
    await updatePlaybook.mutateAsync({ id: playbookId, visibility: v });
    queryClient.invalidateQueries({ queryKey: ['playbook-detail', playbookId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Playbook não encontrado.</p>
        <Button variant="link" onClick={() => navigate('/mentor/playbooks')}>Voltar</Button>
      </div>
    );
  }

  const currentContent = activePage
    ? (pages.find(p => p.id === activePage)?.content || '<p></p>')
    : (playbook.content || '<p></p>');

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/mentor/playbooks')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-xl font-bold border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto"
            placeholder="Título do playbook"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved ? (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
              <Check className="h-3 w-3" /> Salvo
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
              <Save className="h-3 w-3" /> Salvando...
            </Badge>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate('/mentor/playbooks')} className="hover:text-foreground transition-colors">Playbooks</button>
        <span>/</span>
        <button onClick={() => { setActivePage(null); setActivePageContent(null); }} className={`hover:text-foreground transition-colors ${!activePage ? 'text-foreground font-medium' : ''}`}>
          {playbook.title}
        </button>
        {activePage && (
          <>
            <span>/</span>
            <span className="text-foreground font-medium">
              {pages.find(p => p.id === activePage)?.title || 'Página'}
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* Sidebar - pages */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Páginas</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddPage} title="Nova página">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Main page */}
          <button
            onClick={() => { setActivePage(null); setActivePageContent(null); }}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              !activePage ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Página principal</span>
          </button>

          {/* Subpages */}
          {pages.map(page => (
            <div key={page.id} className="group flex items-center gap-1">
              <button
                onClick={() => { setActivePage(page.id); setActivePageContent(page.content); }}
                className={`flex-1 text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 min-w-0 ${
                  activePage === page.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{page.title}</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive"
                onClick={() => handleDeletePage(page.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Access Panel */}
          <Separator className="my-3" />
          <PlaybookAccessPanel
            playbookId={playbookId!}
            visibility={playbook.visibility}
            onVisibilityChange={handleVisibilityChange}
          />
        </div>

        {/* Editor */}
        <div>
          {activePage && (
            <Input
              value={pages.find(p => p.id === activePage)?.title || ''}
              onChange={e => handlePageTitleChange(activePage, e.target.value)}
              className="text-lg font-semibold border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto mb-3"
              placeholder="Título da página"
            />
          )}
          <PlaybookTipTapEditor
            key={activePage || 'main'}
            content={currentContent}
            onUpdate={activePage ? handlePageContentUpdate : handleContentUpdate}
          />
        </div>
      </div>
    </div>
  );
}
