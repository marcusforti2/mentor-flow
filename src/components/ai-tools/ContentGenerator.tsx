import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pen, Sparkles, Copy, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ContentGeneratorProps {
  mentoradoId: string;
}

const contentTypes = [
  { value: 'post_linkedin', label: 'Post LinkedIn' },
  { value: 'carrossel_ig', label: 'Carrossel Instagram' },
  { value: 'story', label: 'Sequência de Stories' },
  { value: 'copy_anuncio', label: 'Copy de Anúncio' },
  { value: 'reels_script', label: 'Roteiro Reels/TikTok' },
];

export function ContentGenerator({ mentoradoId }: ContentGeneratorProps) {
  const [contentType, setContentType] = useState('');
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!contentType || !topic.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'content_generator',
          mentorado_id: mentoradoId,
          data: {
            content_type: contentType,
            topic: topic.trim(),
          },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data?.result || '');
      toast.success('Conteúdo gerado com sucesso!');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Erro ao gerar conteúdo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pen className="h-5 w-5 text-primary" />
            <CardTitle>Gerador de Conteúdo</CardTitle>
          </div>
          <CardDescription>
            Crie conteúdo para construir autoridade e atrair clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Conteúdo</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o formato..." />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tema / Assunto</Label>
            <Input
              placeholder="Ex: Como aumentar o ticket médio, Os 3 erros que afastam clientes..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Seja específico para um resultado mais personalizado
            </p>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || !contentType || !topic.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Conteúdo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Resultado</CardTitle>
            {result && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="prose-ai-content max-h-[500px] overflow-y-auto pr-2">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <Pen className="h-12 w-12 mb-4 opacity-50" />
              <p>Seu conteúdo aparecerá aqui</p>
              <p className="text-sm">Selecione o tipo e tema, depois clique em gerar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
