import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  Loader2, 
  Instagram, 
  Linkedin,
  Mail,
  Phone,
  Lightbulb,
  Sparkles,
  Clock,
  Target,
  Zap,
  Users,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BusinessProfile } from '@/lib/api/firecrawl';

interface ColdMessageGeneratorProps {
  mentoradoId: string | null;
}

type Platform = 'instagram' | 'linkedin' | 'whatsapp' | 'email';
type Tone = 'casual' | 'professional' | 'direct';

interface ColdMessage {
  title: string;
  content: string;
  timing: string;
  subject?: string;
}

interface ColdMessagesResult {
  message1: ColdMessage;
  message2: ColdMessage;
  message3?: ColdMessage;
  tips: string[];
}

interface SavedLead {
  id: string;
  contact_name: string;
  company: string | null;
  temperature: string | null;
  ai_insights: any;
  notes: string | null;
  updated_at: string | null;
}

export function ColdMessageGenerator({ mentoradoId }: ColdMessageGeneratorProps) {
  const [leadName, setLeadName] = useState('');
  const [leadContext, setLeadContext] = useState('');
  const [platform, setPlatform] = useState<Platform>('whatsapp');
  const [tone, setTone] = useState<Tone>('direct');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ColdMessagesResult | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Fetch business profile and saved leads
  useEffect(() => {
    const fetchData = async () => {
      if (!mentoradoId) return;

      setIsLoadingLeads(true);

      try {
        // Fetch business profile
        const { data: profileData } = await supabase
          .from('mentorado_business_profiles')
          .select('*')
          .eq('mentorado_id', mentoradoId)
          .single();

        if (profileData) {
          setBusinessProfile(profileData);
        }

        // Fetch saved leads from CRM (most recent first)
        const { data: leadsData } = await supabase
          .from('crm_prospections')
          .select('id, contact_name, company, temperature, ai_insights, notes, updated_at')
          .eq('mentorado_id', mentoradoId)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (leadsData) {
          setSavedLeads(leadsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingLeads(false);
      }
    };

    fetchData();
  }, [mentoradoId]);

  // Handle lead selection
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    
    if (leadId === 'manual') {
      setLeadName('');
      setLeadContext('');
      return;
    }

    const lead = savedLeads.find(l => l.id === leadId);
    if (!lead) return;

    setLeadName(lead.contact_name);
    
    // Build context from saved data
    const contextParts: string[] = [];
    
    if (lead.company) {
      contextParts.push(`Empresa: ${lead.company}`);
    }
    
    if (lead.temperature) {
      const tempLabels: Record<string, string> = {
        hot: 'Lead quente',
        warm: 'Lead morno',
        cold: 'Lead frio'
      };
      contextParts.push(tempLabels[lead.temperature] || lead.temperature);
    }
    
    // Extract AI insights if available
    if (lead.ai_insights) {
      const insights = lead.ai_insights;
      
      if (insights.profileSummary) {
        contextParts.push(`Perfil: ${insights.profileSummary}`);
      }
      
      if (insights.painPoints && Array.isArray(insights.painPoints)) {
        contextParts.push(`Dores: ${insights.painPoints.slice(0, 3).join(', ')}`);
      }
      
      if (insights.opportunityScore) {
        contextParts.push(`Score de oportunidade: ${insights.opportunityScore}/10`);
      }
      
      if (insights.suggestedApproach) {
        contextParts.push(`Abordagem sugerida: ${insights.suggestedApproach}`);
      }
    }
    
    if (lead.notes) {
      contextParts.push(`Notas: ${lead.notes}`);
    }
    
    setLeadContext(contextParts.join('\n'));
  };

  const handleGenerate = async () => {
    if (!leadName.trim()) {
      toast.error('Digite o nome do lead');
      return;
    }

    setIsLoading(true);
    setMessages(null);

    try {
      const { data, error } = await supabase.functions.invoke('cold-messages', {
        body: {
          leadName,
          leadContext,
          platform,
          tone,
          businessProfile,
        },
      });

      if (error) throw error;

      if (data.success && data.messages) {
        setMessages(data.messages);
        toast.success('Sequência de mensagens gerada!');
      } else {
        toast.error(data.error || 'Erro ao gerar mensagens');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Erro ao gerar mensagens');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado para área de transferência!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const platformConfig = {
    whatsapp: {
      icon: Phone,
      label: 'WhatsApp',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: 'Mensagens diretas e conversacionais',
    },
    instagram: {
      icon: Instagram,
      label: 'Instagram DM',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      description: 'Abordagem casual e visual',
    },
    linkedin: {
      icon: Linkedin,
      label: 'LinkedIn',
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
      description: 'Networking profissional',
    },
    email: {
      icon: Mail,
      label: 'Email',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      description: 'Comunicação formal e detalhada',
    },
  };

  const PlatformIcon = platformConfig[platform].icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Gerador de Cold Messages
          </CardTitle>
          <CardDescription>
            Crie sequências de prospecção fria personalizadas para cada canal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lead Selector */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Selecionar Lead
            </Label>
            <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingLeads ? "Carregando leads..." : "Escolha um lead salvo ou digite manualmente"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Digitar manualmente</span>
                  </div>
                </SelectItem>
                {savedLeads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{lead.contact_name}</span>
                      {lead.company && (
                        <span className="text-muted-foreground text-xs">• {lead.company}</span>
                      )}
                      {lead.temperature && (
                        <Badge variant="outline" className={`text-xs ml-1 ${
                          lead.temperature === 'hot' ? 'border-destructive/50 text-destructive' :
                          lead.temperature === 'warm' ? 'border-warning/50 text-warning' :
                          'border-muted-foreground/50'
                        }`}>
                          {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '☀️' : '❄️'}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {savedLeads.length === 0 && !isLoadingLeads && (
              <p className="text-xs text-muted-foreground">
                Nenhum lead salvo. Adicione leads no CRM ou qualifique via IA.
              </p>
            )}
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Canal de Prospecção
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(platformConfig) as Platform[]).map((p) => {
                const config = platformConfig[p];
                const Icon = config.icon;
                return (
                  <Button
                    key={p}
                    type="button"
                    variant={platform === p ? 'default' : 'outline'}
                    onClick={() => setPlatform(p)}
                    className={`flex flex-col h-auto py-3 ${platform === p ? '' : 'hover:bg-muted/50'}`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${platform === p ? '' : config.color}`} />
                    <span className="text-xs font-medium">{config.label}</span>
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {platformConfig[platform].description}
            </p>
          </div>

          {/* Lead Name */}
          <div className="space-y-2">
            <Label htmlFor="leadName">Nome do Lead *</Label>
            <Input
              id="leadName"
              placeholder="Ex: Dr. João Silva"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              disabled={selectedLeadId && selectedLeadId !== 'manual'}
            />
          </div>

          {/* Lead Context */}
          <div className="space-y-2">
            <Label htmlFor="leadContext">Contexto do Lead (opcional)</Label>
            <Textarea
              id="leadContext"
              placeholder="Ex: Médico cardiologista, dono de clínica própria em SP, posta sobre qualidade de vida, ~10k seguidores, interesse em escalar consultório..."
              value={leadContext}
              onChange={(e) => setLeadContext(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Quanto mais contexto, mais personalizadas as mensagens serão
            </p>
          </div>

          {/* Tone Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Tom da Abordagem
            </Label>
            <RadioGroup value={tone} onValueChange={(v) => setTone(v as Tone)}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-all ${tone === 'casual' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <RadioGroupItem value="casual" id="casual" />
                  <Label htmlFor="casual" className="cursor-pointer flex-1">
                    <span className="font-medium">😊 Casual</span>
                    <p className="text-xs text-muted-foreground">Descontraído, com emojis</p>
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-all ${tone === 'professional' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <RadioGroupItem value="professional" id="professional" />
                  <Label htmlFor="professional" className="cursor-pointer flex-1">
                    <span className="font-medium">💼 Profissional</span>
                    <p className="text-xs text-muted-foreground">Cordial e formal</p>
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-all ${tone === 'direct' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <RadioGroupItem value="direct" id="direct" />
                  <Label htmlFor="direct" className="cursor-pointer flex-1">
                    <span className="font-medium">🎯 Direto</span>
                    <p className="text-xs text-muted-foreground">Objetivo, sem rodeios</p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando sequência de {platform === 'email' ? '3' : '2'} mensagens...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Sequência de Prospecção
              </>
            )}
          </Button>

          {!businessProfile && (
            <p className="text-xs text-center text-muted-foreground">
              💡 Complete seu perfil de negócio para mensagens mais personalizadas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {messages && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-3 rounded-lg ${platformConfig[platform].bgColor}`}>
            <PlatformIcon className={`h-6 w-6 ${platformConfig[platform].color}`} />
            <div>
              <h3 className="font-semibold text-foreground">Sequência para {platformConfig[platform].label}</h3>
              <p className="text-xs text-muted-foreground">
                {platform === 'email' ? '3 emails' : '2 mensagens'} prontas para enviar
              </p>
            </div>
          </div>

          {/* Message 1 */}
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                    1ª Mensagem
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{messages.message1.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(
                    messages.message1.subject 
                      ? `Assunto: ${messages.message1.subject}\n\n${messages.message1.content}`
                      : messages.message1.content, 
                    'msg1'
                  )}
                >
                  {copiedField === 'msg1' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {messages.message1.subject && (
                <div className="bg-muted/50 rounded-lg p-3 mb-3 border-l-2 border-primary">
                  <p className="text-xs text-muted-foreground mb-1">Assunto:</p>
                  <p className="text-sm font-medium text-foreground">{messages.message1.subject}</p>
                </div>
              )}
              
              <div className="bg-muted rounded-lg p-4 mb-3">
                <p className="whitespace-pre-wrap text-foreground">{messages.message1.content}</p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {messages.message1.timing}
              </div>
            </CardContent>
          </Card>

          {/* Message 2 */}
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-500/50" />
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
                    2ª Mensagem
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{messages.message2.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(
                    messages.message2.subject 
                      ? `Assunto: ${messages.message2.subject}\n\n${messages.message2.content}`
                      : messages.message2.content,
                    'msg2'
                  )}
                >
                  {copiedField === 'msg2' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {messages.message2.subject && (
                <div className="bg-muted/50 rounded-lg p-3 mb-3 border-l-2 border-amber-500">
                  <p className="text-xs text-muted-foreground mb-1">Assunto:</p>
                  <p className="text-sm font-medium text-foreground">{messages.message2.subject}</p>
                </div>
              )}
              
              <div className="bg-muted rounded-lg p-4 mb-3">
                <p className="whitespace-pre-wrap text-foreground">{messages.message2.content}</p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {messages.message2.timing}
              </div>
            </CardContent>
          </Card>

          {/* Message 3 (for email) */}
          {messages.message3 && (
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-green-500 to-green-500/50" />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                      3ª Mensagem
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{messages.message3.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      messages.message3!.subject 
                        ? `Assunto: ${messages.message3!.subject}\n\n${messages.message3!.content}`
                        : messages.message3!.content,
                      'msg3'
                    )}
                  >
                    {copiedField === 'msg3' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {messages.message3.subject && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-3 border-l-2 border-green-500">
                    <p className="text-xs text-muted-foreground mb-1">Assunto:</p>
                    <p className="text-sm font-medium text-foreground">{messages.message3.subject}</p>
                  </div>
                )}
                
                <div className="bg-muted rounded-lg p-4 mb-3">
                  <p className="whitespace-pre-wrap text-foreground">{messages.message3.content}</p>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {messages.message3.timing}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {messages.tips && messages.tips.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Dicas para Maximizar Conversão</h4>
                </div>
                <ul className="space-y-3">
                  {messages.tips.map((tip, i) => (
                    <li key={i} className="text-sm flex items-start gap-3">
                      <span className="text-primary font-bold">{i + 1}.</span>
                      <span className="text-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
