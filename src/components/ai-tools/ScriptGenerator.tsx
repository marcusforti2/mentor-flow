import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Sparkles, Copy, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ScriptGeneratorProps {
  mentoradoId: string;
}

const scriptTypes = [
  { value: 'dm_inicial', label: 'DM Inicial (Prospecção)' },
  { value: 'dm_followup', label: 'DM Follow-up' },
  { value: 'ligacao', label: 'Ligação de Vendas' },
  { value: 'proposta', label: 'Apresentação de Proposta' },
];

export function ScriptGenerator({ mentoradoId }: ScriptGeneratorProps) {
  const [scriptType, setScriptType] = useState('');
  const [leadContext, setLeadContext] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!scriptType) {
      toast.error('Selecione o tipo de script');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'script_generator',
          mentorado_id: mentoradoId,
          data: {
            script_type: scriptType,
            lead_context: leadContext,
          },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data?.result || '');
      toast.success('Scripts gerados com sucesso!');
    } catch (error) {
      console.error('Error generating script:', error);
      toast.error('Erro ao gerar scripts');
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
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Gerador de Scripts</CardTitle>
          </div>
          <CardDescription>
            Crie scripts personalizados para cada etapa do seu funil de vendas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Script</Label>
            <Select value={scriptType} onValueChange={setScriptType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {scriptTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Contexto do Lead (opcional)</Label>
            <Textarea
              placeholder="Ex: CEO de startup de tecnologia, interessado em escalar vendas, já tentou outras consultorias..."
              value={leadContext}
              onChange={(e) => setLeadContext(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Quanto mais contexto, mais personalizado será o script
            </p>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || !scriptType}
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
                Gerar Scripts
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
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>Seus scripts aparecerão aqui</p>
              <p className="text-sm">Selecione o tipo e clique em gerar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
