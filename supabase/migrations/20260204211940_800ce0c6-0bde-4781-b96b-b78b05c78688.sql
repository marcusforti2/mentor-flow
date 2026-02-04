-- ==========================================
-- COMMUNITY FEATURE - TABLES & RLS
-- ==========================================

-- Posts da comunidade (Feed)
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Curtidas nos posts
CREATE TABLE public.community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, mentorado_id)
);

-- Comentários nos posts
CREATE TABLE public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mensagens de chat em tempo real
CREATE TABLE public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  mentorado_id UUID NOT NULL REFERENCES public.mentorados(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES - COMMUNITY_POSTS
-- ==========================================

-- Mentorados can view posts from their mentor's community
CREATE POLICY "Mentorados can view community posts"
ON public.community_posts FOR SELECT
USING (
  mentor_id IN (
    SELECT mentor_id FROM public.mentorados WHERE user_id = auth.uid()
  )
);

-- Mentorados can create posts in their mentor's community
CREATE POLICY "Mentorados can create posts"
ON public.community_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_posts.mentorado_id
    AND m.user_id = auth.uid()
    AND m.mentor_id = community_posts.mentor_id
  )
);

-- Mentorados can update their own posts
CREATE POLICY "Mentorados can update own posts"
ON public.community_posts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_posts.mentorado_id AND m.user_id = auth.uid()
  )
);

-- Mentorados can delete their own posts
CREATE POLICY "Mentorados can delete own posts"
ON public.community_posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_posts.mentorado_id AND m.user_id = auth.uid()
  )
);

-- Mentors can view all posts in their community
CREATE POLICY "Mentors can view all posts"
ON public.community_posts FOR SELECT
USING (
  mentor_id IN (
    SELECT id FROM public.mentors WHERE user_id = auth.uid()
  )
);

-- Mentors can delete any post in their community (moderation)
CREATE POLICY "Mentors can moderate posts"
ON public.community_posts FOR DELETE
USING (
  mentor_id IN (
    SELECT id FROM public.mentors WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- RLS POLICIES - COMMUNITY_LIKES
-- ==========================================

-- Mentorados can view likes from their community
CREATE POLICY "Mentorados can view likes"
ON public.community_likes FOR SELECT
USING (
  post_id IN (
    SELECT id FROM public.community_posts
    WHERE mentor_id IN (
      SELECT mentor_id FROM public.mentorados WHERE user_id = auth.uid()
    )
  )
);

-- Mentorados can like posts in their community
CREATE POLICY "Mentorados can like posts"
ON public.community_likes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_likes.mentorado_id AND m.user_id = auth.uid()
  )
  AND post_id IN (
    SELECT id FROM public.community_posts
    WHERE mentor_id IN (
      SELECT mentor_id FROM public.mentorados WHERE user_id = auth.uid()
    )
  )
);

-- Mentorados can unlike (delete their own likes)
CREATE POLICY "Mentorados can unlike posts"
ON public.community_likes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_likes.mentorado_id AND m.user_id = auth.uid()
  )
);

-- Mentors can view all likes
CREATE POLICY "Mentors can view all likes"
ON public.community_likes FOR SELECT
USING (
  post_id IN (
    SELECT id FROM public.community_posts
    WHERE mentor_id IN (
      SELECT id FROM public.mentors WHERE user_id = auth.uid()
    )
  )
);

-- ==========================================
-- RLS POLICIES - COMMUNITY_COMMENTS
-- ==========================================

-- Mentorados can view comments from their community
CREATE POLICY "Mentorados can view comments"
ON public.community_comments FOR SELECT
USING (
  post_id IN (
    SELECT id FROM public.community_posts
    WHERE mentor_id IN (
      SELECT mentor_id FROM public.mentorados WHERE user_id = auth.uid()
    )
  )
);

-- Mentorados can create comments
CREATE POLICY "Mentorados can create comments"
ON public.community_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_comments.mentorado_id AND m.user_id = auth.uid()
  )
  AND post_id IN (
    SELECT id FROM public.community_posts
    WHERE mentor_id IN (
      SELECT mentor_id FROM public.mentorados WHERE user_id = auth.uid()
    )
  )
);

-- Mentorados can delete their own comments
CREATE POLICY "Mentorados can delete own comments"
ON public.community_comments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_comments.mentorado_id AND m.user_id = auth.uid()
  )
);

-- Mentors can view all comments
CREATE POLICY "Mentors can view all comments"
ON public.community_comments FOR SELECT
USING (
  post_id IN (
    SELECT id FROM public.community_posts
    WHERE mentor_id IN (
      SELECT id FROM public.mentors WHERE user_id = auth.uid()
    )
  )
);

-- Mentors can delete any comment (moderation)
CREATE POLICY "Mentors can moderate comments"
ON public.community_comments FOR DELETE
USING (
  post_id IN (
    SELECT id FROM public.community_posts
    WHERE mentor_id IN (
      SELECT id FROM public.mentors WHERE user_id = auth.uid()
    )
  )
);

-- ==========================================
-- RLS POLICIES - COMMUNITY_MESSAGES
-- ==========================================

-- Mentorados can view messages from their community
CREATE POLICY "Mentorados can view messages"
ON public.community_messages FOR SELECT
USING (
  mentor_id IN (
    SELECT mentor_id FROM public.mentorados WHERE user_id = auth.uid()
  )
);

-- Mentorados can send messages
CREATE POLICY "Mentorados can send messages"
ON public.community_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_messages.mentorado_id
    AND m.user_id = auth.uid()
    AND m.mentor_id = community_messages.mentor_id
  )
);

-- Mentorados can delete their own messages
CREATE POLICY "Mentorados can delete own messages"
ON public.community_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.mentorados m
    WHERE m.id = community_messages.mentorado_id AND m.user_id = auth.uid()
  )
);

-- Mentors can view all messages in their community
CREATE POLICY "Mentors can view all messages"
ON public.community_messages FOR SELECT
USING (
  mentor_id IN (
    SELECT id FROM public.mentors WHERE user_id = auth.uid()
  )
);

-- Mentors can delete any message (moderation)
CREATE POLICY "Mentors can moderate messages"
ON public.community_messages FOR DELETE
USING (
  mentor_id IN (
    SELECT id FROM public.mentors WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- ENABLE REALTIME FOR CHAT
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================
CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_community_posts_mentor_id ON public.community_posts(mentor_id);
CREATE INDEX idx_community_posts_mentorado_id ON public.community_posts(mentorado_id);
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX idx_community_likes_post_id ON public.community_likes(post_id);
CREATE INDEX idx_community_comments_post_id ON public.community_comments(post_id);
CREATE INDEX idx_community_messages_mentor_id ON public.community_messages(mentor_id);
CREATE INDEX idx_community_messages_created_at ON public.community_messages(created_at DESC);