import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface JarvisMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
  isStreaming?: boolean;
}

export function useJarvis() {
  const { activeMembership } = useTenant();
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (input: string) => {
    if (!activeMembership?.id || !input.trim()) return;

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

      // Get conversation ID from headers
      const newConvId = resp.headers.get('X-Conversation-Id');
      if (newConvId) setConversationId(newConvId);

      // Get executed actions
      const actionsHeader = resp.headers.get('X-Actions-Executed');
      let executedActions: string[] = [];
      try { executedActions = actionsHeader ? JSON.parse(actionsHeader) : []; } catch {}

      if (!resp.body) throw new Error('No response body');

      // Stream the response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';
      const assistantId = crypto.randomUUID();

      // Create initial assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        actions: executedActions,
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

      // Finalize
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Jarvis error:', err);
      toast.error('Erro ao comunicar com Jarvis');
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '❌ Desculpe, houve um erro na comunicação. Tente novamente.',
      }]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [activeMembership?.id, conversationId]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return { messages, isLoading, sendMessage, stopStreaming, clearChat, conversationId };
}
