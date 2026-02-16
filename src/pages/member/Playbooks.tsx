import { usePlaybooks, usePlaybookFolders, usePlaybookPages } from '@/hooks/usePlaybooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FolderOpen, FileText, Loader2, ArrowLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlaybookReadOnly } from '@/components/playbooks/PlaybookReadOnly';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { PlaybookFolder, Playbook } from '@/hooks/usePlaybooks';

export default function MentoradoPlaybooks() {
  const { data: folders = [], isLoading: foldersLoading } = usePlaybookFolders();
  const { data: playbooks = [], isLoading: playbooksLoading } = usePlaybooks();
  const [selectedFolder, setSelectedFolder] = useState<PlaybookFolder | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  // Fetch pages for selected playbook
  const { data: pages = [], isLoading: pagesLoading } = usePlaybookPages(selectedPlaybook?.id ?? null);

  // Fetch single page content
  const { data: activePage } = useQuery({
    queryKey: ['playbook-page-content', activePageId],
    queryFn: async () => {
      if (!activePageId) return null;
      const { data, error } = await supabase
        .from('playbook_pages')
        .select('*')
        .eq('id', activePageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activePageId,
  });

  const isLoading = foldersLoading || playbooksLoading;

  const visiblePlaybooks = selectedFolder
    ? playbooks.filter(p => p.folder_id === selectedFolder.id)
    : playbooks;

  // === Reading a playbook ===
  if (selectedPlaybook) {
    const currentContent = activePageId && activePage ? activePage.content : selectedPlaybook.content;
    const currentTitle = activePageId && activePage ? activePage.title : selectedPlaybook.title;

    return (
      <div className="flex flex-col md:flex-row gap-0 min-h-[calc(100vh-6rem)]">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/30 p-4 space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs -ml-2"
            onClick={() => { setSelectedPlaybook(null); setActivePageId(null); }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>

          <div>
            <h2 className="font-semibold text-foreground text-sm line-clamp-2">{selectedPlaybook.title}</h2>
            {selectedPlaybook.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selectedPlaybook.description}</p>
            )}
          </div>

          <Separator />

          {/* Pages nav */}
          <div className="space-y-0.5">
            <button
              onClick={() => setActivePageId(null)}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                !activePageId ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Página principal</span>
            </button>

            {pagesLoading ? (
              <div className="py-2 text-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : pages.map(page => (
              <button
                key={page.id}
                onClick={() => setActivePageId(page.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                  activePageId === page.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{page.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 max-w-4xl">
          <h1 className="text-2xl font-display font-bold text-foreground mb-6">{currentTitle}</h1>
          <PlaybookReadOnly content={currentContent} />
        </div>
      </div>
    );
  }

  // === Listing ===
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-6">
      <div className="flex items-center gap-3">
        {selectedFolder && (
          <Button variant="ghost" size="icon" onClick={() => setSelectedFolder(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {selectedFolder ? selectedFolder.name : 'Playbooks'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedFolder ? selectedFolder.description : 'Material operacional da sua mentoria'}
          </p>
        </div>
      </div>

      {/* Folders */}
      {!selectedFolder && folders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {folders.map(folder => {
            const count = playbooks.filter(p => p.folder_id === folder.id).length;
            if (count === 0) return null;
            return (
              <Card key={folder.id} className="glass-card hover:border-primary/30 cursor-pointer transition-all" onClick={() => setSelectedFolder(folder)}>
                <CardContent className="pt-5 pb-4 px-4">
                  <FolderOpen className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground truncate">{folder.name}</h3>
                  <p className="text-xs text-muted-foreground">{count} playbook{count !== 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Playbooks */}
      {visiblePlaybooks.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum playbook disponível</h3>
            <p className="text-muted-foreground">Seu mentor ainda não liberou playbooks para você.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiblePlaybooks.map(pb => (
            <Card
              key={pb.id}
              className="glass-card hover:border-primary/30 transition-all overflow-hidden cursor-pointer group"
              onClick={() => setSelectedPlaybook(pb)}
            >
              {pb.cover_image_url ? (
                <div className="h-32 bg-muted overflow-hidden">
                  <img src={pb.cover_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary/30" />
                </div>
              )}
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground line-clamp-1 flex-1">{pb.title}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
                {pb.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{pb.description}</p>}
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  {pb.pages_count! > 0 && (
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{pb.pages_count}</span>
                  )}
                  <span>{formatDistanceToNow(new Date(pb.updated_at), { addSuffix: true, locale: ptBR })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
