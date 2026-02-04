import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileSignature, Sparkles, Copy, RefreshCw, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ProposalCreatorProps {
  mentoradoId: string | null;
}

interface SavedLead {
  id: string;
  contact_name: string;
  company: string | null;
  contact_email: string | null;
  temperature: string | null;
  ai_insights: any;
  notes: string | null;
}

export function ProposalCreator({ mentoradoId }: ProposalCreatorProps) {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  
  const [clientName, setClientName] = useState('');
  const [company, setCompany] = useState('');
  const [mainPain, setMainPain] = useState('');
  const [proposalType, setProposalType] = useState('completa');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      if (!mentoradoId) return;
      setIsLoadingLeads(true);
      
      try {
        const { data } = await supabase
          .from('crm_prospections')
          .select('id, contact_name, company, contact_email, temperature, ai_insights, notes')
          .eq('mentorado_id', mentoradoId)
          .order('updated_at', { ascending: false })
          .limit(50);
        
        if (data) setLeads(data);
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    
    fetchLeads();
  }, [mentoradoId]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    
    if (leadId === 'manual') {
      setClientName('');
      setCompany('');
      setMainPain('');
      return;
    }
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    setClientName(lead.contact_name);
    setCompany(lead.company || '');
    
    // Build main pain from AI insights
    const painParts: string[] = [];
    if (lead.ai_insights) {
      const insights = lead.ai_insights;
      if (insights.pain_points?.length) {
        painParts.push(`Dores identificadas: ${insights.pain_points.join(', ')}`);
      }
      if (insights.objections?.length) {
        painParts.push(`Objeções: ${insights.objections.join(', ')}`);
      }
      if (insights.opportunities?.length) {
        painParts.push(`Oportunidades: ${insights.opportunities.join(', ')}`);
      }
    }
    if (lead.notes) {
      painParts.push(lead.notes);
    }
    
    setMainPain(painParts.join('\n') || '');
    toast.success(`Dados de "${lead.contact_name}" carregados`);
  };

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
    setSelectedLeadId('');
    setClientName('');
    setCompany('');
    setMainPain('');
    setResult('');
  };

  const selectedLead = leads.find(l => l.id === selectedLeadId);

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
          {/* Lead Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Selecione um lead do CRM
            </Label>
            <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingLeads ? "Carregando..." : "Escolha um lead ou digite manualmente"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">✏️ Digitar manualmente</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{lead.contact_name}</span>
                      {lead.company && <span className="text-muted-foreground">• {lead.company}</span>}
                      {lead.temperature && (
                        <Badge variant="outline" className="text-xs">
                          {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '☀️' : '❄️'}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedLead && (
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                <p className="font-medium text-foreground">Lead selecionado: {selectedLead.contact_name}</p>
                {selectedLead.company && <p className="text-muted-foreground">{selectedLead.company}</p>}
              </div>
            )}
          </div>

          <Separator />

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
              rows={4}
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
              <p className="text-sm">Selecione um lead ou preencha os dados manualmente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
