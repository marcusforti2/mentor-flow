import { Play, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getYouTubeThumbnail, type TrailLesson } from '@/types/trails';

interface LessonCardProps {
  lesson: TrailLesson;
  index: number;
  isCompleted?: boolean;
  isInProgress?: boolean;
  progress?: number;
  onClick: () => void;
}

export function LessonCard({ 
  lesson, 
  index, 
  isCompleted = false, 
  isInProgress = false,
  progress = 0,
  onClick 
}: LessonCardProps) {
  const thumbnail = getYouTubeThumbnail(lesson.content_url, 'hq');

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200",
        "hover:bg-secondary/50",
        isCompleted && "opacity-75"
      )}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-md overflow-hidden">
        <img
          src={thumbnail}
          alt={lesson.title}
          className="w-full h-full object-cover"
        />
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Progress bar on video */}
        {isInProgress && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Completed checkmark */}
        {isCompleted && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-background/80 rounded text-xs font-medium">
          {lesson.duration_minutes}min
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h4 className={cn(
              "font-semibold text-foreground line-clamp-2",
              isCompleted && "text-muted-foreground"
            )}>
              {lesson.title}
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {lesson.description}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{lesson.duration_minutes} minutos</span>
              {isInProgress && (
                <span className="text-primary font-medium">• Em andamento</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
