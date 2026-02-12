import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { File, FileText, Image, Link2, StickyNote, Loader2, Download, ExternalLink, FolderOpen, Eye, Calendar, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MeetingHistoryList } from '@/components/campan/MeetingHistoryList';

interface MentoradoFile {
  id: string; file_type: string; file_name: string | null; file_path: string | null;
  file_size: number | null; mime_type: string | null; link_url: string | null;
  link_title: string | null; note_title: string | null; note_content: string | null;
  description: string | null; tags: string[] | null; created_at: string;
}

export default function MeusArquivos() {
  const [files, setFiles] = useState<MentoradoFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedNote, setSelectedNote] = useState<MentoradoFile | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeMembership } = useTenant();

  useEffect(() => {
    const fetchFiles = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Use membership ID via owner_membership_id
        if (activeMembership?.id) {
          const { data, error } = await supabase
            .from('mentorado_files')
            .select('*')
            .eq('owner_membership_id', activeMembership.id)
            .order('created_at', { ascending: false });
          
          if (!error && data && data.length > 0) {
            setFiles(data || []);
            setIsLoading(false);
            return;
          }
        }

        // Fallback: try legacy mentorado_id
        const { data: mentoradoData } = await supabase
          .from('mentorados')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (mentoradoData) {
          const { data, error } = await supabase
            .from('mentorado_files')
            .select('*')
            .eq('mentorado_id', mentoradoData.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          setFiles(data || []);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
        toast.error('Erro ao carregar arquivos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [user, activeMembership]);

  const getFileUrl = async (filePath: string) => {
    const { data } = await supabase.storage.from('mentorado-files').createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  const handleDownload = async (file: MentoradoFile) => {
    if (!file.file_path) return;
    try { const url = await getFileUrl(file.file_path); if (url) window.open(url, '_blank'); }
    catch { toast.error('Erro ao baixar arquivo'); }
  };

  const handlePreviewImage = async (file: MentoradoFile) => {
    if (!file.file_path) return;
    try { const url = await getFileUrl(file.file_path); if (url) setPreviewImage(url); }
    catch { toast.error('Erro ao carregar imagem'); }
  };

  const getIcon = (type: string, mimeType?: string | null) => {
    if (type === 'image') return <Image className="h-6 w-6 text-purple-500" />;
    if (type === 'link') return <Link2 className="h-6 w-6 text-blue-500" />;
    if (type === 'note') return <StickyNote className="h-6 w-6 text-yellow-500" />;
    if (mimeType?.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    return <File className="h-6 w-6 text-muted-foreground" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = selectedTab === 'all' ? files : files.filter(f => f.file_type === selectedTab);
  const stats = {
    total: files.length, files: files.filter(f => f.file_type === 'file').length,
    images: files.filter(f => f.file_type === 'image').length,
    links: files.filter(f => f.file_type === 'link').length,
    notes: files.filter(f => f.file_type === 'note').length,
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-8rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"><FolderOpen className="h-8 w-8 text-primary" /></div>
        <h1 className="text-3xl font-display font-bold text-foreground">Meus Arquivos & Reuniões</h1>
        <p className="text-muted-foreground mt-2">Arquivos compartilhados e gravações de reuniões</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{stats.files}</p><p className="text-xs text-muted-foreground">Arquivos</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-500">{stats.images}</p><p className="text-xs text-muted-foreground">Imagens</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-500">{stats.links}</p><p className="text-xs text-muted-foreground">Links</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{stats.notes}</p><p className="text-xs text-muted-foreground">Notas</p></CardContent></Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="file">Arquivos</TabsTrigger>
              <TabsTrigger value="image">Imagens</TabsTrigger>
              <TabsTrigger value="link">Links</TabsTrigger>
              <TabsTrigger value="note">Notas</TabsTrigger>
              <TabsTrigger value="meetings" className="flex items-center gap-1"><Video className="h-3 w-3" />Reuniões</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {selectedTab === 'meetings' ? (
            activeMembership ? (
              <MeetingHistoryList
                mentoradoMembershipId={activeMembership.id}
                tenantId={activeMembership.tenant_id}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            )
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12"><FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold text-foreground mb-2">Nenhum conteúdo ainda</h3><p className="text-muted-foreground">Quando seu mentor compartilhar arquivos, eles aparecerão aqui.</p></div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-background flex items-center justify-center">{getIcon(file.file_type, file.mime_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{file.file_name || file.link_title || file.note_title}</p>
                    {file.description && <p className="text-sm text-muted-foreground truncate">{file.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(file.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                      {file.file_size && <span>{formatSize(file.file_size)}</span>}
                      <Badge variant="outline" className="text-xs">{file.file_type === 'file' && 'Arquivo'}{file.file_type === 'image' && 'Imagem'}{file.file_type === 'link' && 'Link'}{file.file_type === 'note' && 'Nota'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.file_type === 'link' && file.link_url && <Button variant="outline" size="sm" onClick={() => window.open(file.link_url!, '_blank')}><ExternalLink className="h-4 w-4 mr-1" />Abrir</Button>}
                    {file.file_type === 'image' && file.file_path && <Button variant="outline" size="sm" onClick={() => handlePreviewImage(file)}><Eye className="h-4 w-4 mr-1" />Ver</Button>}
                    {file.file_type === 'note' && <Button variant="outline" size="sm" onClick={() => setSelectedNote(file)}><Eye className="h-4 w-4 mr-1" />Ler</Button>}
                    {(file.file_type === 'file' || file.file_type === 'image') && file.file_path && <Button variant="default" size="sm" onClick={() => handleDownload(file)}><Download className="h-4 w-4 mr-1" />Baixar</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5 text-yellow-500" />{selectedNote?.note_title}</DialogTitle></DialogHeader>
          <div className="mt-4"><div className="prose prose-sm dark:prose-invert max-w-none"><p className="whitespace-pre-wrap">{selectedNote?.note_content}</p></div></div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">{previewImage && <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain" />}</DialogContent>
      </Dialog>
    </div>
  );
}
