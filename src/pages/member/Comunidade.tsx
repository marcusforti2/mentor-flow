import { useState } from 'react';
import { Newspaper, MessageCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostComposer } from '@/components/community/PostComposer';
import { PostCard } from '@/components/community/PostCard';
import { ChatPanel } from '@/components/community/ChatPanel';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { useTenant } from '@/contexts/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Comunidade() {
  const [activeTab, setActiveTab] = useState('feed');
  const { posts, isLoading, createPost, deletePost, toggleLike } = useCommunityPosts();
  const { activeMembership } = useTenant();

  const handleCreatePost = (content: string, tags: string[]) => {
    createPost.mutate({ content, tags });
  };

  const handleLike = (postId: string, isLiked: boolean) => {
    toggleLike.mutate({ postId, isLiked });
  };

  const handleDelete = (postId: string) => {
    deletePost.mutate(postId);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Comunidade
        </h1>
        <p className="text-muted-foreground">
          Conecte-se com outros mentorados, compartilhe experiências e aprenda junto
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="feed" className="gap-2">
            <Newspaper className="h-4 w-4" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Feed Tab */}
        <TabsContent value="feed" className="space-y-4">
          {/* Post Composer */}
          <PostComposer
            onSubmit={handleCreatePost}
            isLoading={createPost.isPending}
          />

          {/* Posts List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-xl">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma publicação ainda
              </h3>
              <p className="text-muted-foreground">
                Seja o primeiro a compartilhar algo com a comunidade!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentMembershipId={activeMembership?.id}
                  onLike={handleLike}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <ChatPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
