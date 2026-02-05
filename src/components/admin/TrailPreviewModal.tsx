import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Play, 
  Clock, 
  BookOpen, 
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoPlayerModal } from '@/components/trails/VideoPlayerModal';
import type { Trail, TrailLesson } from '@/types/trails';

interface TrailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trail: Trail | null;
}

export function TrailPreviewModal({ open, onOpenChange, trail }: TrailPreviewModalProps) {
  const [selectedLesson, setSelectedLesson] = useState<{
    lesson: TrailLesson;
    moduleTitle: string;
  } | null>(null);

  if (!trail) return null;

  const hours = Math.floor(trail.total_duration / 60);
  const minutes = trail.total_duration % 60;

  // Simulate some progress for preview
  const simulatedProgress = 35;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 bg-background border-border overflow-hidden">
          {/* Header with Preview Banner */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              👁️ Modo Preview - Visão do Mentorado
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-full">
            {/* Hero Banner */}
            <div 
              className="relative h-64 bg-cover bg-center"
              style={{ backgroundImage: `url(${trail.thumbnail_url})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                  {trail.title}
                </h1>
                <p className="text-muted-foreground text-sm max-w-2xl">
                  {trail.description}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{trail.modules.length} módulos</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Play className="h-4 w-4" />
                  <span>{trail.total_lessons} aulas</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`}</span>
                </div>
              </div>

              {/* Progress Bar (simulated) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Seu progresso</span>
                  <span className="text-accent font-medium">{simulatedProgress}% concluído</span>
                </div>
                <Progress value={simulatedProgress} className="h-2" />
              </div>

              {/* Continue Button */}
              <Button className="w-full gap-2 h-12">
                <Play className="h-5 w-5" />
                Continuar de onde parou
              </Button>

              {/* Modules */}
              <div className="space-y-4">
                <h2 className="font-semibold text-foreground">Conteúdo do Curso</h2>
                
                <Accordion type="multiple" className="space-y-2" defaultValue={[trail.modules[0]?.id]}>
                  {trail.modules.map((module, moduleIndex) => {
                    const completedLessons = Math.floor(module.lessons.length * (simulatedProgress / 100));
                    
                    return (
                      <AccordionItem 
                        key={module.id} 
                        value={module.id}
                        className="border border-border rounded-lg overflow-hidden bg-muted/20"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-semibold">
                              {moduleIndex + 1}
                            </span>
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground">
                                {module.title}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {completedLessons}/{module.lessons.length} aulas completas
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-2 pt-2">
                            {module.lessons.map((lesson, lessonIndex) => {
                              const isCompleted = lessonIndex < completedLessons;
                              const isCurrent = lessonIndex === completedLessons;
                              
                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => setSelectedLesson({ lesson, moduleTitle: module.title })}
                                  className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                                    "hover:bg-muted/50 text-left",
                                    isCurrent && "bg-accent/10 border border-accent/30"
                                  )}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                                  ) : isCurrent ? (
                                    <Play className="h-5 w-5 text-accent flex-shrink-0" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm font-medium truncate",
                                      isCompleted ? "text-muted-foreground" : "text-foreground"
                                    )}>
                                      {lesson.title}
                                    </p>
                                  </div>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {lesson.duration_minutes} min
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Video Player */}
      <VideoPlayerModal
        isOpen={!!selectedLesson}
        onClose={() => setSelectedLesson(null)}
        lesson={selectedLesson?.lesson || null}
      />
    </>
  );
}
