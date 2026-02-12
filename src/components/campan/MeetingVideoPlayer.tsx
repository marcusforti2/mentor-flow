import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MeetingVideoPlayerProps {
  videoUrl: string;
  videoSource?: string;
  className?: string;
}

function extractGoogleDriveId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function MeetingVideoPlayer({ videoUrl, videoSource, className }: MeetingVideoPlayerProps) {
  if (!videoUrl) return null;

  const ytId = extractYouTubeId(videoUrl);
  if (ytId) {
    return (
      <div className={className}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          className="w-full aspect-video rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const driveId = extractGoogleDriveId(videoUrl);
  if (driveId) {
    return (
      <div className={className}>
        <iframe
          src={`https://drive.google.com/file/d/${driveId}/preview`}
          className="w-full aspect-video rounded-lg"
          allow="autoplay"
          allowFullScreen
        />
      </div>
    );
  }

  // tl;dv or other - open in new tab
  return (
    <div className={className}>
      <Button variant="outline" className="w-full" asChild>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4 mr-2" />
          Assistir gravação
        </a>
      </Button>
    </div>
  );
}
