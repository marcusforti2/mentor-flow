import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileSignature, Sparkles, Copy, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ProposalCreatorProps {
  mentoradoId: string;
}

export function ProposalCreator({ mentoradoId }: ProposalCreatorProps) {
  const [clientName, setClientName] = useState('');
  const [company, setCompany] = useState('');
  const [mainPain, setMainPain] = useState('');
  const [proposalType, setProposalType] = useState('completa');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!clientName.trim() || !mainPain.trim()) {
      toast.error('Preencha o nome do cliente e a dor principal');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'proposal_creator',
          mentorado_id: mentoradoId,
          data: {
            client_name: clientName.trim(),
            company: company.trim(),
            main_pain: mainPain.trim(),
            proposal_type: proposalType,
          },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data?.result || '');
      toast.success('Proposta gerada com sucesso!');
    } catch (error) {
      console.error('Error generating proposal:', error);
      toast.error('Erro ao gerar proposta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copiado para a área de transferência!');
  };

  const handleClear = () => {
    setClientName('');
    setCompany('');
    setMainPain('');
    setResult('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <CardTitle>Criador de Propostas</CardTitle>
          </div>
          <CardDescription>
            Crie propostas comerciais profissionais e persuasivas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input
                placeholder="Ex: Tech Solutions"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dor Principal do Cliente *</Label>
            <Textarea
              placeholder="Ex: Dificuldade em converter leads em clientes, ciclo de vendas muito longo, baixa taxa de fechamento..."
              value={mainPain}
              onChange={(e) => setMainPain(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Proposta</Label>
            <Select value={proposalType} onValueChange={setProposalType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completa">Completa e Detalhada</SelectItem>
                <SelectItem value="resumida">Resumida e Objetiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={isLoading || !clientName.trim() || !mainPain.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Proposta
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Proposta Comercial</CardTitle>
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
              <FileSignature className="h-12 w-12 mb-4 opacity-50" />
              <p>Sua proposta aparecerá aqui</p>
              <p className="text-sm">Preencha os dados do cliente e clique em gerar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
