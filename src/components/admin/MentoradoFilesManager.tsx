import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  File,
  FileText,
  Image,
  Link2,
  StickyNote,
  Upload,
  Loader2,
  Trash2,
  Download,
  ExternalLink,
  Plus,
  FolderOpen,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MentoradoFile {
  id: string;
  file_type: string;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  link_url: string | null;
  link_title: string | null;
  note_title: string | null;
  note_content: string | null;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  uploaded_by_membership_id: string | null;
}

interface MentoradoFilesManagerProps {
  /** @deprecated Use ownerMembershipId instead */
  mentoradoId?: string | null;
  /** @deprecated No longer used — kept for API compat */
  mentorId?: string | null;
  mentoradoName: string;
  tenantId?: string | null;
  ownerMembershipId?: string | null;
}

export function MentoradoFilesManager({ mentoradoId, mentoradoName, tenantId, ownerMembershipId }: MentoradoFilesManagerProps) {
  const [files, setFiles] = useState<MentoradoFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<'file' | 'link' | 'note' | 'image' | null>(null);
  
  // Form states
  const [linkForm, setLinkForm] = useState({ url: '', title: '', description: '' });
  const [noteForm, setNoteForm] = useState({ title: '', content: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mentorado_files')
        .select('*')
        .order('created_at', { ascending: false });

      // Use owner_membership_id as identifier
      if (ownerMembershipId) {
        query = query.eq('owner_membership_id', ownerMembershipId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [mentoradoId, ownerMembershipId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const storagePath = ownerMembershipId || mentoradoId || 'unknown';
      const filePath = `${storagePath}/${type}s/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('mentorado-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata — legacy IDs are optional (nullable)
      const insertData: Record<string, unknown> = {
        tenant_id: tenantId || null,
        owner_membership_id: ownerMembershipId || null,
        file_type: type,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      };
      // mentorado_id and mentor_id columns removed — owner_membership_id is already set above

      const { error: dbError } = await supabase
        .from('mentorado_files')
        .insert(insertData as any);

      if (dbError) throw dbError;

      toast.success(`${type === 'image' ? 'Imagem' : 'Arquivo'} enviado com sucesso!`);
      setIsAddDialogOpen(false);
      setAddType(null);
      fetchFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async () => {
    if (!linkForm.url) {
      toast.error('URL é obrigatória');
      return;
    }

    setIsUploading(true);
    try {
      const linkData: Record<string, unknown> = {
        tenant_id: tenantId || null,
        owner_membership_id: ownerMembershipId || null,
        file_type: 'link',
        link_url: linkForm.url,
        link_title: linkForm.title || linkForm.url,
        description: linkForm.description,
      };
      // legacy IDs removed — owner_membership_id is already set above

      const { error } = await supabase
        .from('mentorado_files')
        .insert(linkData as any);

      if (error) throw error;

      toast.success('Link adicionado com sucesso!');
      setIsAddDialogOpen(false);
      setAddType(null);
      setLinkForm({ url: '', title: '', description: '' });
      fetchFiles();
    } catch (error: any) {
      console.error('Error adding link:', error);
      toast.error(error.message || 'Erro ao adicionar link');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteForm.title || !noteForm.content) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }

    setIsUploading(true);
    try {
      const noteData: Record<string, unknown> = {
        tenant_id: tenantId || null,
        owner_membership_id: ownerMembershipId || null,
        file_type: 'note',
        note_title: noteForm.title,
        note_content: noteForm.content,
        description: noteForm.description,
      };
      // legacy IDs removed — owner_membership_id is already set above

      const { error } = await supabase
        .from('mentorado_files')
        .insert(noteData as any);

      if (error) throw error;

      toast.success('Nota adicionada com sucesso!');
      setIsAddDialogOpen(false);
      setAddType(null);
      setNoteForm({ title: '', content: '', description: '' });
      fetchFiles();
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error(error.message || 'Erro ao adicionar nota');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file: MentoradoFile) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      // Delete from storage if it's a file/image
      if (file.file_path) {
        await supabase.storage
          .from('mentorado-files')
          .remove([file.file_path]);
      }

      // Delete metadata
      const { error } = await supabase
        .from('mentorado_files')
        .delete()
        .eq('id', file.id);

      if (error) throw error;

      toast.success('Item excluído com sucesso!');
      fetchFiles();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(error.message || 'Erro ao excluir item');
    }
  };

  const getFileUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('mentorado-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    return data?.signedUrl;
  };

  const handleDownload = async (file: MentoradoFile) => {
    if (!file.file_path) return;

    try {
      const url = await getFileUrl(file.file_path);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const getIcon = (type: string, mimeType?: string | null) => {
    if (type === 'image') return <Image className="h-5 w-5 text-purple-500" />;
    if (type === 'link') return <Link2 className="h-5 w-5 text-blue-500" />;
    if (type === 'note') return <StickyNote className="h-5 w-5 text-yellow-500" />;
    if (mimeType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = selectedTab === 'all' 
    ? files 
    : files.filter(f => f.file_type === selectedTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-sm text-foreground">
            Arquivos de {mentoradoName}
          </h4>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Conteúdo</DialogTitle>
              <DialogDescription>
                Escolha o tipo de conteúdo que deseja adicionar
              </DialogDescription>
            </DialogHeader>

            {!addType ? (
              <div className="grid grid-cols-2 gap-3 py-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAddType('file')}
                >
                  <File className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm">Arquivo</span>
                  <span className="text-xs text-muted-foreground">PDF, Word, etc</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAddType('image')}
                >
                  <Image className="h-6 w-6 text-purple-500" />
                  <span className="text-sm">Imagem</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG, etc</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAddType('link')}
                >
                  <Link2 className="h-6 w-6 text-blue-500" />
                  <span className="text-sm">Link</span>
                  <span className="text-xs text-muted-foreground">URL externa</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAddType('note')}
                >
                  <StickyNote className="h-6 w-6 text-yellow-500" />
                  <span className="text-sm">Nota</span>
                  <span className="text-xs text-muted-foreground">Texto livre</span>
                </Button>
              </div>
            ) : addType === 'file' || addType === 'image' ? (
              <div className="space-y-4 py-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={addType === 'image' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.txt'}
                    onChange={(e) => handleFileUpload(e, addType)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar ou arraste um arquivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {addType === 'image' ? 'JPG, PNG, GIF até 50MB' : 'PDF, Word, Excel até 50MB'}
                    </p>
                  </label>
                </div>
                
                {isUploading && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Enviando...</span>
                  </div>
                )}
                
                <Button variant="ghost" onClick={() => setAddType(null)} className="w-full">
                  Voltar
                </Button>
              </div>
            ) : addType === 'link' ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>URL *</Label>
                  <Input
                    placeholder="https://..."
                    value={linkForm.url}
                    onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Nome do link"
                    value={linkForm.title}
                    onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descrição opcional..."
                    value={linkForm.description}
                    onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                    rows={2}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setAddType(null)} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleAddLink} disabled={isUploading} className="flex-1">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    placeholder="Título da nota"
                    value={noteForm.title}
                    onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo *</Label>
                  <Textarea
                    placeholder="Escreva sua nota..."
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    rows={5}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setAddType(null)} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleAddNote} disabled={isUploading} className="flex-1">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-5 h-auto">
          <TabsTrigger value="all" className="text-xs py-1.5">Todos</TabsTrigger>
          <TabsTrigger value="file" className="text-xs py-1.5">Arquivos</TabsTrigger>
          <TabsTrigger value="image" className="text-xs py-1.5">Imagens</TabsTrigger>
          <TabsTrigger value="link" className="text-xs py-1.5">Links</TabsTrigger>
          <TabsTrigger value="note" className="text-xs py-1.5">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em "Adicionar" para enviar arquivos
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="bg-secondary/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {getIcon(file.file_type, file.mime_type)}
                    </div>
                    
                     <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.file_name || file.link_title || file.note_title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{format(new Date(file.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        {file.file_size && <span>• {formatSize(file.file_size)}</span>}
                        {file.uploaded_by_membership_id === ownerMembershipId ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-400">
                            📤 Enviado pelo mentorado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
                            📥 Enviado pelo mentor
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {file.file_type === 'link' && file.link_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(file.link_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {(file.file_type === 'file' || file.file_type === 'image') && file.file_path && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
