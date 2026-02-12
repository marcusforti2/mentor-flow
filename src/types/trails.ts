// Shared trail types used across components

export type LessonContentType = 'video' | 'text' | 'file';

export interface TrailLesson {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  content_url: string;
  order_index: number;
  content_type: LessonContentType;
  text_content?: string;
  file_url?: string;
  file_name?: string;
}

export interface TrailModule {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: TrailLesson[];
}

export interface Trail {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_featured?: boolean;
  is_published?: boolean;
  order_index?: number;
  modules: TrailModule[];
  total_lessons: number;
  total_duration: number;
}

// Helper to get YouTube thumbnail
export const getYouTubeThumbnail = (videoId: string, quality: 'default' | 'hq' | 'maxres' = 'hq'): string => {
  if (!videoId) return '';
  const urlMatch = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const extractedId = urlMatch ? urlMatch[1] : videoId;
  
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    maxres: 'maxresdefault'
  };
  return extractedId ? `https://img.youtube.com/vi/${extractedId}/${qualityMap[quality]}.jpg` : '';
};
