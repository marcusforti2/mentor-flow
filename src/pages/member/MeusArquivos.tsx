import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  File, FileText, Image, Link2, StickyNote, Loader2, Download,
  ExternalLink, FolderOpen, Eye, Calendar, Video, Upload, Plus,
  Trash2, Mic, FileVideo, ArrowUpFromLine,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { MeetingHistoryList } from '@/components/campan/MeetingHistoryList';

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

type AddType = 'file' | 'image' | 'video' | 'audio' | 'link' | 'note' | null;

export default function MeusArquivos() {
  const [files, setFiles] = useState<MentoradoFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedNote, setSelectedNote] = useState<MentoradoFile | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<AddType>(null);
  const [linkForm, setLinkForm] = useState({ url: '', title: '', description: '' });
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { activeMembership } = useTenant();

  const fetchFiles = async () => {
    if (!activeMembership?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentorado_files')
        .select('*')
        .eq('owner_membership_id', activeMembership.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFiles((data as MentoradoFile[]) || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [user, activeMembership]);

  const getFileUrl = async (filePath: string) => {
    const { data } = await supabase.storage.from('mentorado-files').createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  const handleDownload = async (file: MentoradoFile) => {
    if (!file.file_path) return;
    try {
      const url = await getFileUrl(file.file_path);
      if (url) window.open(url, '_blank');
    } catch {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handlePreviewImage = async (file: MentoradoFile) => {
    if (!file.file_path) return;
    try {
      const url = await getFileUrl(file.file_path);
      if (url) setPreviewImage(url);
    } catch {
      toast.error('Erro ao carregar imagem');
    }
  };

  const notifyUpload = async (fileName: string, fileType: string) => {
    try {
      if (!activeMembership) return;
      // Find assigned mentors/admins to notify
      const { data: staffMembers } = await supabase
        .from('memberships')
        .select('id, user_id')
        .eq('tenant_id', activeMembership.tenant_id)
        .in('role', ['admin', 'mentor', 'ops'])
        .eq('status', 'active');

      if (!staffMembers?.length) return;

      // Get mentee name
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user!.id)
        .maybeSingle();

      // Get staff emails
      const staffUserIds = staffMembers.map(s => s.user_id);
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('email, full_name, user_id')
        .in('user_id', staffUserIds);

      for (const staff of (staffProfiles || [])) {
        if (!staff.email) continue;
        supabase.functions.invoke('notify-file-upload', {
          body: {
            uploaderName: myProfile?.full_name || 'Mentorado',
            uploaderRole: 'mentee',
            recipientEmail: staff.email,
            recipientName: staff.full_name || 'Mentor',
            fileName,
            fileType,
            tenantId: activeMembership.tenant_id,
          },
        }).catch(err => console.error('Notification error:', err));
      }
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !activeMembership) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${activeMembership.id}/${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('mentorado-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('mentorado_files')
        .insert({
          tenant_id: activeMembership.tenant_id,
          owner_membership_id: activeMembership.id,
          uploaded_by_membership_id: activeMembership.id,
          file_type: type,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        } as any);
      if (dbError) throw dbError;

      const labels: Record<string, string> = {
        file: 'Arquivo', image: 'Imagem', video: 'Vídeo', audio: 'Áudio',
      };
      toast.success(`${labels[type] || 'Arquivo'} enviado com sucesso!`);
      notifyUpload(file.name, type);
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
    if (!linkForm.url || !activeMembership) {
      toast.error('URL é obrigatória');
      return;
    }
    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('mentorado_files')
        .insert({
          tenant_id: activeMembership.tenant_id,
          owner_membership_id: activeMembership.id,
          uploaded_by_membership_id: activeMembership.id,
          file_type: 'link',
          link_url: linkForm.url,
          link_title: linkForm.title || linkForm.url,
          description: linkForm.description,
        } as any);
      if (error) throw error;
      toast.success('Link adicionado!');
      notifyUpload(linkForm.title || linkForm.url, 'link');
      setIsAddDialogOpen(false);
      setAddType(null);
      setLinkForm({ url: '', title: '', description: '' });
      fetchFiles();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar link');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteForm.title || !noteForm.content || !activeMembership) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }
    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('mentorado_files')
        .insert({
          tenant_id: activeMembership.tenant_id,
          owner_membership_id: activeMembership.id,
          uploaded_by_membership_id: activeMembership.id,
          file_type: 'note',
          note_title: noteForm.title,
          note_content: noteForm.content,
        } as any);
      if (error) throw error;
      toast.success('Nota adicionada!');
      notifyUpload(noteForm.title, 'note');
      setIsAddDialogOpen(false);
      setAddType(null);
      setNoteForm({ title: '', content: '' });
      fetchFiles();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar nota');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file: MentoradoFile) => {
    // Only allow deleting own uploads
    if (file.uploaded_by_membership_id !== activeMembership?.id) {
      toast.error('Você só pode excluir arquivos enviados por você');
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      if (file.file_path) {
        await supabase.storage.from('mentorado-files').remove([file.file_path]);
      }
      const { error } = await supabase.from('mentorado_files').delete().eq('id', file.id);
      if (error) throw error;
      toast.success('Item excluído!');
      fetchFiles();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir');
    }
  };

  const getIcon = (type: string, mimeType?: string | null) => {
    if (type === 'image') return <Image className="h-6 w-6 text-purple-500" />;
    if (type === 'video') return <FileVideo className="h-6 w-6 text-pink-500" />;
    if (type === 'audio') return <Mic className="h-6 w-6 text-green-500" />;
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

  const getAcceptString = (type: AddType) => {
    switch (type) {
      case 'image': return 'image/*';
      case 'video': return 'video/*,.mp4,.mov,.avi,.webm';
      case 'audio': return 'audio/*,.mp3,.wav,.m4a,.ogg';
      default: return '.pdf,.doc,.docx,.xls,.xlsx,.txt,.ppt,.pptx';
    }
  };

  const [originFilter, setOriginFilter] = useState<'all' | 'mine' | 'mentor'>('all');

  const filteredFiles = files
    .filter(f => selectedTab === 'all' || f.file_type === selectedTab)
    .filter(f => {
      if (originFilter === 'mine') return f.uploaded_by_membership_id === activeMembership?.id;
      if (originFilter === 'mentor') return f.uploaded_by_membership_id !== activeMembership?.id;
      return true;
    });

  const myUploads = files.filter(f => f.uploaded_by_membership_id === activeMembership?.id);
  const mentorUploads = files.filter(f => f.uploaded_by_membership_id !== activeMembership?.id);

  const stats = {
    total: files.length,
    mine: myUploads.length,
    fromMentor: mentorUploads.length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-primary" />
            Meus Arquivos & Reuniões
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Envie e visualize seus documentos, prints, vídeos e notas
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <ArrowUpFromLine className="h-4 w-4" />
          Enviar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setOriginFilter('all')}
          className={`rounded-lg border p-4 text-center transition-all ${originFilter === 'all' ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border bg-card hover:bg-secondary/30'}`}
        >
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </button>
        <button
          onClick={() => setOriginFilter('mine')}
          className={`rounded-lg border p-4 text-center transition-all ${originFilter === 'mine' ? 'border-green-500 ring-2 ring-green-500/30 bg-green-500/5' : 'border-border bg-card hover:bg-secondary/30'}`}
        >
          <p className="text-2xl font-bold text-green-500">{stats.mine}</p>
          <p className="text-xs text-muted-foreground">📤 Eu enviei</p>
        </button>
        <button
          onClick={() => setOriginFilter('mentor')}
          className={`rounded-lg border p-4 text-center transition-all ${originFilter === 'mentor' ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5' : 'border-border bg-card hover:bg-secondary/30'}`}
        >
          <p className="text-2xl font-bold text-blue-500">{stats.fromMentor}</p>
          <p className="text-xs text-muted-foreground">📥 Do mentor</p>
        </button>
      </div>

      {/* File list */}
      <Card className="glass-card">
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="file" className="text-xs">Docs</TabsTrigger>
              <TabsTrigger value="image" className="text-xs">Imagens</TabsTrigger>
              <TabsTrigger value="video" className="text-xs">Vídeos</TabsTrigger>
              <TabsTrigger value="audio" className="text-xs">Áudios</TabsTrigger>
              <TabsTrigger value="note" className="text-xs">Notas</TabsTrigger>
              <TabsTrigger value="meetings" className="text-xs flex items-center gap-1">
                <Video className="h-3 w-3" />Reuniões
              </TabsTrigger>
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
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum conteúdo ainda</h3>
              <p className="text-muted-foreground mb-4">
                Clique em "Enviar" para adicionar seus arquivos, prints e notas.
              </p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Enviar primeiro arquivo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => {
                const isMine = file.uploaded_by_membership_id === activeMembership?.id;
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-background flex items-center justify-center">
                      {getIcon(file.file_type, file.mime_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {file.file_name || file.link_title || file.note_title}
                      </p>
                      {file.description && (
                        <p className="text-sm text-muted-foreground truncate">{file.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(file.created_at), 'dd MMM yyyy', { locale: ptBR })}
                        </span>
                        {file.file_size && <span>{formatSize(file.file_size)}</span>}
                        <Badge
                          variant={isMine ? 'default' : 'secondary'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {isMine ? '📤 Eu enviei' : '📥 Do mentor'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.file_type === 'link' && file.link_url && (
                        <Button variant="outline" size="sm" onClick={() => window.open(file.link_url!, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-1" />Abrir
                        </Button>
                      )}
                      {file.file_type === 'image' && file.file_path && (
                        <Button variant="outline" size="sm" onClick={() => handlePreviewImage(file)}>
                          <Eye className="h-4 w-4 mr-1" />Ver
                        </Button>
                      )}
                      {file.file_type === 'note' && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedNote(file)}>
                          <Eye className="h-4 w-4 mr-1" />Ler
                        </Button>
                      )}
                      {['file', 'image', 'video', 'audio'].includes(file.file_type) && file.file_path && (
                        <Button variant="default" size="sm" onClick={() => handleDownload(file)}>
                          <Download className="h-4 w-4 mr-1" />Baixar
                        </Button>
                      )}
                      {isMine && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(o) => { setIsAddDialogOpen(o); if (!o) setAddType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Conteúdo</DialogTitle>
            <DialogDescription>Escolha o tipo de conteúdo que deseja enviar</DialogDescription>
          </DialogHeader>

          {!addType ? (
            <div className="grid grid-cols-3 gap-3 py-4">
              {[
                { type: 'file' as AddType, icon: File, label: 'Documento', desc: 'PDF, Word, Excel', color: 'text-muted-foreground' },
                { type: 'image' as AddType, icon: Image, label: 'Imagem / Print', desc: 'JPG, PNG, prints', color: 'text-purple-500' },
                { type: 'video' as AddType, icon: FileVideo, label: 'Vídeo', desc: 'MP4, MOV, WebM', color: 'text-pink-500' },
                { type: 'audio' as AddType, icon: Mic, label: 'Áudio', desc: 'MP3, WAV, M4A', color: 'text-green-500' },
                { type: 'link' as AddType, icon: Link2, label: 'Link', desc: 'URL externa', color: 'text-blue-500' },
                { type: 'note' as AddType, icon: StickyNote, label: 'Nota', desc: 'Texto livre', color: 'text-yellow-500' },
              ].map(({ type, icon: Icon, label, desc, color }) => (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAddType(type)}
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{desc}</span>
                </Button>
              ))}
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
                <Button variant="ghost" onClick={() => setAddType(null)} className="flex-1">Voltar</Button>
                <Button onClick={handleAddLink} disabled={isUploading} className="flex-1">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                </Button>
              </div>
            </div>
          ) : addType === 'note' ? (
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
                <Button variant="ghost" onClick={() => setAddType(null)} className="flex-1">Voltar</Button>
                <Button onClick={handleAddNote} disabled={isUploading} className="flex-1">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptString(addType)}
                  onChange={(e) => handleFileUpload(e, addType!)}
                  className="hidden"
                  id="mentee-file-upload"
                />
                <label htmlFor="mentee-file-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {addType === 'image' && 'JPG, PNG, prints de prospecção até 50MB'}
                    {addType === 'video' && 'MP4, MOV, WebM até 50MB'}
                    {addType === 'audio' && 'MP3, WAV, M4A até 50MB'}
                    {addType === 'file' && 'PDF, Word, Excel, transcrições até 50MB'}
                  </p>
                </label>
              </div>
              {isUploading && (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Enviando...</span>
                </div>
              )}
              <Button variant="ghost" onClick={() => setAddType(null)} className="w-full">Voltar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Note preview */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-yellow-500" />
              {selectedNote?.note_title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{selectedNote?.note_content}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
