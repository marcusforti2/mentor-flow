import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  Loader2, 
  Instagram, 
  Linkedin,
  Mail,
  Phone,
  Sparkles,
  Users,
  FileText,
  UserCheck,
  Zap,
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BusinessProfile } from '@/lib/api/firecrawl';
import ReactMarkdown from 'react-markdown';
import { useAIToolHistory } from '@/hooks/useAIToolHistory';
import { AIToolHistoryPanel } from './AIToolHistoryPanel';

interface CommunicationHubProps {
  mentoradoId: string | null;
}

type Tone = 'casual' | 'professional' | 'direct';

interface SavedLead {
  id: string;
  contact_name: string;
  company: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  temperature: string | null;
  status: string | null;
  ai_insights: any;
  notes: string | null;
}

interface GeneratedContent {
  scripts?: {
    dm_inicial?: string;
    dm_followup?: string;
    ligacao?: string;
    proposta?: string;
  };
  followup?: string;
  coldMessages?: {
    whatsapp?: any;
    instagram?: any;
    linkedin?: any;
    email?: any;
  };
}

const scriptOptions = [
  { id: 'dm_inicial', label: 'DM Inicial (Prospecção)', icon: MessageSquare },
  { id: 'dm_followup', label: 'DM Follow-up', icon: MessageCircle },
  { id: 'ligacao', label: 'Script de Ligação', icon: Phone },
  { id: 'proposta', label: 'Apresentação de Proposta', icon: FileText },
];

const coldMessageOptions = [
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: 'text-green-500' },
  { id: 'instagram', label: 'Instagram DM', icon: Instagram, color: 'text-pink-500' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-500' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-amber-500' },
];

