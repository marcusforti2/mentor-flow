import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, AlignLeft, AlignCenter, AlignRight,
  Image as ImageIcon, Youtube as YoutubeIcon, Link as LinkIcon,
  Table as TableIcon, Highlighter, Undo, Redo,
  Upload, FileText, Music, Video, Sparkles, Loader2, Paperclip,
  type LucideIcon,
} from 'lucide-react';

interface PlaybookTipTapEditorProps {
  content: any;
  onUpdate: (content: any) => void;
  editable?: boolean;
  onAIWrite?: () => void;
}

export function PlaybookTipTapEditor({ content, onUpdate, editable = true, onAIWrite }: PlaybookTipTapEditorProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Comece a escrever seu playbook ou use o botão ✨ para gerar com IA...',
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: false }),
      Youtube.configure({ width: 640, height: 360 }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: content || '<p></p>',
    editable,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(editor.getJSON());
      }, 800);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose prose-invert max-w-none focus:outline-none min-h-[400px] px-6 py-4',
      },
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* Toolbar */}
      {editable && (
        <div className="border-b border-border bg-muted/20 px-3 py-2">
          {/* Row 1 - Main formatting */}
          <div className="flex flex-wrap items-center gap-0.5">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={Undo} title="Desfazer" />
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={Redo} title="Refazer" />
            
            <ToolbarSep />

            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} title="H1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} title="H2" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon={Heading3} title="H3" />
            
            <ToolbarSep />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} title="Negrito" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} title="Itálico" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={UnderlineIcon} title="Sublinhado" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Strikethrough} title="Riscado" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} icon={Highlighter} title="Destaque" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} icon={Code} title="Código" />
            
            <ToolbarSep />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} title="Lista" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} title="Numerada" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={CheckSquare} title="Checklist" />
            
            <ToolbarSep />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={Quote} title="Citação" />
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} title="Divisor" />
            
            <ToolbarSep />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} title="Esquerda" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} title="Centro" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={AlignRight} title="Direita" />

            <ToolbarSep />

            <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} icon={TableIcon} title="Tabela" />
            <InsertLinkButton editor={editor} />
          </div>
          
          {/* Row 2 - Media & AI */}
          <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-border/50">
            <UploadImageButton editor={editor} />
            <UploadFileButton editor={editor} />
            <InsertVideoEmbedButton editor={editor} />
            
            <div className="flex-1" />
            
            {onAIWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAIWrite}
                className="gap-1.5 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary/50 text-primary hover:text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Escrever com IA
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

// Re-export editor ref for external content insertion
export function usePlaybookEditorRef() {
  return useRef<any>(null);
}

function ToolbarSep() {
  return <Separator orientation="vertical" className="mx-1 h-6" />;
}

