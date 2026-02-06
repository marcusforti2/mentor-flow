// Shared trail types used across components

export interface TrailLesson {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  content_url: string;
  order_index: number;
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
  // Handle full YouTube URLs or just video IDs
  const urlMatch = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const extractedId = urlMatch ? urlMatch[1] : videoId;
  
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    maxres: 'maxresdefault'
  };
  return extractedId ? `https://img.youtube.com/vi/${extractedId}/${qualityMap[quality]}.jpg` : '';
};