export function CommunicationHub({ mentoradoId }: CommunicationHubProps) {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadContext, setLeadContext] = useState('');
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  
  // Selections
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [selectedColdMessages, setSelectedColdMessages] = useState<string[]>([]);
  const [generateFollowup, setGenerateFollowup] = useState(false);
  const [tone, setTone] = useState<Tone>('direct');
  
  // Results
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { history, loading: loadingHistory, saveToHistory } = useAIToolHistory(mentoradoId, 'communication_hub');

  useEffect(() => {
    const fetchData = async () => {
      if (!mentoradoId) return;
      setIsLoadingLeads(true);
      
      try {
        const [profileRes, leadsRes] = await Promise.all([
          supabase
            .from('mentorado_business_profiles')
            .select('*')
            .eq('membership_id', mentoradoId)
            .maybeSingle(),
          supabase
            .from('crm_prospections')
            .select('id, contact_name, company, contact_email, contact_phone, temperature, status, ai_insights, notes')
            .eq('membership_id', mentoradoId)
            .order('updated_at', { ascending: false })
            .limit(50)
        ]);
        
        if (profileRes.data) setBusinessProfile(profileRes.data);
        if (leadsRes.data) setLeads(leadsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    
    fetchData();
  }, [mentoradoId]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    
    if (leadId === 'manual') {
      setLeadContext('');
      return;
    }
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    const contextParts: string[] = [];
    contextParts.push(`Nome: ${lead.contact_name}`);
    if (lead.company) contextParts.push(`Empresa: ${lead.company}`);
    if (lead.contact_email) contextParts.push(`Email: ${lead.contact_email}`);
    if (lead.contact_phone) contextParts.push(`Telefone: ${lead.contact_phone}`);
    
    if (lead.temperature) {
      const tempLabels: Record<string, string> = { hot: 'Lead quente 🔥', warm: 'Lead morno ☀️', cold: 'Lead frio ❄️' };
      contextParts.push(tempLabels[lead.temperature] || lead.temperature);
    }
    
    const insights = lead.ai_insights as any;
    if (insights?.behavioral_profile) {
      // Lead passou pela qualificação completa
      if (insights.score) contextParts.push(`Score: ${insights.score}/100`);
      if (insights.summary) contextParts.push(`Resumo: ${insights.summary}`);
      
      // Perfil comportamental
      const behavior = insights.behavioral_profile;
      contextParts.push(`\n--- PERFIL COMPORTAMENTAL ---`);
      contextParts.push(`Estilo DISC: ${behavior.primary_style?.toUpperCase() || 'N/A'}`);
      if (behavior.communication_preference) contextParts.push(`Como se comunica: ${behavior.communication_preference}`);
      if (behavior.what_motivates?.length) contextParts.push(`Motivadores: ${behavior.what_motivates.slice(0,3).join(', ')}`);
      if (behavior.buying_triggers?.length) contextParts.push(`Gatilhos de compra: ${behavior.buying_triggers.slice(0,3).join(', ')}`);
      
      // Perspectiva
      const perspective = insights.lead_perspective;
      if (perspective) {
        contextParts.push(`\n--- PERSPECTIVA DO LEAD ---`);
        if (perspective.likely_goals?.length) contextParts.push(`Objetivos: ${perspective.likely_goals.slice(0,2).join(', ')}`);
        if (perspective.current_challenges?.length) contextParts.push(`Desafios: ${perspective.current_challenges.slice(0,2).join(', ')}`);
        if (perspective.fears_and_concerns?.length) contextParts.push(`Medos: ${perspective.fears_and_concerns.slice(0,2).join(', ')}`);
      }
      
      // Estratégia de abordagem
      const approach = insights.approach_strategy;
      if (approach) {
        contextParts.push(`\n--- ESTRATÉGIA ---`);
        if (approach.opening_hook) contextParts.push(`Gancho: ${approach.opening_hook}`);
        if (approach.key_points_to_touch?.length) contextParts.push(`Pontos chave: ${approach.key_points_to_touch.slice(0,3).join(', ')}`);
        if (approach.topics_to_avoid?.length) contextParts.push(`Evitar: ${approach.topics_to_avoid.slice(0,2).join(', ')}`);
      }
      
      // Ancoragem de valor
      const value = insights.value_anchoring;
      if (value) {
        contextParts.push(`\n--- ANCORAGEM ---`);
        if (value.pain_to_highlight) contextParts.push(`Dor a destacar: ${value.pain_to_highlight}`);
        if (value.result_to_promise) contextParts.push(`Resultado: ${value.result_to_promise}`);
      }
    } else if (insights) {
      // Dados básicos
      if (insights.summary) contextParts.push(`Resumo IA: ${insights.summary}`);
      if (insights.pain_points?.length) contextParts.push(`Dores: ${insights.pain_points.slice(0, 3).join(', ')}`);
      if (insights.opportunities?.length) contextParts.push(`Oportunidades: ${insights.opportunities.slice(0, 3).join(', ')}`);
    }
    
    if (lead.notes) contextParts.push(`Notas: ${lead.notes}`);
    
    setLeadContext(contextParts.join('\n'));
    
    const hasQualification = !!(insights?.behavioral_profile);
    toast.success(`Lead "${lead.contact_name}" selecionado${hasQualification ? ' (com qualificação completa)' : ''}`);
  };

  const toggleScript = (scriptId: string) => {
    setSelectedScripts(prev => 
      prev.includes(scriptId) ? prev.filter(s => s !== scriptId) : [...prev, scriptId]
    );
  };

  const toggleColdMessage = (channelId: string) => {
    setSelectedColdMessages(prev => 
      prev.includes(channelId) ? prev.filter(c => c !== channelId) : [...prev, channelId]
    );
  };

  const hasAnySelection = selectedScripts.length > 0 || selectedColdMessages.length > 0 || generateFollowup;

  const handleGenerate = async () => {
    if (!leadContext.trim()) {
      toast.error('Selecione um lead ou preencha o contexto');
      return;
    }
    
    if (!hasAnySelection) {
      toast.error('Selecione ao menos um tipo de conteúdo para gerar');
      return;
    }

    setIsLoading(true);
    setGeneratedContent({});
    
    const selectedLead = leads.find(l => l.id === selectedLeadId);
    const leadName = selectedLead?.contact_name || 'Lead';

    try {
      const promises: Promise<any>[] = [];
      const results: GeneratedContent = {};

      // Generate Scripts
      if (selectedScripts.length > 0) {
        for (const scriptType of selectedScripts) {
          promises.push(
            supabase.functions.invoke('ai-tools', {
              body: {
                tool: 'script_generator',
                mentorado_id: mentoradoId,
                data: { script_type: scriptType, lead_context: leadContext },
              },
            }).then(({ data }) => {
              if (!results.scripts) results.scripts = {};
              results.scripts[scriptType as keyof typeof results.scripts] = data?.result || '';
            })
          );
        }
      }

      // Generate Follow-up
      if (generateFollowup && selectedLeadId && selectedLeadId !== 'manual') {
        promises.push(
          supabase.functions.invoke('ai-tools', {
            body: {
              tool: 'followup_coach',
              mentorado_id: mentoradoId,
              data: { lead_id: selectedLeadId },
            },
          }).then(({ data }) => {
            results.followup = data?.result || '';
          })
        );
      }

      // Generate Cold Messages
      if (selectedColdMessages.length > 0) {
        for (const channel of selectedColdMessages) {
          promises.push(
            supabase.functions.invoke('cold-messages', {
              body: {
                leadName,
                leadContext,
                platform: channel,
                tone,
                businessProfile,
              },
            }).then(({ data }) => {
              if (!results.coldMessages) results.coldMessages = {};
              results.coldMessages[channel as keyof typeof results.coldMessages] = data?.messages || null;
            })
          );
        }
      }

      await Promise.all(promises);
      setGeneratedContent(results);
      toast.success('Conteúdos gerados com sucesso! 🎉');

      // Save to history
      const selectedLead2 = leads.find(l => l.id === selectedLeadId);
      await saveToHistory({
        title: `Comunicação: ${selectedLead2?.contact_name || 'Manual'}`,
        inputData: { leadContext, selectedScripts, selectedColdMessages, tone },
        outputData: results as any,
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Erro ao gerar conteúdos');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text, id)} className="h-8 px-2">
      {copiedField === id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );

  const selectedLead = leads.find(l => l.id === selectedLeadId);
  const selectionCount = selectedScripts.length + selectedColdMessages.length + (generateFollowup ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Main Configuration Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Central de Comunicação
            <Badge variant="secondary" className="ml-2">Unificada</Badge>
          </CardTitle>
          <CardDescription>
            Gere scripts, follow-ups e mensagens de prospecção de uma vez só
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           {/* Lead Selector */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Users className="h-4 w-4 text-primary" />
              1. Selecione o Lead
            </Label>
            <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingLeads ? "Carregando..." : "Escolha um lead do CRM"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">✏️ Digitar manualmente</SelectItem>
                {leads.map((lead) => {
                  const hasQualification = !!(lead.ai_insights as any)?.behavioral_profile;
                  return (
                    <SelectItem key={lead.id} value={lead.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lead.contact_name}</span>
                        {lead.company && <span className="text-muted-foreground">• {lead.company}</span>}
                        {lead.temperature && (
                          <Badge variant="outline" className="text-xs">
                            {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '☀️' : '❄️'}
                          </Badge>
                        )}
                        {hasQualification && (
                          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                            ✓ IA
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {selectedLead && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{selectedLead.contact_name}</span>
                  {!!(selectedLead.ai_insights as any)?.behavioral_profile && (
                    <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                      Com Qualificação
                    </Badge>
                  )}
                </div>
                {selectedLead.company && <div className="text-muted-foreground">{selectedLead.company}</div>}
              </div>
            )}
            
            <Textarea
              placeholder="Contexto adicional do lead (preenchido automaticamente se selecionar um lead)"
              value={leadContext}
              onChange={(e) => setLeadContext(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          <Separator />

          {/* Content Selection */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-medium">
              <FileText className="h-4 w-4 text-primary" />
              2. O que você quer gerar?
            </Label>
            
            {/* Scripts */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Scripts de Vendas</p>
              <div className="grid grid-cols-2 gap-2">
                {scriptOptions.map((script) => {
                  const Icon = script.icon;
                  const isSelected = selectedScripts.includes(script.id);
                  return (
                    <div
                      key={script.id}
                      onClick={() => toggleScript(script.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox checked={isSelected} />
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm">{script.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Follow-up */}
            <div
              onClick={() => setGenerateFollowup(!generateFollowup)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                generateFollowup ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
              }`}
            >
              <Checkbox checked={generateFollowup} />
              <UserCheck className={`h-4 w-4 ${generateFollowup ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <span className="text-sm font-medium">Coach de Follow-up</span>
                <p className="text-xs text-muted-foreground">Estratégia inteligente baseada no histórico</p>
              </div>
            </div>

            {/* Cold Messages */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Sequências de Prospecção</p>
              <div className="grid grid-cols-2 gap-2">
                {coldMessageOptions.map((channel) => {
                  const Icon = channel.icon;
                  const isSelected = selectedColdMessages.includes(channel.id);
                  return (
                    <div
                      key={channel.id}
                      onClick={() => toggleColdMessage(channel.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox checked={isSelected} />
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : channel.color}`} />
                      <span className="text-sm">{channel.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Separator />

          {/* Tone Selection */}
          {(selectedScripts.length > 0 || selectedColdMessages.length > 0) && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Zap className="h-4 w-4 text-primary" />
                3. Tom da Comunicação
              </Label>
              <RadioGroup value={tone} onValueChange={(v) => setTone(v as Tone)} className="flex gap-3">
                <div className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer flex-1 ${tone === 'casual' ? 'border-primary bg-primary/10' : ''}`}>
                  <RadioGroupItem value="casual" id="casual" />
                  <Label htmlFor="casual" className="cursor-pointer">
                    <span className="font-medium">😊 Casual</span>
                    <p className="text-xs text-muted-foreground">Descontraído</p>
                  </Label>
                </div>
                <div className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer flex-1 ${tone === 'professional' ? 'border-primary bg-primary/10' : ''}`}>
                  <RadioGroupItem value="professional" id="professional" />
                  <Label htmlFor="professional" className="cursor-pointer">
                    <span className="font-medium">💼 Profissional</span>
                    <p className="text-xs text-muted-foreground">Formal</p>
                  </Label>
                </div>
                <div className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer flex-1 ${tone === 'direct' ? 'border-primary bg-primary/10' : ''}`}>
                  <RadioGroupItem value="direct" id="direct" />
                  <Label htmlFor="direct" className="cursor-pointer">
                    <span className="font-medium">🎯 Direto</span>
                    <p className="text-xs text-muted-foreground">Objetivo</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || !hasAnySelection || !leadContext.trim()} 
            className="w-full" 
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando {selectionCount} conteúdo{selectionCount > 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar {selectionCount > 0 ? `${selectionCount} Conteúdo${selectionCount > 1 ? 's' : ''}` : 'Conteúdos'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {Object.keys(generatedContent).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-primary" />
              Conteúdos Gerados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(generatedContent)[0]} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {generatedContent.scripts && Object.keys(generatedContent.scripts).length > 0 && (
                  <TabsTrigger value="scripts" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />Scripts
                  </TabsTrigger>
                )}
                {generatedContent.followup && (
                  <TabsTrigger value="followup" className="text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />Follow-up
                  </TabsTrigger>
                )}
                {generatedContent.coldMessages && Object.keys(generatedContent.coldMessages).length > 0 && (
                  Object.keys(generatedContent.coldMessages).map(channel => (
                    <TabsTrigger key={channel} value={`cold-${channel}`} className="text-xs">
                      {channel === 'whatsapp' && <Phone className="h-3 w-3 mr-1" />}
                      {channel === 'instagram' && <Instagram className="h-3 w-3 mr-1" />}
                      {channel === 'linkedin' && <Linkedin className="h-3 w-3 mr-1" />}
                      {channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                      {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </TabsTrigger>
                  ))
                )}
              </TabsList>

              {/* Scripts Tab */}
              {generatedContent.scripts && (
                <TabsContent value="scripts" className="mt-4 space-y-4">
                  {Object.entries(generatedContent.scripts).map(([type, content]) => {
                    const scriptInfo = scriptOptions.find(s => s.id === type);
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{scriptInfo?.label || type}</Badge>
                          <CopyButton text={content} id={`script-${type}`} />
                        </div>
                        <ScrollArea className="h-[300px] border rounded-lg p-4 bg-card">
                          <div className="prose-ai-content">
                            <ReactMarkdown>{content}</ReactMarkdown>
                          </div>
                        </ScrollArea>
                      </div>
                    );
                  })}
                </TabsContent>
              )}

              {/* Follow-up Tab */}
              {generatedContent.followup && (
                <TabsContent value="followup" className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">Estratégia de Follow-up</Badge>
                    <CopyButton text={generatedContent.followup} id="followup" />
                  </div>
                  <ScrollArea className="h-[400px] border rounded-lg p-4 bg-card">
                    <div className="prose-ai-content">
                      <ReactMarkdown>{generatedContent.followup}</ReactMarkdown>
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {/* Cold Messages Tabs */}
              {generatedContent.coldMessages && Object.entries(generatedContent.coldMessages).map(([channel, messages]) => (
                <TabsContent key={channel} value={`cold-${channel}`} className="mt-4 space-y-4">
                  {messages && (
                    <>
                      {/* Message 1 */}
                      {messages.message1 && (
                        <Card className="overflow-hidden">
                          <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge>1ª Mensagem - {messages.message1.title}</Badge>
                              <CopyButton 
                                text={messages.message1.subject 
                                  ? `Assunto: ${messages.message1.subject}\n\n${messages.message1.content}`
                                  : messages.message1.content} 
                                id={`${channel}-msg1`} 
                              />
                            </div>
                            {messages.message1.subject && (
                              <div className="bg-muted/50 rounded p-2 text-sm">
                                <span className="text-muted-foreground">Assunto:</span> {messages.message1.subject}
                              </div>
                            )}
                            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                              {messages.message1.content}
                            </div>
                            <p className="text-xs text-muted-foreground">⏰ {messages.message1.timing}</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Message 2 */}
                      {messages.message2 && (
                        <Card className="overflow-hidden">
                          <div className="h-1 bg-gradient-to-r from-secondary to-secondary/50" />
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">2ª Mensagem - {messages.message2.title}</Badge>
                              <CopyButton 
                                text={messages.message2.subject 
                                  ? `Assunto: ${messages.message2.subject}\n\n${messages.message2.content}`
                                  : messages.message2.content} 
                                id={`${channel}-msg2`} 
                              />
                            </div>
                            {messages.message2.subject && (
                              <div className="bg-muted/50 rounded p-2 text-sm">
                                <span className="text-muted-foreground">Assunto:</span> {messages.message2.subject}
                              </div>
                            )}
                            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                              {messages.message2.content}
                            </div>
                            <p className="text-xs text-muted-foreground">⏰ {messages.message2.timing}</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Message 3 (Email only) */}
                      {messages.message3 && (
                        <Card className="overflow-hidden">
                          <div className="h-1 bg-gradient-to-r from-muted-foreground to-muted-foreground/50" />
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">3ª Mensagem - {messages.message3.title}</Badge>
                              <CopyButton 
                                text={messages.message3.subject 
                                  ? `Assunto: ${messages.message3.subject}\n\n${messages.message3.content}`
                                  : messages.message3.content} 
                                id={`${channel}-msg3`} 
                              />
                            </div>
                            {messages.message3.subject && (
                              <div className="bg-muted/50 rounded p-2 text-sm">
                                <span className="text-muted-foreground">Assunto:</span> {messages.message3.subject}
                              </div>
                            )}
                            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                              {messages.message3.content}
                            </div>
                            <p className="text-xs text-muted-foreground">⏰ {messages.message3.timing}</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Tips */}
                      {messages.tips && messages.tips.length > 0 && (
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="pt-4">
                            <p className="font-medium text-sm mb-2">💡 Dicas para {channel}</p>
                            <ul className="space-y-1">
                              {messages.tips.map((tip: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">• {tip}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <AIToolHistoryPanel
        history={history}
        loading={loadingHistory}
        onSelect={(entry) => {
          if (entry.output_data && typeof entry.output_data === 'object') {
            setGeneratedContent(entry.output_data as any);
          }
          toast.success('Conteúdo carregado do histórico');
        }}
      />
    </div>
  );
}