function ToolbarButton({ onClick, icon: Icon, active, title }: { onClick: () => void; icon: LucideIcon; active?: boolean; title: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

/* ─── Upload Image (from device or URL) ─── */
function UploadImageButton({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { activeMembership } = useTenant();

  const handleUrlInsert = () => {
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
      setUrl('');
      setOpen(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMembership) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 10MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${activeMembership.tenant_id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('playbook-covers').upload(path, file);
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('playbook-covers').getPublicUrl(path);
      editor.chain().focus().setImage({ src: publicUrl }).run();
      setOpen(false);
      toast.success('Imagem inserida!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" title="Inserir imagem">
          <ImageIcon className="h-3.5 w-3.5" />
          Imagem
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <p className="text-sm font-semibold mb-3">Inserir imagem</p>
        
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <Button
          variant="outline"
          className="w-full mb-3 gap-2 h-20 border-dashed"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Enviar do dispositivo</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP • até 10MB</p>
              </div>
            </>
          )}
        </Button>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">ou cole a URL</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex gap-2">
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="text-sm" onKeyDown={e => e.key === 'Enter' && handleUrlInsert()} />
          <Button size="sm" onClick={handleUrlInsert} disabled={!url.trim()}>OK</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─── Upload File (PDF, Word, Excel, Audio) ─── */
function UploadFileButton({ editor }: { editor: any }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { activeMembership } = useTenant();

  const ACCEPTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
  ];

  const FILE_ICONS: Record<string, string> = {
    'application/pdf': '📄',
    'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'application/vnd.ms-excel': '📊',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
    'application/vnd.ms-powerpoint': '📊',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMembership) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 20MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `${activeMembership.tenant_id}/files/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from('playbook-covers').upload(path, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('playbook-covers').getPublicUrl(path);

      const isAudio = file.type.startsWith('audio/');
      const icon = FILE_ICONS[file.type] || '📎';

      if (isAudio) {
        // Insert audio player as HTML
        const audioHtml = `<div data-type="audio-embed" style="margin: 1rem 0; padding: 1rem; border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--muted) / 0.3);">
          <p style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 500;">🎵 ${file.name}</p>
          <audio controls style="width: 100%; border-radius: 8px;" src="${publicUrl}"></audio>
        </div>`;
        editor.chain().focus().insertContent(audioHtml).run();
      } else {
        // Insert file link card
        const fileHtml = `<div data-type="file-embed" style="margin: 1rem 0; padding: 0.875rem 1rem; border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--muted) / 0.3); display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.5rem;">${icon}</span>
          <div style="flex: 1; min-width: 0;">
            <p style="margin: 0; font-size: 0.875rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</p>
            <p style="margin: 0; font-size: 0.75rem; color: hsl(var(--muted-foreground));">${(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <a href="${publicUrl}" target="_blank" rel="noopener" style="font-size: 0.75rem; color: hsl(var(--primary)); text-decoration: underline; white-space: nowrap;">Baixar ↗</a>
        </div>`;
        editor.chain().focus().insertContent(fileHtml).run();
      }

      toast.success('Arquivo inserido!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.m4a,.wav,.ogg,.webm"
        className="hidden"
        onChange={handleFileUpload}
      />
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 h-8 text-xs"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Enviar arquivo (PDF, Word, Excel, Áudio)"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Paperclip className="h-3.5 w-3.5" />
        )}
        Arquivo
      </Button>
    </>
  );
}

/* ─── Video embed (YouTube, Vimeo, Loom, etc.) ─── */
function InsertVideoEmbedButton({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handleInsert = () => {
    if (!url.trim()) return;

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      editor.commands.setYoutubeVideo({ src: url.trim() });
    }
    // Vimeo
    else if (url.includes('vimeo.com')) {
      const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (vimeoId) {
        const html = `<div style="margin: 1rem 0; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden;"><iframe src="https://player.vimeo.com/video/${vimeoId}" style="width:100%;height:100%;border:0;" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
        editor.chain().focus().insertContent(html).run();
      }
    }
    // Loom
    else if (url.includes('loom.com')) {
      const loomId = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)?.[1];
      if (loomId) {
        const html = `<div style="margin: 1rem 0; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden;"><iframe src="https://www.loom.com/embed/${loomId}" style="width:100%;height:100%;border:0;" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
        editor.chain().focus().insertContent(html).run();
      }
    }
    // Generic iframe
    else {
      const html = `<div style="margin: 1rem 0; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden;"><iframe src="${url.trim()}" style="width:100%;height:100%;border:0;" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
      editor.chain().focus().insertContent(html).run();
    }

    setUrl('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" title="Inserir vídeo">
          <Video className="h-3.5 w-3.5" />
          Vídeo
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <p className="text-sm font-semibold mb-1">Incorporar vídeo</p>
        <p className="text-xs text-muted-foreground mb-3">YouTube, Vimeo, Loom ou qualquer URL de embed</p>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="text-sm"
            onKeyDown={e => e.key === 'Enter' && handleInsert()}
          />
          <Button size="sm" onClick={handleInsert} disabled={!url.trim()}>Inserir</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InsertLinkButton({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handleInsert = () => {
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      setUrl('');
      setOpen(false);
    }
  };

  const handleRemove = () => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`h-7 w-7 ${editor.isActive('link') ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`} title="Link">
          <LinkIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="text-sm font-medium mb-2">URL do link</p>
        <div className="flex gap-2">
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="text-sm" onKeyDown={e => e.key === 'Enter' && handleInsert()} />
          <Button size="sm" onClick={handleInsert}>OK</Button>
        </div>
        {editor.isActive('link') && (
          <Button variant="ghost" size="sm" onClick={handleRemove} className="mt-2 text-destructive w-full">Remover link</Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
