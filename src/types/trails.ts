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

// Helper to detect if a video URL is from Google Drive
export const isGoogleDriveUrl = (url: string): boolean => {
  return url.includes('drive.google.com') || url.startsWith('drive:');
};

// Extract Google Drive file ID from various URL formats
export const getGoogleDriveFileId = (url: string): string => {
  if (url.startsWith('drive:')) return url.replace('drive:', '');
  const match = url.match(/\/d\/([^/]+)/);
  return match ? match[1] : url;
};

// Build Google Drive embed URL
export const getGoogleDriveEmbedUrl = (url: string): string => {
  const fileId = getGoogleDriveFileId(url);
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

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
