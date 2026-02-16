import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlaybookReadOnly } from '@/components/playbooks/PlaybookReadOnly';
import { useState } from 'react';
import { BookOpen, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function PublicPlaybookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: playbook, isLoading, error } = useQuery({
    queryKey: ['public-playbook', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('public_slug', slug)
        .eq('visibility', 'public')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['public-playbook-pages', playbook?.id],
    queryFn: async () => {
      if (!playbook?.id) return [];
      const { data, error } = await supabase
        .from('playbook_pages')
        .select('*')
        .eq('playbook_id', playbook.id)
        .order('position', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!playbook?.id,
  });

  const activePage = activePageId ? pages.find(p => p.id === activePageId) : null;
  const currentContent = activePage ? activePage.content : playbook?.content;
  const currentTitle = activePage ? activePage.title : playbook?.title;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !playbook) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Playbook não encontrado</h1>
          <p className="text-muted-foreground">Este link pode estar incorreto ou o playbook não é mais público.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      {pages.length > 0 && (
        <div className={`border-r border-border bg-muted/30 transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
          <div className="p-4 space-y-3">
            <div>
              <h2 className="font-semibold text-foreground text-sm line-clamp-2">{playbook.title}</h2>
              {playbook.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{playbook.description}</p>
              )}
            </div>
            <Separator />
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
              {pages.map(page => (
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
        </div>
      )}

      {/* Toggle sidebar */}
      {pages.length > 0 && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-muted border border-border rounded-r-md p-1 hover:bg-muted/80 transition-colors"
          style={{ left: sidebarOpen ? '256px' : '0px' }}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      )}

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-10">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">{currentTitle}</h1>
        <PlaybookReadOnly content={currentContent} />

        <div className="mt-16 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          Powered by MentorFlow
        </div>
      </div>
    </div>
  );
}
