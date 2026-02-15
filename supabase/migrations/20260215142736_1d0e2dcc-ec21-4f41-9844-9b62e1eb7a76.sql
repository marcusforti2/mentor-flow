
-- Chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova Conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: users can manage their own
CREATE POLICY "Users manage own conversations"
  ON public.chat_conversations FOR ALL
  USING (membership_id IN (
    SELECT id FROM public.memberships WHERE user_id = auth.uid()
  ))
  WITH CHECK (membership_id IN (
    SELECT id FROM public.memberships WHERE user_id = auth.uid()
  ));

-- Messages: users can manage messages in their conversations
CREATE POLICY "Users manage own messages"
  ON public.chat_messages FOR ALL
  USING (conversation_id IN (
    SELECT id FROM public.chat_conversations WHERE membership_id IN (
      SELECT id FROM public.memberships WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.chat_conversations WHERE membership_id IN (
      SELECT id FROM public.memberships WHERE user_id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX idx_chat_conversations_membership ON public.chat_conversations(membership_id);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);

-- Updated_at trigger
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
