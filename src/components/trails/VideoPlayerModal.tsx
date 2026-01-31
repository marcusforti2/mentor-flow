import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { MockLesson } from '@/data/mockTrails';

interface VideoPlayerModalProps {
  lesson: MockLesson | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function VideoPlayerModal({ lesson, isOpen, onClose, onComplete }: VideoPlayerModalProps) {
  if (!lesson) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 bg-background border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">
              {lesson.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lesson.description}
            </p>
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

        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${lesson.content_url}?autoplay=1&rel=0&modestbranding=1`}
            title={lesson.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-card">
          <div className="text-sm text-muted-foreground">
            Duração: {lesson.duration_minutes} minutos
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
