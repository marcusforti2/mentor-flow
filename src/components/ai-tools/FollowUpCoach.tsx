import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck, Sparkles, Copy, RefreshCw, User, Building } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface FollowUpCoachProps {
  mentoradoId: string;
}

interface Lead {
  id: string;
  contact_name: string;
  company: string | null;
  status: string | null;
  temperature: string | null;
  ai_insights: any;
}

export function FollowUpCoach({ mentoradoId }: FollowUpCoachProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase
          .from('crm_prospections')
          .select('id, contact_name, company, status, temperature, ai_insights')
          .eq('mentorado_id', mentoradoId)
          .not('status', 'eq', 'fechado')
          .not('status', 'eq', 'perdido')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setLeads(data || []);
      } catch (error) {
        console.error('Error fetching leads:', error);
        toast.error('Erro ao carregar leads');
      } finally {
        setIsLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [mentoradoId]);

  const handleGenerate = async () => {
    if (!selectedLeadId) {
      toast.error('Selecione um lead');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-tools', {
        body: {
          tool: 'followup_coach',
          mentorado_id: mentoradoId,
          data: {
            lead_id: selectedLeadId,
          },
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data?.result || '');
      toast.success('Estratégia de follow-up gerada!');
    } catch (error) {
      console.error('Error generating follow-up:', error);
      toast.error('Erro ao gerar follow-up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copiado para a área de transferência!');
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId);
  const hasQualification = !!(selectedLead?.ai_insights?.behavioral_profile);

  const getTemperatureColor = (temp: string | null) => {
    switch (temp) {
      case 'quente': return 'bg-red-500/20 text-red-500';
      case 'morno': return 'bg-yellow-500/20 text-yellow-500';
      case 'frio': return 'bg-blue-500/20 text-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <CardTitle>Coach de Follow-up</CardTitle>
          </div>
          <CardDescription>
            Receba sugestões inteligentes de follow-up baseadas no histórico do lead
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selecione o Lead</Label>
            {isLoadingLeads ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : leads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum lead ativo encontrado. Adicione leads no seu CRM primeiro.
              </p>
            ) : (
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{lead.contact_name}</span>
                        {lead.company && (
                          <span className="text-muted-foreground">| {lead.company}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedLead && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedLead.contact_name}</span>
                {hasQualification && (
                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                    ✓ Qualificado
                  </Badge>
                )}
              </div>
              {selectedLead.company && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedLead.company}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedLead.status || 'Sem status'}</Badge>
                {selectedLead.temperature && (
                  <Badge className={getTemperatureColor(selectedLead.temperature)}>
                    {selectedLead.temperature}
                  </Badge>
                )}
              </div>
              {hasQualification && selectedLead.ai_insights && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5 text-xs">
                  <p className="text-muted-foreground font-medium">Dados da qualificação:</p>
                  {selectedLead.ai_insights.behavioral_profile?.primary_style && (
                    <p><span className="text-muted-foreground">DISC:</span> {selectedLead.ai_insights.behavioral_profile.primary_style.toUpperCase()}</p>
                  )}
                  {selectedLead.ai_insights.score && (
                    <p><span className="text-muted-foreground">Score:</span> {selectedLead.ai_insights.score}/100</p>
                  )}
                  {selectedLead.ai_insights.approach_strategy?.best_channel && (
                    <p><span className="text-muted-foreground">Melhor canal:</span> {selectedLead.ai_insights.approach_strategy.best_channel}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || !selectedLeadId}
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
                Gerar Estratégia
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Estratégia de Follow-up</CardTitle>
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
              <UserCheck className="h-12 w-12 mb-4 opacity-50" />
              <p>Sua estratégia aparecerá aqui</p>
              <p className="text-sm">Selecione um lead e clique em gerar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
