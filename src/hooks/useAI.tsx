import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIAnalysisResult {
  success: boolean;
  result?: string;
  error?: string;
}

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const analyzeCall = async (transcript: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<AIAnalysisResult>('ai-analysis', {
        body: { type: 'call_analysis', data: { transcript } },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data?.result || null;
    } catch (error) {
      console.error('Error analyzing call:', error);
      toast.error('Erro ao analisar chamada');
      return null;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const generateBehavioralReport = async (responses: Record<string, unknown>): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<AIAnalysisResult>('ai-analysis', {
        body: { type: 'behavioral_report', data: { responses } },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data?.result || null;
    } catch (error) {
      console.error('Error generating behavioral report:', error);
      toast.error('Erro ao gerar relatório comportamental');
      return null;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const chat = async (message: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<AIAnalysisResult>('ai-analysis', {
        body: { type: 'chat', data: { message } },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data?.result || null;
    } catch (error) {
      console.error('Error in chat:', error);
      toast.error('Erro ao enviar mensagem');
      return null;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  return {
    isLoading,
    analyzeCall,
    generateBehavioralReport,
    chat,
  };
}
