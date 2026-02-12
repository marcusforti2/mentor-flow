import { X, FileText, Download, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import type { TrailLesson } from '@/types/trails';

interface LessonContentModalProps {
  lesson: TrailLesson | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function LessonContentModal({ lesson, isOpen, onClose, onComplete }: LessonContentModalProps) {
  if (!lesson) return null;

  const renderContent = () => {
    switch (lesson.content_type) {
      case 'video':
        return (
          <div className="relative aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${lesson.content_url}?autoplay=1&rel=0&modestbranding=1`}
              title={lesson.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );

      case 'text':
        return (
          <ScrollArea className="max-h-[60vh]">
            <div className="p-6 md:p-8 prose prose-invert prose-sm md:prose-base max-w-none
              prose-headings:text-foreground prose-headings:font-display
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-strong:text-foreground
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-muted prose-pre:border prose-pre:border-border
              prose-blockquote:border-primary prose-blockquote:text-muted-foreground
              prose-li:text-muted-foreground
              prose-hr:border-border
              prose-img:rounded-lg
              prose-table:border-collapse
              prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2
              prose-td:border prose-td:border-border prose-td:p-2
            ">
              <ReactMarkdown>{lesson.text_content || ''}</ReactMarkdown>
            </div>
          </ScrollArea>
        );

      case 'file':
        return (
          <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {lesson.file_name || 'Arquivo'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              {lesson.description || 'Clique para baixar o arquivo desta aula.'}
            </p>
            {lesson.file_url && (
              <div className="flex gap-3">
                <Button asChild>
                  <a href={lesson.file_url} download={lesson.file_name} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Arquivo
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={lesson.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir
                  </a>
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 bg-background border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">
              {lesson.title}
            </h2>
            {lesson.description && lesson.content_type !== 'file' && (
              <p className="text-sm text-muted-foreground">
                {lesson.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-card">
          <div className="text-sm text-muted-foreground">
            {lesson.duration_minutes > 0 && `Duração: ${lesson.duration_minutes} minutos`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {onComplete && (
              <Button onClick={onComplete}>
                Marcar como Concluída
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
