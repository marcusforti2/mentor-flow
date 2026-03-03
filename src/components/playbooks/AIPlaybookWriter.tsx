import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Copy, Check, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface AIPlaybookWriterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (markdown: string) => void;
  currentContent?: string;
}

const QUICK_PROMPTS = [
  { label: '🚀 Onboarding', prompt: 'Crie um guia completo de onboarding para novos mentorados, com boas-vindas, primeiros passos, regras e compromissos' },
  { label: '💰 Processo de Vendas', prompt: 'Crie um playbook de processo de vendas com funil, scripts de abordagem, quebra de objeções e follow-up' },
  { label: '📅 Rotina Semanal', prompt: 'Crie um modelo de rotina semanal de alta performance com checklist diário e métricas de acompanhamento' },
  { label: '📱 Social Media', prompt: 'Crie uma estratégia de conteúdo e calendário editorial para redes sociais' },
  { label: '🎯 Metas & OKRs', prompt: 'Crie um framework de definição de metas e OKRs para mentorados com exemplos práticos' },
  { label: '🤝 Pós-venda', prompt: 'Crie um processo completo de pós-venda e sucesso do cliente com check-ins e métricas' },
];

export function AIPlaybookWriter({ open, onOpenChange, onInsert, currentContent }: AIPlaybookWriterProps) {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) {
      toast.error('Digite o que deseja gerar');
      return;
    }

    setIsStreaming(true);
    setResult('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-playbook-content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            context: context || undefined,
            currentContent: currentContent || undefined,
          }),
          signal: controller.signal,
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error('No stream body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResult(accumulated);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Erro ao gerar conteúdo');
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleInsert = () => {
    if (result) {
      onInsert(result);
      onOpenChange(false);
      setResult('');
      setPrompt('');
      toast.success('Conteúdo inserido no playbook!');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (isStreaming) return; onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Escrever com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o que deseja gerar ou escolha um modelo rápido
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            {/* Quick prompts */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Modelos rápidos</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((qp) => (
                  <Badge
                    key={qp.label}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors px-3 py-1.5"
                    onClick={() => { setPrompt(qp.prompt); handleGenerate(qp.prompt); }}
                  >
                    {qp.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom prompt */}
            <div>
              <Label htmlFor="ai-prompt">O que deseja gerar?</Label>
              <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Crie um guia de prospecção ativa com scripts para LinkedIn e WhatsApp..."
                className="mt-1.5 min-h-[100px]"
              />
            </div>

            {/* Context */}
            <div>
              <Label htmlFor="ai-context">Contexto do seu negócio (opcional)</Label>
              <Textarea
                id="ai-context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: Mentoria de vendas para consultores de seguros, foco em prospecção digital..."
                className="mt-1.5 min-h-[60px] text-sm"
              />
            </div>

            <Button onClick={() => handleGenerate()} disabled={!prompt.trim() || isStreaming} className="w-full gap-2">
              {isStreaming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Gerar conteúdo
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            {/* Result preview */}
            <ScrollArea className="flex-1 border border-border rounded-lg p-4 bg-muted/20 max-h-[50vh]">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex gap-2">
              {isStreaming ? (
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  Parar geração
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setResult(''); }} className="gap-1.5">
                    <Wand2 className="h-3.5 w-3.5" />
                    Gerar novamente
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button onClick={handleInsert} className="flex-1 gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Inserir no Playbook
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
