import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Target, 
  User, 
  MessageSquare, 
  AlertTriangle, 
  Shield, 
  DollarSign,
  Loader2,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  Brain,
  Crosshair,
  Ban,
  Zap,
  FileText,
  Link2,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { leadQualifierApi, LeadQualificationReport, BusinessProfile } from '@/lib/api/firecrawl';

interface LeadQualifierProps {
  mentoradoId: string | null;
}

export function LeadQualifier({ mentoradoId }: LeadQualifierProps) {
  const [profileUrl, setProfileUrl] = useState('');
  const [manualProfileData, setManualProfileData] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'manual'>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<LeadQualificationReport | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [blockedPlatformError, setBlockedPlatformError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!mentoradoId) return;

      try {
        const { data } = await supabase
          .from('mentorado_business_profiles')
          .select('*')
          .eq('mentorado_id', mentoradoId)
          .single();

        if (data) {
          setBusinessProfile(data);
        }
      } catch (error) {
        console.error('Error fetching business profile:', error);
      }
    };

    fetchBusinessProfile();
  }, [mentoradoId]);

  const handleAnalyze = async () => {
    if (inputMode === 'url' && !profileUrl.trim()) {
      toast.error('Cole a URL do perfil do lead');
      return;
    }
    
    if (inputMode === 'manual' && (!manualProfileData.trim() || manualProfileData.trim().length < 50)) {
      toast.error('Cole os dados do perfil (mínimo 50 caracteres)');
      return;
    }

    setIsLoading(true);
    setReport(null);
    setBlockedPlatformError(null);

    try {
      const result = await leadQualifierApi.analyze(
        inputMode === 'url' ? profileUrl : undefined, 
        businessProfile || undefined,
        inputMode === 'manual' ? manualProfileData : undefined
      );

      if (result.success && result.report) {
        setReport(result.report);
        
        // Auto-save to CRM
        if (mentoradoId) {
          await saveLeadToCRM(result.report);
        }
        
        toast.success('Análise concluída e lead salvo no CRM!');
      } else {
        // Check if it's a blocked platform error
        if (result.requiresManualInput) {
          setBlockedPlatformError(result.error || 'Plataforma bloqueada');
          setInputMode('manual');
          toast.error('Plataforma não permite scraping. Use o modo manual.');
        } else {
          toast.error(result.error || 'Erro ao analisar perfil');
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erro ao analisar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const saveLeadToCRM = async (reportData: LeadQualificationReport) => {
    if (!mentoradoId) return;

    try {
      const extractedData = reportData.extracted_data;
      const leadName = extractedData?.name || 'Lead Qualificado';
      
      // Determine temperature based on recommendation
      const temperatureMap: Record<string, string> = {
        'pursue_hot': 'hot',
        'nurture': 'warm',
        'low_priority': 'cold',
        'not_fit': 'cold'
      };
      const temperature = temperatureMap[reportData.recommendation] || 'warm';

      // Check if lead already exists by name
      const { data: existingLead } = await supabase
        .from('crm_prospections')
        .select('id')
        .eq('mentorado_id', mentoradoId)
        .eq('contact_name', leadName)
        .maybeSingle();

      if (existingLead) {
        // Update existing lead with new insights
        await supabase
          .from('crm_prospections')
          .update({
            ai_insights: JSON.parse(JSON.stringify(reportData)),
            temperature,
            company: extractedData?.company || null,
            notes: `Score: ${reportData.score}/100 - ${reportData.summary}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id);
        
        console.log('Lead updated in CRM:', existingLead.id);
      } else {
        // Create new lead
        const { data: newLead, error } = await supabase
          .from('crm_prospections')
          .insert([{
            mentorado_id: mentoradoId,
            contact_name: leadName,
            company: extractedData?.company || null,
            temperature,
            status: 'contacted',
            ai_insights: JSON.parse(JSON.stringify(reportData)),
            notes: `Score: ${reportData.score}/100 - ${reportData.summary}`,
            points: reportData.score >= 75 ? 3 : reportData.score >= 50 ? 2 : 1
          }])
          .select()
          .single();

        if (error) {
          console.error('Error saving lead:', error);
        } else {
          console.log('Lead saved to CRM:', newLead?.id);
        }
      }
    } catch (error) {
      console.error('Error saving lead to CRM:', error);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    if (score >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRecommendationBadge = (recommendation: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pursue_hot: { label: '🔥 Lead Quente - Prioridade!', variant: 'default' },
      nurture: { label: '🌱 Nutrir - Potencial', variant: 'secondary' },
      low_priority: { label: '⏳ Baixa Prioridade', variant: 'outline' },
      not_fit: { label: '❌ Não é Fit', variant: 'destructive' },
    };
    return config[recommendation] || { label: recommendation, variant: 'outline' };
  };

  const getStyleColor = (style: string) => {
    const colors: Record<string, string> = {
      dominante: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      influente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      estavel: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      analitico: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    return colors[style] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Qualificador de Leads
          </CardTitle>
          <CardDescription>
            Analise perfis de leads com IA para estratégias personalizadas de abordagem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Mode Selector */}
          <div className="flex gap-2">
            <Button 
              variant={inputMode === 'url' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setInputMode('url')}
            >
              <Link2 className="h-4 w-4 mr-2" />
              URL do Perfil
            </Button>
            <Button 
              variant={inputMode === 'manual' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setInputMode('manual')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Colar Manualmente
            </Button>
          </div>

          {blockedPlatformError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {blockedPlatformError}
                <br />
                <span className="text-xs mt-1 block">
                  Copie o conteúdo do perfil (bio, posts, informações) e cole abaixo.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {inputMode === 'url' ? (
            <div className="flex gap-2">
              <Input
                placeholder="https://linkedin.com/in/... ou site pessoal/empresa"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAnalyze} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analisar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Cole aqui as informações do perfil do lead:
                
• Bio/Descrição do perfil
• Posts recentes (últimos 3-5)
• Informações profissionais
• Interesses e conteúdos que compartilha
• Qualquer informação relevante

Quanto mais detalhes, melhor a análise!"
                value={manualProfileData}
                onChange={(e) => setManualProfileData(e.target.value)}
                className="min-h-[200px]"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {manualProfileData.length} caracteres (mínimo 50)
                </span>
                <Button onClick={handleAnalyze} disabled={isLoading || manualProfileData.length < 50}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analisar Perfil
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {!businessProfile && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Complete seu perfil de negócio para análises mais personalizadas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-1 h-auto">
                <TabsTrigger value="overview" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="behavioral" className="text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  Comportamento
                </TabsTrigger>
                <TabsTrigger value="approach" className="text-xs">
                  <Crosshair className="h-3 w-3 mr-1" />
                  Abordagem
                </TabsTrigger>
                <TabsTrigger value="avoid" className="text-xs">
                  <Ban className="h-3 w-3 mr-1" />
                  Evitar
                </TabsTrigger>
                <TabsTrigger value="objections" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Objeções
                </TabsTrigger>
                <TabsTrigger value="value" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Valor
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${getScoreColor(report.score)}`}>
                          {report.score}
                        </div>
                        <p className="text-muted-foreground mt-2">Score de Qualificação</p>
                        <div className="mt-4">
                          {(() => {
                            const badge = getRecommendationBadge(report.recommendation);
                            return <Badge variant={badge.variant}>{badge.label}</Badge>;
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <h4 className="font-semibold">Breakdown do Score</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Fit com Oferta</span>
                          <span>{report.score_breakdown.fit_with_offer}/25</span>
                        </div>
                        <Progress value={(report.score_breakdown.fit_with_offer / 25) * 100} />
                        
                        <div className="flex justify-between text-sm">
                          <span>Sinais de Compra</span>
                          <span>{report.score_breakdown.buying_signals}/25</span>
                        </div>
                        <Progress value={(report.score_breakdown.buying_signals / 25) * 100} />
                        
                        <div className="flex justify-between text-sm">
                          <span>Nível de Engajamento</span>
                          <span>{report.score_breakdown.engagement_level}/25</span>
                        </div>
                        <Progress value={(report.score_breakdown.engagement_level / 25) * 100} />
                        
                        <div className="flex justify-between text-sm">
                          <span>Capacidade Financeira</span>
                          <span>{report.score_breakdown.financial_capacity}/25</span>
                        </div>
                        <Progress value={(report.score_breakdown.financial_capacity / 25) * 100} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">Resumo Executivo</h4>
                    <p className="text-muted-foreground">{report.summary}</p>
                  </CardContent>
                </Card>

                {report.extracted_data && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">Dados Extraídos</h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nome:</span>
                          <span>{report.extracted_data.name}</span>
                        </div>
                        {report.extracted_data.headline && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Headline:</span>
                            <span className="text-right max-w-[60%]">{report.extracted_data.headline}</span>
                          </div>
                        )}
                        {report.extracted_data.industry && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nicho:</span>
                            <span>{report.extracted_data.industry}</span>
                          </div>
                        )}
                        {report.extracted_data.company && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Empresa:</span>
                            <span>{report.extracted_data.company}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Behavioral Tab */}
              <TabsContent value="behavioral" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <h4 className="font-semibold">Perfil Comportamental</h4>
                      <Badge className={getStyleColor(report.behavioral_profile.primary_style)}>
                        {report.behavioral_profile.primary_style.charAt(0).toUpperCase() + report.behavioral_profile.primary_style.slice(1)}
                      </Badge>
                      {report.behavioral_profile.secondary_style && (
                        <Badge variant="outline">{report.behavioral_profile.secondary_style}</Badge>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground">Como se Comunica</h5>
                        <p className="mt-1">{report.behavioral_profile.communication_preference}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground">Como Toma Decisões</h5>
                        <p className="mt-1">{report.behavioral_profile.decision_making_style}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground">Como Criar Rapport</h5>
                        <p className="mt-1">{report.behavioral_profile.how_to_build_rapport}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">✅ O que Motiva</h4>
                      <ul className="space-y-2">
                        {report.behavioral_profile.what_motivates.map((item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">❌ O que Frustra</h4>
                      <ul className="space-y-2">
                        {report.behavioral_profile.what_frustrates.map((item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3">Perspectiva do Lead</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">🎯 Objetivos Prováveis</h5>
                        <ul className="space-y-1 text-sm">
                          {report.lead_perspective.likely_goals.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">⚡ Desafios Atuais</h5>
                        <ul className="space-y-1 text-sm">
                          {report.lead_perspective.current_challenges.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">😰 Medos e Preocupações</h5>
                        <ul className="space-y-1 text-sm">
                          {report.lead_perspective.fears_and_concerns.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">✨ Desejos e Aspirações</h5>
                        <ul className="space-y-1 text-sm">
                          {report.lead_perspective.desires_and_aspirations.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Approach Tab */}
              <TabsContent value="approach" className="space-y-4 mt-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">🎣 Hook de Abertura</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(report.approach_strategy.opening_hook, 'hook')}
                      >
                        {copiedField === 'hook' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-lg">{report.approach_strategy.opening_hook}</p>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">📍 Melhor Canal</h4>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {report.approach_strategy.best_channel === 'dm_instagram' && '📱 Instagram DM'}
                        {report.approach_strategy.best_channel === 'linkedin' && '💼 LinkedIn'}
                        {report.approach_strategy.best_channel === 'whatsapp' && '📲 WhatsApp'}
                        {report.approach_strategy.best_channel === 'email' && '📧 Email'}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        {report.approach_strategy.best_time_to_contact}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">✅ Pontos para Tocar</h4>
                      <ul className="space-y-2">
                        {report.approach_strategy.key_points_to_touch.map((item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Avoid Tab */}
              <TabsContent value="avoid" className="space-y-4 mt-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cuidado! Esses comportamentos podem afastar este lead e prejudicar a venda.
                  </AlertDescription>
                </Alert>

                <Card className="border-red-200 dark:border-red-900">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">🚫 Comportamentos a Evitar</h4>
                    <ul className="space-y-2">
                      {report.what_pushes_away.behaviors_to_avoid.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">✗</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 dark:border-orange-900">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 text-orange-600 dark:text-orange-400">🔇 Palavras/Frases a Evitar</h4>
                    <div className="flex flex-wrap gap-2">
                      {report.what_pushes_away.words_to_avoid.map((item, i) => (
                        <Badge key={i} variant="outline" className="border-orange-300 dark:border-orange-700">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 dark:border-yellow-900">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 text-yellow-600 dark:text-yellow-400">⚠️ Abordagens que Falham</h4>
                    <ul className="space-y-2">
                      {report.what_pushes_away.approaches_that_fail.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">⚠</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3">📵 Assuntos para Evitar</h4>
                    <ul className="space-y-2">
                      {report.approach_strategy.topics_to_avoid.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Objections Tab */}
              <TabsContent value="objections" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {report.expected_objections.map((objection, i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            {objection.objection}
                          </h4>
                          <Badge 
                            variant={
                              objection.likelihood === 'alta' ? 'destructive' : 
                              objection.likelihood === 'media' ? 'secondary' : 'outline'
                            }
                          >
                            {objection.likelihood === 'alta' && '🔴 Alta'}
                            {objection.likelihood === 'media' && '🟡 Média'}
                            {objection.likelihood === 'baixa' && '🟢 Baixa'}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h5 className="text-sm font-medium text-muted-foreground">Estratégia de Resposta</h5>
                            <p className="mt-1 text-sm">{objection.response_strategy}</p>
                          </div>

                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-sm font-medium">💬 Script de Resposta</h5>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(objection.script_example, `script-${i}`)}
                              >
                                {copiedField === `script-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                            <p className="text-sm italic">{objection.script_example}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Value Tab */}
              <TabsContent value="value" className="space-y-4 mt-4">
                <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Ancoragem de Valor
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground">🎯 Dor Principal para Destacar</h5>
                        <p className="mt-1 font-medium">{report.value_anchoring.pain_to_highlight}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground">✨ Resultado para Prometer</h5>
                        <p className="mt-1 font-medium">{report.value_anchoring.result_to_promise}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground">👥 Ângulo de Prova Social</h5>
                        <p className="mt-1">{report.value_anchoring.social_proof_angle}</p>
                      </div>

                      <div className="bg-background rounded-lg p-4 border">
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">💰 Como Justificar o Preço</h5>
                        <p className="text-sm">{report.value_anchoring.price_justification}</p>
                      </div>

                      <div className="bg-background rounded-lg p-4 border">
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">📈 Argumento de ROI</h5>
                        <p className="text-sm">{report.value_anchoring.roi_argument}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
