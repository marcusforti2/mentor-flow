import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Heart, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CommentSection } from './CommentSection';
import type { CommunityPost } from '@/hooks/useCommunityPosts';

interface PostCardProps {
  post: CommunityPost;
  currentMembershipId?: string;
  onLike: (postId: string, isLiked: boolean) => void;
  onDelete: (postId: string) => void;
}

export function PostCard({ post, currentMembershipId, onLike, onDelete }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const isOwner = currentMembershipId ? currentMembershipId === post.author_membership_id : false;

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="glass-card p-4 rounded-xl space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {post.author?.full_name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {post.author?.full_name || 'Anônimo'}
            </p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onDelete(post.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir publicação
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <p className="text-foreground whitespace-pre-wrap">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt="Post image"
          className="rounded-lg w-full max-h-96 object-cover"
        />
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-2 hover:text-destructive',
            post.has_liked && 'text-destructive'
          )}
          onClick={() => onLike(post.id, post.has_liked || false)}
        >
          <Heart
            className={cn('h-4 w-4', post.has_liked && 'fill-current')}
          />
          <span>{post.likes_count || 0}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.comments_count || 0}</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && <CommentSection postId={post.id} />}
    </div>
  );
}
