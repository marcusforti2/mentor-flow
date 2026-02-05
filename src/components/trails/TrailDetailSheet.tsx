import { useState } from 'react';
import { Play, Clock, BookOpen, ChevronDown, Award } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LessonCard } from './LessonCard';
import type { Trail, TrailLesson } from '@/types/trails';

interface TrailDetailSheetProps {
  trail: Trail | null;
  isOpen: boolean;
  onClose: () => void;
  onLessonClick: (lesson: TrailLesson) => void;
  progress?: number;
  completedLessonIds?: string[];
}

export function TrailDetailSheet({ 
  trail, 
  isOpen, 
  onClose, 
  onLessonClick,
  progress = 0,
  completedLessonIds = []
}: TrailDetailSheetProps) {
  const [openModules, setOpenModules] = useState<string[]>([]);

  if (!trail) return null;

  const totalHours = Math.floor(trail.total_duration / 60);
  const totalMinutes = trail.total_duration % 60;

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const isLessonCompleted = (lessonId: string) => completedLessonIds.includes(lessonId);

  // Find next lesson to continue
  const findNextLesson = (): TrailLesson | null => {
    for (const module of trail.modules) {
      for (const lesson of module.lessons) {
        if (!isLessonCompleted(lesson.id)) {
          return lesson;
        }
      }
    }
    return trail.modules[0]?.lessons[0] || null;
  };

  const nextLesson = findNextLesson();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 bg-background border-l border-border">
        <ScrollArea className="h-full">
          {/* Hero Image */}
          <div className="relative h-48 md:h-56">
            <img
              src={trail.thumbnail_url}
              alt={trail.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            
            {/* Featured badge */}
            {trail.is_featured && (
              <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                Em Destaque
              </Badge>
            )}
          </div>

          <div className="p-6 -mt-12 relative">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="font-display text-2xl font-bold text-foreground">
                {trail.title}
              </SheetTitle>
              <p className="text-muted-foreground mt-2">
                {trail.description}
              </p>
            </SheetHeader>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {trail.total_lessons} aulas
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {totalHours}h {totalMinutes}min
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                {trail.modules.length} módulos
              </span>
            </div>

            {/* Progress */}
            {progress > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Seu progresso</span>
                  <span className="font-semibold text-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Continue button */}
            {nextLesson && (
              <Button 
                className="w-full mb-6 h-12 text-base font-semibold"
                onClick={() => onLessonClick(nextLesson)}
              >
                <Play className="w-5 h-5 mr-2" fill="currentColor" />
                {progress > 0 ? 'Continuar Assistindo' : 'Começar Trilha'}
              </Button>
            )}

            {/* Modules */}
            <div className="space-y-3">
              <h3 className="font-display font-semibold text-foreground">
                Conteúdo da Trilha
              </h3>

              {trail.modules.map((module, moduleIndex) => {
                const isOpen = openModules.includes(module.id);
                const completedLessons = module.lessons.filter(l => isLessonCompleted(l.id)).length;
                const moduleProgress = Math.round((completedLessons / module.lessons.length) * 100);

                return (
                  <Collapsible
                    key={module.id}
                    open={isOpen}
                    onOpenChange={() => toggleModule(module.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-card hover:bg-secondary/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {moduleIndex + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">
                              {module.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {module.lessons.length} aulas • {completedLessons} concluídas
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {moduleProgress === 100 && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                              Completo
                            </Badge>
                          )}
                          <ChevronDown className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform",
                            isOpen && "rotate-180"
                          )} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="mt-2 space-y-1 pl-4">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const completed = isLessonCompleted(lesson.id);
                          return (
                            <LessonCard
                              key={lesson.id}
                              lesson={lesson}
                              index={lessonIndex}
                              isCompleted={completed}
                              isInProgress={false}
                              progress={0}
                              onClick={() => onLessonClick(lesson)}
                            />
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
