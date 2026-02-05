import { Play, Clock, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Trail } from '@/types/trails';

interface TrailCardProps {
  trail: Trail;
  onClick: () => void;
  size?: 'default' | 'large';
  progress?: number;
}

export function TrailCard({ trail, onClick, size = 'default', progress = 0 }: TrailCardProps) {
  const totalHours = Math.floor(trail.total_duration / 60);
  const totalMinutes = trail.total_duration % 60;

  return (
    <div
      onClick={onClick}
      className={cn(
        "trail-card group cursor-pointer relative",
        size === 'large' ? 'min-w-[300px] md:min-w-[400px]' : 'min-w-[200px] md:min-w-[280px]'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <img
          src={trail.thumbnail_url}
          alt={trail.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Featured badge */}
        {trail.is_featured && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground font-semibold">
            Em Destaque
          </Badge>
        )}

        {/* Info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display font-bold text-lg text-foreground line-clamp-2 mb-1 drop-shadow-lg">
            {trail.title}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {trail.total_lessons} aulas
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {totalHours}h {totalMinutes}min
            </span>
          </div>

          {/* Progress bar */}
          {progress > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
