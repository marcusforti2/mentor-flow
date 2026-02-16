import { usePlaybooks, usePlaybookFolders } from '@/hooks/usePlaybooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FolderOpen, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PlaybookFolder } from '@/hooks/usePlaybooks';

export default function MentoradoPlaybooks() {
  const { data: folders = [], isLoading: foldersLoading } = usePlaybookFolders();
  const { data: playbooks = [], isLoading: playbooksLoading } = usePlaybooks();
  const [selectedFolder, setSelectedFolder] = useState<PlaybookFolder | null>(null);

  const isLoading = foldersLoading || playbooksLoading;
  const visiblePlaybooks = selectedFolder
    ? playbooks.filter(p => p.folder_id === selectedFolder.id)
    : playbooks;

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
            <Card key={pb.id} className="glass-card hover:border-primary/30 transition-all overflow-hidden">
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
                <h3 className="font-semibold text-foreground line-clamp-1">{pb.title}</h3>
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
