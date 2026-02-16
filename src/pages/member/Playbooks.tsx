import { usePlaybooks, usePlaybookFolders, usePlaybookPages } from '@/hooks/usePlaybooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, FolderOpen, FileText, Loader2, ArrowLeft, ChevronRight, Search, LayoutGrid, List } from 'lucide-react';
import { useState, useMemo } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');

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

  // Folders with playbook counts (only show folders that have accessible playbooks)
  const foldersWithCounts = useMemo(() => {
    return folders.map(f => ({
      ...f,
      count: playbooks.filter(p => p.folder_id === f.id).length,
    })).filter(f => f.count > 0);
  }, [folders, playbooks]);

  // Filter logic
  const filteredItems = useMemo(() => {
    const s = searchTerm.toLowerCase();
    if (selectedFolder) {
      return playbooks.filter(p =>
        p.folder_id === selectedFolder.id &&
        (!s || p.title.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s))
      );
    }
    // Root: filter folders
    const filteredFolders = foldersWithCounts.filter(f =>
      !s || f.name.toLowerCase().includes(s) || f.description?.toLowerCase().includes(s)
    );
    // Also search playbooks globally if searching
    const matchingPlaybooks = s
      ? playbooks.filter(p => p.title.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s))
      : [];
    return { folders: filteredFolders, playbooks: matchingPlaybooks };
  }, [selectedFolder, playbooks, foldersWithCounts, searchTerm]);

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
          {/* Only show title if there's no content or content doesn't start with same heading */}
          {activePageId && activePage && (
            <h1 className="text-2xl font-display font-bold text-foreground mb-6">{currentTitle}</h1>
          )}
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

  const isRootView = !selectedFolder;
  const rootData = isRootView ? filteredItems as { folders: typeof foldersWithCounts; playbooks: Playbook[] } : null;
  const folderPlaybooks = !isRootView ? filteredItems as Playbook[] : [];

  return (
    <div className="space-y-6 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedFolder && (
            <Button variant="ghost" size="icon" onClick={() => { setSelectedFolder(null); setSearchTerm(''); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {selectedFolder ? selectedFolder.name : 'Playbooks'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedFolder ? selectedFolder.description || 'Playbooks desta pasta' : 'Material operacional da sua mentoria'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          placeholder={selectedFolder ? 'Buscar playbooks...' : 'Buscar pastas e playbooks...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Root View */}
      {isRootView && rootData && (
        <>
          {rootData.folders.length === 0 && rootData.playbooks.length === 0 && !searchTerm ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum playbook disponível</h3>
                <p className="text-muted-foreground">Seu mentor ainda não liberou playbooks para você.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Folders */}
              {rootData.folders.length > 0 && (
                viewMode === 'gallery' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rootData.folders.map(folder => (
                      <Card
                        key={folder.id}
                        className="glass-card hover:border-primary/30 cursor-pointer transition-all group overflow-hidden"
                        onClick={() => { setSelectedFolder(folder); setSearchTerm(''); }}
                      >
                        <div className="relative h-44 overflow-hidden">
                          {folder.cover_image_url ? (
                            <img src={folder.cover_image_url} alt="" className={`w-full h-full object-cover ${coverPositionClass(folder.cover_position)} transition-transform duration-500 group-hover:scale-105`} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center">
                              <FolderOpen className="h-10 w-10 text-primary/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="font-display font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-lg">
                              {folder.name}
                            </h3>
                            {folder.description && (
                              <p className="text-white/70 text-xs mt-1 line-clamp-1">{folder.description}</p>
                            )}
                          </div>
                        </div>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              {folder.count} playbook{folder.count !== 1 ? 's' : ''}
                            </span>
                            <span>{formatDistanceToNow(new Date(folder.updated_at), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rootData.folders.map(folder => (
                      <Card
                        key={folder.id}
                        className="glass-card hover:border-primary/30 cursor-pointer transition-all group"
                        onClick={() => { setSelectedFolder(folder); setSearchTerm(''); }}
                      >
                        <CardContent className="py-3 px-4 flex items-center gap-4">
                          <div className="h-14 w-20 rounded-lg overflow-hidden shrink-0">
                            {folder.cover_image_url ? (
                              <img src={folder.cover_image_url} alt="" className={`w-full h-full object-cover ${coverPositionClass(folder.cover_position)}`} />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center">
                                <FolderOpen className="h-5 w-5 text-primary/30" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{folder.name}</h3>
                            <p className="text-xs text-muted-foreground">{folder.count} playbook{folder.count !== 1 ? 's' : ''}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              )}

              {/* Search results - show matching playbooks */}
              {searchTerm && rootData.playbooks.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Playbooks encontrados
                  </h2>
                  <PlaybookGrid
                    playbooks={rootData.playbooks}
                    viewMode={viewMode}
                    onSelect={setSelectedPlaybook}
                  />
                </div>
              )}

              {searchTerm && rootData.folders.length === 0 && rootData.playbooks.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum resultado para "{searchTerm}"</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Folder View */}
      {!isRootView && (
        <>
          {folderPlaybooks.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhum resultado' : 'Nenhum playbook disponível'}
                </h3>
              </CardContent>
            </Card>
          ) : (
            <PlaybookGrid
              playbooks={folderPlaybooks}
              viewMode={viewMode}
              onSelect={setSelectedPlaybook}
            />
          )}
        </>
      )}
    </div>
  );
}

const coverPositionClass = (pos?: string) => {
  if (pos === 'top') return 'object-top';
  if (pos === 'bottom') return 'object-bottom';
  return 'object-center';
};

// ========== Sub-components ==========

function PlaybookGrid({ playbooks, viewMode, onSelect }: {
  playbooks: Playbook[];
  viewMode: 'gallery' | 'list';
  onSelect: (pb: Playbook) => void;
}) {
  if (viewMode === 'gallery') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playbooks.map(pb => (
          <Card
            key={pb.id}
            className="glass-card hover:border-primary/30 transition-all overflow-hidden cursor-pointer group"
            onClick={() => onSelect(pb)}
          >
            {pb.cover_image_url ? (
              <div className="h-36 bg-muted overflow-hidden">
                <img src={pb.cover_image_url} alt="" className={`w-full h-full object-cover ${coverPositionClass(pb.cover_position)} transition-transform duration-500 group-hover:scale-105`} />
              </div>
            ) : (
              <div className="h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary/30" />
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
    );
  }

  return (
    <div className="space-y-2">
      {playbooks.map(pb => (
        <Card
          key={pb.id}
          className="glass-card hover:border-primary/30 cursor-pointer transition-all group"
          onClick={() => onSelect(pb)}
        >
          <CardContent className="py-3 px-4 flex items-center gap-4">
            <div className="h-12 w-16 rounded-lg overflow-hidden shrink-0 bg-muted">
              {pb.cover_image_url ? (
                <img src={pb.cover_image_url} alt="" className={`w-full h-full object-cover ${coverPositionClass(pb.cover_position)}`} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{pb.title}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {pb.pages_count! > 0 && (
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{pb.pages_count} pág.</span>
                )}
                <span>{formatDistanceToNow(new Date(pb.updated_at), { addSuffix: true, locale: ptBR })}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
