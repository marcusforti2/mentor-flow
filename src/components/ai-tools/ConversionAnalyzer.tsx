import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, Sparkles, RefreshCw, BarChart3, Target, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ConversionAnalyzerProps {
  mentoradoId: string;
}

export function ConversionAnalyzer({ mentoradoId }: ConversionAnalyzerProps) {
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'conversion_analyzer',
          mentorado_id: mentoradoId,
          data: {},
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data?.result || '');
      toast.success('Análise concluída!');
    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('Erro ao analisar pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Analisador de Conversão</CardTitle>
            </div>
            <Button onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analisar Pipeline
                </>
              )}
            </Button>
          </div>
          <CardDescription>
            Identifique padrões de sucesso e fracasso nos seus leads
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">O que analisamos</p>
                <p className="font-semibold">Leads Fechados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comparamos com</p>
                <p className="font-semibold">Leads Perdidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Para encontrar</p>
                <p className="font-semibold">Padrões de Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Relatório de Análise</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="prose-ai-content max-h-[500px] overflow-y-auto pr-2">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
              <p>A análise aparecerá aqui</p>
              <p className="text-sm">Clique em "Analisar Pipeline" para identificar padrões</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
