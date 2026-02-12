import { Play, Check, Clock, FileText, Type } from 'lucide-react';
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
  const isVideo = lesson.content_type === 'video';
  const isText = lesson.content_type === 'text';
  const isFile = lesson.content_type === 'file';
  const thumbnail = isVideo ? getYouTubeThumbnail(lesson.content_url, 'hq') : '';

  const ContentIcon = isText ? Type : isFile ? FileText : Play;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200",
        "hover:bg-secondary/50",
        isCompleted && "opacity-75"
      )}
    >
      {/* Thumbnail / Icon */}
      <div className="relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-md overflow-hidden">
        {isVideo && thumbnail ? (
          <img
            src={thumbnail}
            alt={lesson.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn(
            "w-full h-full flex items-center justify-center",
            isText ? "bg-blue-500/10" : "bg-orange-500/10"
          )}>
            <ContentIcon className={cn(
              "w-8 h-8",
              isText ? "text-blue-400" : "text-orange-400"
            )} />
          </div>
        )}
        
        {/* Play overlay for video */}
        {isVideo && (
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Progress bar */}
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
        {lesson.duration_minutes > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-background/80 rounded text-xs font-medium">
            {lesson.duration_minutes}min
          </div>
        )}
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
              {isVideo && <><Clock className="w-3 h-3" /><span>{lesson.duration_minutes} minutos</span></>}
              {isText && <><Type className="w-3 h-3" /><span>Conteúdo escrito</span></>}
              {isFile && <><FileText className="w-3 h-3" /><span>{lesson.file_name || 'Arquivo'}</span></>}
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
