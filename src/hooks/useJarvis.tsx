import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface JarvisStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: string;
}

export interface JarvisMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
  agent?: string;
  isStreaming?: boolean;
  steps?: JarvisStep[]; // Multi-step progress
  plan?: string; // Planning phase description
}

export interface JarvisConversation {
  id: string;
  title: string;
  updated_at: string;
}

export function useJarvis() {
  const { activeMembership } = useTenant();
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<JarvisConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!activeMembership?.id) return;
    const { data } = await supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('membership_id', activeMembership.id)
      .order('updated_at', { ascending: false })
      .limit(30);
    setConversations(data || []);
  }, [activeMembership?.id]);

  // Load on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Cleanup refresh timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (convId: string) => {
    setIsLoadingHistory(true);
    setConversationId(convId);
    const { data } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    const msgs: JarvisMessage[] = (data || []).map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    setMessages(msgs);
    setIsLoadingHistory(false);
  }, []);

  const sendMessage = useCallback(async (input: string) => {
    if (!activeMembership?.id || !input.trim() || isLoading) return;

    const userMsg: JarvisMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            membership_id: activeMembership.id,
            conversation_id: conversationId,
            message: input.trim(),
          }),
          signal: controller.signal,
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error('Limite de requisições excedido. Tente novamente em instantes.'); return; }
        if (resp.status === 402) { toast.error('Créditos de IA esgotados. Adicione créditos na sua conta.'); return; }
        const errBody = await resp.text();
        throw new Error(errBody || 'Request failed');
      }

      const newConvId = resp.headers.get('X-Conversation-Id');
      if (newConvId) {
        setConversationId(newConvId);
        // Refresh conversations list when new conversation is created
        if (!conversationId) {
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = setTimeout(() => loadConversations(), 1000);
        }
      }

      const actionsHeader = resp.headers.get('X-Actions-Executed');
      const agentHeader = resp.headers.get('X-Agent');
      const stepsHeader = resp.headers.get('X-Steps');
      const planHeader = resp.headers.get('X-Plan');
      let executedActions: string[] = [];
      let steps: JarvisStep[] = [];
      let plan: string | undefined;
      try { executedActions = actionsHeader ? JSON.parse(actionsHeader) : []; } catch {}
      try { steps = stepsHeader ? JSON.parse(stepsHeader) : []; } catch {}
      plan = planHeader || undefined;

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';
      const assistantId = crypto.randomUUID();

      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        actions: executedActions,
        agent: agentHeader || undefined,
        steps,
        plan,
        isStreaming: true,
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIdx);
          textBuffer = textBuffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Jarvis error:', err);
      toast.error('Erro ao comunicar com a Elo');
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '❌ Desculpe, houve um erro na comunicação. Tente novamente.',
      }]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [activeMembership?.id, conversationId, isLoading, loadConversations]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (convId: string) => {
    await supabase.from('chat_messages').delete().eq('conversation_id', convId);
    await supabase.from('chat_conversations').delete().eq('id', convId);
    if (conversationId === convId) {
      setMessages([]);
      setConversationId(null);
    }
    setConversations(prev => prev.filter(c => c.id !== convId));
  }, [conversationId]);

  return {
    messages, isLoading, isLoadingHistory,
    sendMessage, stopStreaming, clearChat,
    conversationId, conversations,
    loadConversation, loadConversations, deleteConversation,
  };
}
