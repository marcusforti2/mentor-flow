import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  UserPlus,
  History,
  Eye,
  Calendar,
  FileText,
  Download,
  Handshake,
  Scale,
  MessageCircle,
  Lightbulb,
  ChevronRight,
  BarChart3,
  Users,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { leadQualifierApi, LeadQualificationReport, BusinessProfile } from '@/lib/api/firecrawl';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

interface LeadQualifierProps {
  mentoradoId: string | null;
}

interface QualificationHistory {
  id: string;
  contact_name: string;
  company: string | null;
  temperature: string | null;
  ai_insights: any;
  updated_at: string;
  profile_url: string | null;
}

interface ExistingLead {
  id: string;
  contact_name: string;
  company: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  screenshot_urls: string[] | null;
}

export function LeadQualifier({ mentoradoId }: LeadQualifierProps) {
  const [profileUrl, setProfileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<LeadQualificationReport | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qualificationHistory, setQualificationHistory] = useState<QualificationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [existingLeads, setExistingLeads] = useState<ExistingLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Resolved tenant ID from membership
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(null);

  // Resolve tenant_id from membership
  useEffect(() => {
    const resolveIds = async () => {
      if (!mentoradoId) return;
      try {
        const { data: membership } = await supabase
          .from('memberships')
          .select('tenant_id')
          .eq('id', mentoradoId)
          .maybeSingle();
        
        if (membership) {
          setResolvedTenantId(membership.tenant_id);
        }
      } catch (error) {
        console.error('Error resolving IDs:', error);
      }
    };
    resolveIds();
  }, [mentoradoId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!mentoradoId) return;
      try {
      // Try membership_id first, then legacy mentorado_id
      // Query business profile by membership_id or mentorado_id
      const { data: profileData } = await supabase
          .from('mentorado_business_profiles')
          .select('*')
          .or(`membership_id.eq.${mentoradoId},mentorado_id.eq.${mentoradoId}`)
          .maybeSingle();
        
      if (profileData) {
        setBusinessProfile(profileData);
      }
      } catch (error) {
        console.error('Error fetching business profile:', error);
      }
    };
    fetchData();
  }, [mentoradoId]);

  const fetchExistingLeads = async () => {
    if (!mentoradoId) return;
    setIsLoadingLeads(true);
    try {
      const { data, error } = await supabase
        .from('crm_prospections')
        .select('id, contact_name, company, contact_email, contact_phone, notes, screenshot_urls')
        .or(`mentorado_id.eq.${mentoradoId},membership_id.eq.${mentoradoId}`)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setExistingLeads(data || []);
    } catch (error) {
      console.error('Error fetching existing leads:', error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchExistingLeads();
  }, [mentoradoId]);

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = existingLeads.find(l => l.id === leadId);
    if (lead) {
      // Build context info for the lead
      const contextParts: string[] = [];
      if (lead.contact_name) contextParts.push(`Nome: ${lead.contact_name}`);
      if (lead.company) contextParts.push(`Empresa: ${lead.company}`);
      if (lead.contact_email) contextParts.push(`Email: ${lead.contact_email}`);
      if (lead.contact_phone) contextParts.push(`Telefone: ${lead.contact_phone}`);
      if (lead.notes) contextParts.push(`Notas: ${lead.notes}`);
      
      setProfileUrl(contextParts.join(' | '));
      toast.success(`Lead "${lead.contact_name}" selecionado`);
    }
  };

  const fetchQualificationHistory = async () => {
    if (!mentoradoId) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('crm_prospections')
        .select('id, contact_name, company, temperature, ai_insights, updated_at, profile_url')
        .or(`mentorado_id.eq.${mentoradoId},membership_id.eq.${mentoradoId}`)
        .not('ai_insights', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const validHistory = (data || []).filter(item => {
        const insights = item.ai_insights;
        return insights && typeof insights === 'object' && 'score' in insights;
      }) as QualificationHistory[];
      setQualificationHistory(validHistory);
    } catch (error) {
      console.error('Error fetching qualification history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchQualificationHistory();
  }, [mentoradoId]);

  const loadHistoryReport = (historyItem: QualificationHistory) => {
    setReport(historyItem.ai_insights);
    toast.success(`Carregada qualificação de ${historyItem.contact_name}`);
  };

  const requalifyLead = async (historyItem: QualificationHistory) => {
    if (!historyItem.profile_url) {
      toast.error('Este lead não tem URL de perfil salva para requalificar');
      return;
    }
    
    // Delete the old lead
    try {
      await supabase
        .from('crm_prospections')
        .delete()
        .eq('id', historyItem.id);
      
      toast.info(`Lead antigo "${historyItem.contact_name}" removido. Iniciando nova qualificação...`);
      
      // Set the URL and trigger analysis
      setProfileUrl(historyItem.profile_url);
      setReport(null);
      setSelectedLeadId('');
      
      // Refresh lists
      await fetchQualificationHistory();
      await fetchExistingLeads();
      
      // Auto-start analysis after a brief delay
      setTimeout(() => {
        document.getElementById('analyze-btn')?.click();
      }, 500);
    } catch (error) {
      console.error('Error deleting old lead:', error);
      toast.error('Erro ao remover lead antigo');
    }
  };

  const handleAnalyze = async () => {
    if (!profileUrl.trim()) {
      toast.error('Por favor, informe a URL do perfil');
      return;
    }
    setIsLoading(true);
    setReport(null);
    try {
      const result = await leadQualifierApi.analyze(profileUrl, businessProfile || undefined);
      if (result.success && result.report) {
        setReport(result.report);
        toast.success('Análise completa! 🎯');
        await saveLeadToCRM(result.report);
      } else {
        toast.error(result.error || 'Erro ao analisar perfil');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro inesperado ao analisar');
    } finally {
      setIsLoading(false);
    }
  };

  const saveLeadToCRM = async (reportData: LeadQualificationReport) => {
    if (!mentoradoId) return;
    try {
      const extractedData = reportData.extracted_data;
      const temperatureMap: Record<string, string> = {
        'pursue_hot': 'hot',
        'nurture': 'warm',
        'low_priority': 'cold',
        'not_fit': 'cold'
      };
      const temperature = temperatureMap[reportData.recommendation] || 'warm';
      
      // Resolve tenant_id inline if not yet cached
      let effectiveTenantId: string | null = resolvedTenantId;
      
      if (!effectiveTenantId) {
        const { data: membership } = await supabase
          .from('memberships')
          .select('tenant_id')
          .eq('id', mentoradoId)
          .maybeSingle();
        
        if (membership) {
          effectiveTenantId = membership.tenant_id;
          setResolvedTenantId(membership.tenant_id);
        }
      }
      
      console.log('[LeadQualifier] Save context:', {
        mentoradoId,
        effectiveTenantId,
        selectedLeadId: selectedLeadId || 'none'
      });
      
      // Final safety check: tenant_id is required for RLS
      if (!effectiveTenantId) {
        console.error('[LeadQualifier] Cannot save: tenant_id could not be resolved');
        toast.error('Erro: não foi possível resolver o tenant. Tente recarregar a página.');
        return;
      }
      
      // Check if URL is a valid profile URL to save
      const isValidProfileUrl = profileUrl.startsWith('http') && 
        (profileUrl.includes('instagram.com') || profileUrl.includes('linkedin.com'));
      
      // If a lead was selected, update that specific lead
      if (selectedLeadId) {
        const selectedLead = existingLeads.find(l => l.id === selectedLeadId);
        const { error: updateError } = await supabase
          .from('crm_prospections')
          .update({
            ai_insights: JSON.parse(JSON.stringify(reportData)),
            temperature,
            company: extractedData?.company || selectedLead?.company || null,
            notes: `Score: ${reportData.score}/100 - ${reportData.summary}`,
            profile_url: isValidProfileUrl ? profileUrl : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedLeadId);
        
        if (updateError) {
          console.error('Error updating lead:', updateError);
          toast.error('Erro ao salvar qualificação no lead');
          return;
        }
        toast.success(`Qualificação salva no lead "${selectedLead?.contact_name}"`);
      } else {
        // Check if lead already exists by profile_url (for requalification deduplication)
        if (isValidProfileUrl) {
          const { data: existingByUrl } = await supabase
            .from('crm_prospections')
            .select('id, contact_name')
            .or(`membership_id.eq.${mentoradoId},mentorado_id.eq.${mentoradoId}`)
            .eq('profile_url', profileUrl)
            .maybeSingle();
          
          if (existingByUrl) {
            await supabase
              .from('crm_prospections')
              .delete()
              .eq('id', existingByUrl.id);
            toast.info(`Lead anterior "${existingByUrl.contact_name}" substituído`);
          }
        }
        
        // Create new lead with correct IDs
        const leadName = extractedData?.name || 'Lead Qualificado';
        const { error: insertError } = await supabase
          .from('crm_prospections')
          .insert([{
            mentorado_id: mentoradoId,
            membership_id: mentoradoId,
            tenant_id: effectiveTenantId,
            contact_name: leadName,
            company: extractedData?.company || null,
            temperature,
            status: 'contacted',
            ai_insights: JSON.parse(JSON.stringify(reportData)),
            notes: `Score: ${reportData.score}/100 - ${reportData.summary}`,
            points: reportData.score >= 75 ? 3 : reportData.score >= 50 ? 2 : 1,
            profile_url: isValidProfileUrl ? profileUrl : null
          }]);
        
        if (insertError) {
          console.error('Error inserting lead:', insertError);
          toast.error(`Erro ao salvar lead no CRM: ${insertError.message}`);
          return;
        }
        
        toast.success(`Lead "${leadName}" criado e salvo no CRM ✅`);
      }
      
      await fetchQualificationHistory();
      await fetchExistingLeads();
    } catch (error) {
      console.error('Error saving lead to CRM:', error);
      toast.error('Erro inesperado ao salvar no CRM');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const exportToPDF = async () => {
    if (!report) return;
    setIsExporting(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [30, 30, 30]) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          if (y > pageHeight - 20) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, margin, y);
          y += fontSize * 0.4;
        });
        y += 2;
      };

      const addSection = (title: string) => {
        if (y > pageHeight - 40) {
          pdf.addPage();
          y = margin;
        }
        y += 5;
        pdf.setFillColor(147, 51, 234);
        pdf.rect(margin, y - 4, contentWidth, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin + 3, y + 1);
        y += 10;
        pdf.setTextColor(30, 30, 30);
      };

      // Header
      pdf.setFillColor(147, 51, 234);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RELATÓRIO DE QUALIFICAÇÃO DE LEAD', margin, 15);
      pdf.setFontSize(10);
      pdf.text(`Score: ${report.score}/100 | ${new Date().toLocaleDateString('pt-BR')}`, margin, 23);
      y = 40;

      // Overview
      addSection('📊 VISÃO GERAL');
      addText(`Nome: ${report.extracted_data?.name || 'N/A'}`, 11, true);
      addText(`Empresa: ${report.extracted_data?.company || 'N/A'}`);
      addText(`Indústria: ${report.extracted_data?.industry || 'N/A'}`);
      addText(`Localização: ${report.extracted_data?.location || 'N/A'}`);
      y += 3;
      addText(`RESUMO: ${report.summary}`, 10, false, [60, 60, 60]);
      if (report.recommendation_reasoning) {
        addText(`Recomendação: ${report.recommendation_reasoning}`, 10, false, [60, 60, 60]);
      }

      // Behavioral Profile
      addSection('🧠 PERFIL COMPORTAMENTAL');
      addText(`Estilo Primário: ${report.behavioral_profile?.primary_style?.toUpperCase() || 'N/A'}`, 11, true);
      if (report.behavioral_profile?.personality_summary) {
        addText(report.behavioral_profile.personality_summary);
      }
      addText(`Como se comunica: ${report.behavioral_profile?.communication_preference || 'N/A'}`);
      addText(`Como decide: ${report.behavioral_profile?.decision_making_style || 'N/A'}`);
      addText(`Como criar rapport: ${report.behavioral_profile?.how_to_build_rapport || 'N/A'}`);
      
      if (report.behavioral_profile?.what_motivates?.length) {
        y += 2;
        addText('O que MOTIVA:', 10, true, [34, 139, 34]);
        report.behavioral_profile.what_motivates.forEach(m => addText(`  • ${m}`));
      }
      if (report.behavioral_profile?.what_frustrates?.length) {
        y += 2;
        addText('O que FRUSTRA:', 10, true, [220, 20, 60]);
        report.behavioral_profile.what_frustrates.forEach(m => addText(`  • ${m}`));
      }

      // Lead Perspective
      addSection('🎯 PERSPECTIVA DO LEAD');
      if (report.lead_perspective?.likely_goals?.length) {
        addText('Objetivos Prováveis:', 10, true);
        report.lead_perspective.likely_goals.forEach(g => addText(`  • ${g}`));
      }
      if (report.lead_perspective?.current_challenges?.length) {
        addText('Desafios Atuais:', 10, true);
        report.lead_perspective.current_challenges.forEach(c => addText(`  • ${c}`));
      }
      if (report.lead_perspective?.fears_and_concerns?.length) {
        addText('Medos e Preocupações:', 10, true);
        report.lead_perspective.fears_and_concerns.forEach(f => addText(`  • ${f}`));
      }
      if (report.lead_perspective?.hidden_pains?.length) {
        addText('Dores Ocultas:', 10, true, [255, 140, 0]);
        report.lead_perspective.hidden_pains.forEach(p => addText(`  • ${p}`));
      }

      // Approach Strategy
      addSection('🎣 ESTRATÉGIA DE ABORDAGEM');
      addText(`HOOK DE ABERTURA:`, 10, true, [147, 51, 234]);
      addText(`"${report.approach_strategy?.opening_hook || 'N/A'}"`, 10, false, [60, 60, 60]);
      if (report.approach_strategy?.second_message) {
        addText(`Segunda Mensagem: "${report.approach_strategy.second_message}"`);
      }
      if (report.approach_strategy?.follow_up_if_silent) {
        addText(`Follow-up: "${report.approach_strategy.follow_up_if_silent}"`);
      }
      addText(`Melhor Canal: ${report.approach_strategy?.best_channel || 'N/A'}`);
      addText(`Melhor Horário: ${report.approach_strategy?.best_time_to_contact || 'N/A'}`);
      
      if (report.approach_strategy?.conversation_flow?.length) {
        y += 2;
        addText('Fluxo da Conversa:', 10, true);
        report.approach_strategy.conversation_flow.forEach((step, i) => addText(`  ${i + 1}. ${step}`));
      }

      // Objections - COMPLETE LIST
      addSection('🛡️ QUEBRA DE OBJEÇÕES COMPLETA');
      if (report.expected_objections?.length) {
        report.expected_objections.forEach((obj, i) => {
          y += 2;
          addText(`${i + 1}. "${obj.objection}"`, 10, true, obj.likelihood === 'alta' ? [220, 20, 60] : [30, 30, 30]);
          addText(`   Probabilidade: ${obj.likelihood?.toUpperCase() || 'N/A'}${obj.objection_type ? ` | Tipo: ${obj.objection_type}` : ''}`);
          if (obj.real_meaning) addText(`   Significado real: ${obj.real_meaning}`);
          addText(`   Estratégia: ${obj.response_strategy}`);
          addText(`   Script: "${obj.script_example}"`);
          if (obj.follow_up_question) addText(`   Pergunta follow-up: "${obj.follow_up_question}"`);
        });
      }

      // Value Anchoring
      addSection('💎 ANCORAGEM DE VALOR');
      addText(`Dor para Destacar: ${report.value_anchoring?.pain_to_highlight || 'N/A'}`, 10, true);
      addText(`Resultado para Prometer: ${report.value_anchoring?.result_to_promise || 'N/A'}`);
      addText(`Prova Social: ${report.value_anchoring?.social_proof_angle || 'N/A'}`);
      addText(`Justificativa de Preço: ${report.value_anchoring?.price_justification || 'N/A'}`);
      addText(`Argumento ROI: ${report.value_anchoring?.roi_argument || 'N/A'}`);
      if (report.value_anchoring?.urgency_angle) addText(`Urgência: ${report.value_anchoring.urgency_angle}`);
      if (report.value_anchoring?.scarcity_angle) addText(`Escassez: ${report.value_anchoring.scarcity_angle}`);

      // Negotiation Tactics
      if (report.negotiation_tactics) {
        addSection('🤝 TÁTICAS DE NEGOCIAÇÃO');
        if (report.negotiation_tactics.recommended_approach) addText(`Abordagem: ${report.negotiation_tactics.recommended_approach}`);
        if (report.negotiation_tactics.price_presentation) addText(`Apresentar Preço: ${report.negotiation_tactics.price_presentation}`);
        if (report.negotiation_tactics.discount_strategy) addText(`Estratégia de Desconto: ${report.negotiation_tactics.discount_strategy}`);
        if (report.negotiation_tactics.bonus_to_offer) addText(`Bônus: ${report.negotiation_tactics.bonus_to_offer}`);
        if (report.negotiation_tactics.competitor_comparison) addText(`Vs Concorrente: ${report.negotiation_tactics.competitor_comparison}`);
      }

      // Closing Scripts
      if (report.closing_scripts) {
        addSection('🎯 SCRIPTS DE FECHAMENTO');
        if (report.closing_scripts.soft_close) {
          addText('Fechamento Suave:', 10, true);
          addText(`"${report.closing_scripts.soft_close}"`);
        }
        if (report.closing_scripts.assumptive_close) {
          addText('Fechamento Assumido:', 10, true);
          addText(`"${report.closing_scripts.assumptive_close}"`);
        }
        if (report.closing_scripts.urgency_close) {
          addText('Fechamento com Urgência:', 10, true);
          addText(`"${report.closing_scripts.urgency_close}"`);
        }
        if (report.closing_scripts.summary_close) {
          addText('Fechamento com Resumo:', 10, true);
          addText(`"${report.closing_scripts.summary_close}"`);
        }
      }

      // Personalized Scripts
      if (report.personalized_scripts) {
        addSection('📝 SCRIPTS PERSONALIZADOS');
        if (report.personalized_scripts.dm_opener) {
          addText('DM Instagram:', 10, true);
          addText(`"${report.personalized_scripts.dm_opener}"`);
        }
        if (report.personalized_scripts.linkedin_connection) {
          addText('LinkedIn:', 10, true);
          addText(`"${report.personalized_scripts.linkedin_connection}"`);
        }
        if (report.personalized_scripts.whatsapp_intro) {
          addText('WhatsApp:', 10, true);
          addText(`"${report.personalized_scripts.whatsapp_intro}"`);
        }
        if (report.personalized_scripts.email_subject) {
          addText('Email Assunto:', 10, true);
          addText(`"${report.personalized_scripts.email_subject}"`);
        }
        if (report.personalized_scripts.email_body) {
          addText('Email Corpo:', 10, true);
          addText(report.personalized_scripts.email_body);
        }
      }

      // What to Avoid
      addSection('🚫 O QUE EVITAR');
      if (report.what_pushes_away?.behaviors_to_avoid?.length) {
        addText('Comportamentos:', 10, true);
        report.what_pushes_away.behaviors_to_avoid.forEach(b => addText(`  ✗ ${b}`));
      }
      if (report.what_pushes_away?.words_to_avoid?.length) {
        addText('Palavras/Frases:', 10, true);
        addText(`  ${report.what_pushes_away.words_to_avoid.join(' | ')}`);
      }
      if (report.what_pushes_away?.tone_to_avoid) {
        addText(`Tom a evitar: ${report.what_pushes_away.tone_to_avoid}`);
      }

      // Risk Assessment
      if (report.risk_assessment) {
        addSection('⚖️ AVALIAÇÃO DE RISCO');
        if (report.risk_assessment.deal_probability) addText(`Probabilidade de Fechar: ${report.risk_assessment.deal_probability}`);
        if (report.risk_assessment.main_risk) addText(`Risco Principal: ${report.risk_assessment.main_risk}`);
        if (report.risk_assessment.mitigation_strategy) addText(`Mitigação: ${report.risk_assessment.mitigation_strategy}`);
        if (report.risk_assessment.timeline_estimate) addText(`Timeline: ${report.risk_assessment.timeline_estimate}`);
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Gerado por Lead Qualifier AI • Confidencial', margin, pageHeight - 5);

      const fileName = `qualificacao_${report.extracted_data?.name?.replace(/\s+/g, '_') || 'lead'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-rose-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 50) return 'bg-amber-500/20 border-amber-500/30';
    if (score >= 25) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-rose-500/20 border-rose-500/30';
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
      dominante: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      influente: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      estavel: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      analitico: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    };
    return colors[style] || 'bg-muted text-foreground';
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text, id)} className="h-7 w-7 p-0">
      {copiedField === id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Qualificador de Leads
            <Badge variant="secondary" className="ml-2 text-xs">GPT 5.2</Badge>
          </CardTitle>
          <CardDescription>
            Super análise completa com IA avançada • Score, comportamento, objeções, scripts e muito mais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lead Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Selecionar Lead Existente
            </label>
            <Select value={selectedLeadId} onValueChange={handleSelectLead}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha um lead do CRM para qualificar..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingLeads ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Carregando leads...</span>
                  </div>
                ) : existingLeads.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum lead cadastrado
                  </div>
                ) : (
                  existingLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lead.contact_name}</span>
                        {lead.company && (
                          <span className="text-muted-foreground">• {lead.company}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou insira URL/dados manualmente</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="URL do perfil ou informações do lead (nome, empresa, etc.)"
              value={profileUrl}
              onChange={(e) => {
                setProfileUrl(e.target.value);
                setSelectedLeadId(''); // Clear selection when typing manually
              }}
              className="flex-1"
            />
            <Button id="analyze-btn" onClick={handleAnalyze} disabled={isLoading} className="min-w-[140px]">
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
          {!businessProfile && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configure seu perfil de negócio em "Meu CRM" para análises mais personalizadas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card ref={reportRef}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Relatório Completo
              </CardTitle>
              <Button onClick={exportToPDF} disabled={isExporting} variant="outline" size="sm">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Tabs defaultValue="overview" className="w-full">
              <ScrollArea className="w-full">
                <TabsList className="inline-flex h-auto p-1 gap-1 bg-muted/50 w-max min-w-full">
                  <TabsTrigger value="overview" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <TrendingUp className="h-3 w-3 mr-1" />Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="behavioral" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Brain className="h-3 w-3 mr-1" />Comportamento
                  </TabsTrigger>
                  <TabsTrigger value="approach" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Crosshair className="h-3 w-3 mr-1" />Abordagem
                  </TabsTrigger>
                  <TabsTrigger value="objections" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Shield className="h-3 w-3 mr-1" />Objeções
                  </TabsTrigger>
                  <TabsTrigger value="value" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <DollarSign className="h-3 w-3 mr-1" />Valor
                  </TabsTrigger>
                  <TabsTrigger value="negotiation" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Handshake className="h-3 w-3 mr-1" />Negociação
                  </TabsTrigger>
                  <TabsTrigger value="scripts" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <MessageCircle className="h-3 w-3 mr-1" />Scripts
                  </TabsTrigger>
                  <TabsTrigger value="avoid" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Ban className="h-3 w-3 mr-1" />Evitar
                  </TabsTrigger>
                  <TabsTrigger value="risk" className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Scale className="h-3 w-3 mr-1" />Risco
                  </TabsTrigger>
                </TabsList>
              </ScrollArea>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className={`border ${getScoreBg(report.score)}`}>
                    <CardContent className="pt-6 text-center">
                      <div className={`text-6xl font-bold ${getScoreColor(report.score)}`}>
                        {report.score}
                      </div>
                      <p className="text-foreground/70 mt-2">Score de Qualificação</p>
                      <div className="mt-4">
                        {(() => {
                          const badge = getRecommendationBadge(report.recommendation);
                          return <Badge variant={badge.variant} className="text-sm px-3 py-1">{badge.label}</Badge>;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <h4 className="font-semibold text-foreground">Breakdown do Score</h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Fit com Oferta', value: report.score_breakdown?.fit_with_offer || 0 },
                          { label: 'Sinais de Compra', value: report.score_breakdown?.buying_signals || 0 },
                          { label: 'Engajamento', value: report.score_breakdown?.engagement_level || 0 },
                          { label: 'Capacidade Financeira', value: report.score_breakdown?.financial_capacity || 0 },
                        ].map((item, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-sm text-foreground mb-1">
                              <span>{item.label}</span>
                              <span className="font-medium">{item.value}/25</span>
                            </div>
                            <Progress value={(item.value / 25) * 100} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2 text-foreground">📋 Resumo Executivo</h4>
                    <p className="text-foreground/80">{report.summary}</p>
                    {report.recommendation_reasoning && (
                      <p className="text-foreground/70 mt-2 text-sm italic">{report.recommendation_reasoning}</p>
                    )}
                  </CardContent>
                </Card>
                {report.extracted_data && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Dados do Perfil
                      </h4>
                      <div className="grid gap-2 text-sm">
                        {[
                          { label: 'Nome', value: report.extracted_data.name },
                          { label: 'Headline', value: report.extracted_data.headline },
                          { label: 'Empresa', value: report.extracted_data.company },
                          { label: 'Indústria', value: report.extracted_data.industry },
                          { label: 'Localização', value: report.extracted_data.location },
                          { label: 'Seguidores', value: report.extracted_data.followers },
                        ].filter(item => item.value).map((item, i) => (
                          <div key={i} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                            <span className="text-foreground/60">{item.label}:</span>
                            <span className="text-foreground font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* BEHAVIORAL TAB */}
              <TabsContent value="behavioral" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <h4 className="font-semibold text-foreground">Perfil Comportamental</h4>
                      <Badge className={getStyleColor(report.behavioral_profile?.primary_style || '')}>
                        {report.behavioral_profile?.primary_style?.toUpperCase()}
                      </Badge>
                      {report.behavioral_profile?.secondary_style && (
                        <Badge variant="outline">{report.behavioral_profile.secondary_style}</Badge>
                      )}
                    </div>
                    {report.behavioral_profile?.personality_summary && (
                      <p className="text-foreground/80 mb-4 p-3 bg-muted/30 rounded-lg">{report.behavioral_profile.personality_summary}</p>
                    )}
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-foreground/60 mb-1">💬 Como se Comunica</h5>
                        <p className="text-foreground">{report.behavioral_profile?.communication_preference}</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-foreground/60 mb-1">🧠 Como Toma Decisões</h5>
                        <p className="text-foreground">{report.behavioral_profile?.decision_making_style}</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-foreground/60 mb-1">🤝 Como Criar Rapport</h5>
                        <p className="text-foreground">{report.behavioral_profile?.how_to_build_rapport}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-emerald-500/20">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-emerald-400">✅ O que Motiva</h4>
                      <ul className="space-y-2">
                        {report.behavioral_profile?.what_motivates?.map((item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-foreground">
                            <span className="text-emerald-400 mt-0.5">•</span>{item}
                          </li>
                        ))}
                      </ul>
                      {report.behavioral_profile?.buying_triggers?.length > 0 && (
                        <>
                          <Separator className="my-4" />
                          <h5 className="font-medium mb-2 text-emerald-400 text-sm">⚡ Gatilhos de Compra</h5>
                          <ul className="space-y-1">
                            {report.behavioral_profile.buying_triggers.map((item, i) => (
                              <li key={i} className="text-sm text-foreground">• {item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-rose-500/20">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-rose-400">❌ O que Frustra</h4>
                      <ul className="space-y-2">
                        {report.behavioral_profile?.what_frustrates?.map((item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-foreground">
                            <span className="text-rose-400 mt-0.5">•</span>{item}
                          </li>
                        ))}
                      </ul>
                      {report.behavioral_profile?.red_flags_for_them?.length > 0 && (
                        <>
                          <Separator className="my-4" />
                          <h5 className="font-medium mb-2 text-rose-400 text-sm">🚩 Red Flags para Eles</h5>
                          <ul className="space-y-1">
                            {report.behavioral_profile.red_flags_for_them.map((item, i) => (
                              <li key={i} className="text-sm text-foreground">• {item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4 text-foreground">🎯 Perspectiva do Lead</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h5 className="text-sm font-medium text-foreground/60 mb-2">Objetivos Prováveis</h5>
                        <ul className="space-y-1 text-sm text-foreground">
                          {report.lead_perspective?.likely_goals?.map((item, i) => <li key={i}>• {item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-foreground/60 mb-2">Desafios Atuais</h5>
                        <ul className="space-y-1 text-sm text-foreground">
                          {report.lead_perspective?.current_challenges?.map((item, i) => <li key={i}>• {item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-foreground/60 mb-2">Medos e Preocupações</h5>
                        <ul className="space-y-1 text-sm text-foreground">
                          {report.lead_perspective?.fears_and_concerns?.map((item, i) => <li key={i}>• {item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-foreground/60 mb-2">Desejos e Aspirações</h5>
                        <ul className="space-y-1 text-sm text-foreground">
                          {report.lead_perspective?.desires_and_aspirations?.map((item, i) => <li key={i}>• {item}</li>)}
                        </ul>
                      </div>
                      {report.lead_perspective?.hidden_pains?.length > 0 && (
                        <div className="md:col-span-2">
                          <h5 className="text-sm font-medium text-amber-400 mb-2">🔍 Dores Ocultas</h5>
                          <ul className="space-y-1 text-sm text-foreground">
                            {report.lead_perspective.hidden_pains.map((item, i) => <li key={i}>• {item}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* APPROACH TAB */}
              <TabsContent value="approach" className="space-y-4 mt-4">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-foreground">🎣 Hook de Abertura</h4>
                      <CopyButton text={report.approach_strategy?.opening_hook || ''} id="hook" />
                    </div>
                    <p className="text-lg text-foreground font-medium">{report.approach_strategy?.opening_hook}</p>
                  </CardContent>
                </Card>
                {report.approach_strategy?.second_message && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">💬 Segunda Mensagem (se responder)</h4>
                        <CopyButton text={report.approach_strategy.second_message} id="second" />
                      </div>
                      <p className="text-foreground/90">{report.approach_strategy.second_message}</p>
                    </CardContent>
                  </Card>
                )}
                {report.approach_strategy?.follow_up_if_silent && (
                  <Card className="border-amber-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-amber-400">⏰ Follow-up (se não responder)</h4>
                        <CopyButton text={report.approach_strategy.follow_up_if_silent} id="followup" />
                      </div>
                      <p className="text-foreground/90">{report.approach_strategy.follow_up_if_silent}</p>
                    </CardContent>
                  </Card>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-foreground">📍 Melhor Canal</h4>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {report.approach_strategy?.best_channel === 'dm_instagram' && '📱 Instagram DM'}
                        {report.approach_strategy?.best_channel === 'linkedin' && '💼 LinkedIn'}
                        {report.approach_strategy?.best_channel === 'whatsapp' && '📲 WhatsApp'}
                        {report.approach_strategy?.best_channel === 'email' && '📧 Email'}
                      </Badge>
                      <p className="text-sm text-foreground/70 mt-2">{report.approach_strategy?.best_time_to_contact}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-emerald-400">✅ Pontos para Tocar</h4>
                      <ul className="space-y-2">
                        {report.approach_strategy?.key_points_to_touch?.map((item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-foreground">
                            <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0" />{item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                {report.approach_strategy?.conversation_flow?.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-foreground">📊 Fluxo da Conversa</h4>
                      <div className="space-y-2">
                        {report.approach_strategy.conversation_flow.map((step, i) => (
                          <div key={i} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-bold shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-sm text-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* OBJECTIONS TAB */}
              <TabsContent value="objections" className="space-y-4 mt-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-foreground">
                    {report.expected_objections?.length || 0} objeções mapeadas com scripts prontos para usar
                  </AlertDescription>
                </Alert>
                <div className="space-y-4">
                  {report.expected_objections?.map((obj, i) => (
                    <Card key={i} className={obj.likelihood === 'alta' ? 'border-rose-500/30' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold flex items-center gap-2 text-foreground">
                            <Shield className="h-4 w-4 text-primary" />
                            "{obj.objection}"
                          </h4>
                          <div className="flex items-center gap-2">
                            {obj.objection_type && <Badge variant="outline" className="text-xs">{obj.objection_type}</Badge>}
                            <Badge variant={obj.likelihood === 'alta' ? 'destructive' : obj.likelihood === 'media' ? 'secondary' : 'outline'}>
                              {obj.likelihood === 'alta' ? '🔴 Alta' : obj.likelihood === 'media' ? '🟡 Média' : '🟢 Baixa'}
                            </Badge>
                          </div>
                        </div>
                        {obj.real_meaning && (
                          <div className="mb-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <p className="text-sm text-foreground/80">
                              <span className="font-medium text-amber-400">💡 Significado real: </span>
                              {obj.real_meaning}
                            </p>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-sm font-medium text-foreground/60 mb-1">Estratégia de Resposta</h5>
                            <p className="text-sm text-foreground">{obj.response_strategy}</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-sm font-medium text-foreground">💬 Script de Resposta</h5>
                              <CopyButton text={obj.script_example} id={`script-${i}`} />
                            </div>
                            <p className="text-sm italic text-foreground/90">"{obj.script_example}"</p>
                          </div>
                          {obj.follow_up_question && (
                            <div className="p-2 bg-primary/5 rounded-lg">
                              <p className="text-sm text-foreground/80">
                                <span className="font-medium text-primary">Pergunta follow-up: </span>
                                "{obj.follow_up_question}"
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* VALUE TAB */}
              <TabsContent value="value" className="space-y-4 mt-4">
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
                      Ancoragem de Valor
                    </h4>
                    <div className="space-y-4">
                      <div className="p-3 bg-background rounded-lg border">
                        <h5 className="text-sm font-medium text-foreground/60 mb-1">🎯 Dor Principal para Destacar</h5>
                        <p className="font-medium text-foreground">{report.value_anchoring?.pain_to_highlight}</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <h5 className="text-sm font-medium text-foreground/60 mb-1">✨ Resultado para Prometer</h5>
                        <p className="font-medium text-foreground">{report.value_anchoring?.result_to_promise}</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-foreground/60 mb-1">👥 Ângulo de Prova Social</h5>
                        <p className="text-foreground">{report.value_anchoring?.social_proof_angle}</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <h5 className="text-sm font-medium text-foreground/60 mb-1">💰 Como Justificar o Preço</h5>
                        <p className="text-sm text-foreground">{report.value_anchoring?.price_justification}</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <h5 className="text-sm font-medium text-foreground/60 mb-1">📈 Argumento de ROI</h5>
                        <p className="text-sm text-foreground">{report.value_anchoring?.roi_argument}</p>
                      </div>
                      {report.value_anchoring?.urgency_angle && (
                        <div>
                          <h5 className="text-sm font-medium text-amber-400 mb-1">⏰ Urgência</h5>
                          <p className="text-foreground">{report.value_anchoring.urgency_angle}</p>
                        </div>
                      )}
                      {report.value_anchoring?.scarcity_angle && (
                        <div>
                          <h5 className="text-sm font-medium text-rose-400 mb-1">🔥 Escassez</h5>
                          <p className="text-foreground">{report.value_anchoring.scarcity_angle}</p>
                        </div>
                      )}
                      {report.value_anchoring?.authority_angle && (
                        <div>
                          <h5 className="text-sm font-medium text-sky-400 mb-1">👑 Autoridade</h5>
                          <p className="text-foreground">{report.value_anchoring.authority_angle}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {report.mental_triggers && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-400" />
                        Gatilhos Mentais Recomendados
                      </h4>
                      {report.mental_triggers.primary_triggers?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {report.mental_triggers.primary_triggers.map((trigger, i) => (
                            <Badge key={i} variant="secondary">{trigger}</Badge>
                          ))}
                        </div>
                      )}
                      {report.mental_triggers.how_to_apply_each && Object.entries(report.mental_triggers.how_to_apply_each).length > 0 && (
                        <div className="space-y-2">
                          {Object.entries(report.mental_triggers.how_to_apply_each).map(([trigger, how], i) => (
                            <div key={i} className="p-2 bg-muted/30 rounded-lg">
                              <span className="font-medium text-primary">{trigger}:</span>
                              <span className="text-foreground ml-2">{how}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* NEGOTIATION TAB */}
              <TabsContent value="negotiation" className="space-y-4 mt-4">
                {report.negotiation_tactics ? (
                  <>
                    <Card>
                      <CardContent className="pt-6">
                        <h4 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                          <Handshake className="h-5 w-5 text-primary" />
                          Táticas de Negociação
                        </h4>
                        <div className="space-y-4">
                          {report.negotiation_tactics.recommended_approach && (
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                              <h5 className="text-sm font-medium text-primary mb-1">Abordagem Recomendada</h5>
                              <p className="text-foreground">{report.negotiation_tactics.recommended_approach}</p>
                            </div>
                          )}
                          {report.negotiation_tactics.price_presentation && (
                            <div>
                              <h5 className="text-sm font-medium text-foreground/60 mb-1">💰 Como Apresentar o Preço</h5>
                              <p className="text-foreground">{report.negotiation_tactics.price_presentation}</p>
                            </div>
                          )}
                          {report.negotiation_tactics.discount_strategy && (
                            <div>
                              <h5 className="text-sm font-medium text-foreground/60 mb-1">🏷️ Estratégia de Desconto</h5>
                              <p className="text-foreground">{report.negotiation_tactics.discount_strategy}</p>
                            </div>
                          )}
                          {report.negotiation_tactics.payment_flexibility && (
                            <div>
                              <h5 className="text-sm font-medium text-foreground/60 mb-1">💳 Flexibilidade de Pagamento</h5>
                              <p className="text-foreground">{report.negotiation_tactics.payment_flexibility}</p>
                            </div>
                          )}
                          {report.negotiation_tactics.bonus_to_offer && (
                            <div>
                              <h5 className="text-sm font-medium text-emerald-400 mb-1">🎁 Bônus para Oferecer</h5>
                              <p className="text-foreground">{report.negotiation_tactics.bonus_to_offer}</p>
                            </div>
                          )}
                          {report.negotiation_tactics.deadline_creation && (
                            <div>
                              <h5 className="text-sm font-medium text-foreground/60 mb-1">⏰ Criação de Prazo</h5>
                              <p className="text-foreground">{report.negotiation_tactics.deadline_creation}</p>
                            </div>
                          )}
                          {report.negotiation_tactics.competitor_comparison && (
                            <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                              <h5 className="text-sm font-medium text-amber-400 mb-1">⚔️ Se Mencionar Concorrente</h5>
                              <p className="text-foreground">{report.negotiation_tactics.competitor_comparison}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    {report.closing_scripts && (
                      <Card>
                        <CardContent className="pt-6">
                          <h4 className="font-semibold mb-4 text-foreground">🎯 Scripts de Fechamento</h4>
                          <div className="space-y-4">
                            {report.closing_scripts.soft_close && (
                              <div className="p-3 bg-muted/30 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-sm font-medium text-foreground">Fechamento Suave</h5>
                                  <CopyButton text={report.closing_scripts.soft_close} id="soft-close" />
                                </div>
                                <p className="text-sm italic text-foreground/90">"{report.closing_scripts.soft_close}"</p>
                              </div>
                            )}
                            {report.closing_scripts.assumptive_close && (
                              <div className="p-3 bg-muted/30 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-sm font-medium text-foreground">Fechamento Assumido</h5>
                                  <CopyButton text={report.closing_scripts.assumptive_close} id="assumptive-close" />
                                </div>
                                <p className="text-sm italic text-foreground/90">"{report.closing_scripts.assumptive_close}"</p>
                              </div>
                            )}
                            {report.closing_scripts.alternative_close && (
                              <div className="p-3 bg-muted/30 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-sm font-medium text-foreground">Fechamento Alternativo</h5>
                                  <CopyButton text={report.closing_scripts.alternative_close} id="alternative-close" />
                                </div>
                                <p className="text-sm italic text-foreground/90">"{report.closing_scripts.alternative_close}"</p>
                              </div>
                            )}
                            {report.closing_scripts.urgency_close && (
                              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-sm font-medium text-amber-400">Fechamento com Urgência</h5>
                                  <CopyButton text={report.closing_scripts.urgency_close} id="urgency-close" />
                                </div>
                                <p className="text-sm italic text-foreground/90">"{report.closing_scripts.urgency_close}"</p>
                              </div>
                            )}
                            {report.closing_scripts.summary_close && (
                              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-sm font-medium text-primary">Fechamento com Resumo</h5>
                                  <CopyButton text={report.closing_scripts.summary_close} id="summary-close" />
                                </div>
                                <p className="text-sm italic text-foreground/90">"{report.closing_scripts.summary_close}"</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-foreground/60">
                      <Handshake className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Táticas de negociação não disponíveis nesta análise.</p>
                      <p className="text-sm mt-1">Refaça a análise para obter dados completos.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* SCRIPTS TAB */}
              <TabsContent value="scripts" className="space-y-4 mt-4">
                {report.personalized_scripts ? (
                  <div className="space-y-4">
                    {report.personalized_scripts.dm_opener && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                              📱 DM Instagram
                            </h4>
                            <CopyButton text={report.personalized_scripts.dm_opener} id="dm-opener" />
                          </div>
                          <p className="p-3 bg-muted/30 rounded-lg text-foreground">{report.personalized_scripts.dm_opener}</p>
                        </CardContent>
                      </Card>
                    )}
                    {report.personalized_scripts.linkedin_connection && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                              💼 LinkedIn
                            </h4>
                            <CopyButton text={report.personalized_scripts.linkedin_connection} id="linkedin-msg" />
                          </div>
                          <p className="p-3 bg-muted/30 rounded-lg text-foreground">{report.personalized_scripts.linkedin_connection}</p>
                        </CardContent>
                      </Card>
                    )}
                    {report.personalized_scripts.whatsapp_intro && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                              📲 WhatsApp
                            </h4>
                            <CopyButton text={report.personalized_scripts.whatsapp_intro} id="whatsapp-msg" />
                          </div>
                          <p className="p-3 bg-muted/30 rounded-lg text-foreground">{report.personalized_scripts.whatsapp_intro}</p>
                        </CardContent>
                      </Card>
                    )}
                    {(report.personalized_scripts.email_subject || report.personalized_scripts.email_body) && (
                      <Card>
                        <CardContent className="pt-6">
                          <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                            📧 Email
                          </h4>
                          {report.personalized_scripts.email_subject && (
                            <div className="mb-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-foreground/60">Assunto:</span>
                                <CopyButton text={report.personalized_scripts.email_subject} id="email-subject" />
                              </div>
                              <p className="p-2 bg-muted/30 rounded font-medium text-foreground">{report.personalized_scripts.email_subject}</p>
                            </div>
                          )}
                          {report.personalized_scripts.email_body && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-foreground/60">Corpo:</span>
                                <CopyButton text={report.personalized_scripts.email_body} id="email-body" />
                              </div>
                              <p className="p-3 bg-muted/30 rounded-lg whitespace-pre-wrap text-foreground">{report.personalized_scripts.email_body}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-foreground/60">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Scripts personalizados não disponíveis nesta análise.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* AVOID TAB */}
              <TabsContent value="avoid" className="space-y-4 mt-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cuidado! Esses comportamentos podem afastar este lead e prejudicar a venda.
                  </AlertDescription>
                </Alert>
                <Card className="border-rose-500/20">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 text-rose-400">🚫 Comportamentos a Evitar</h4>
                    <ul className="space-y-2">
                      {report.what_pushes_away?.behaviors_to_avoid?.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 text-foreground">
                          <span className="text-rose-400 mt-0.5">✗</span>{item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="border-amber-500/20">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 text-amber-400">🔇 Palavras/Frases a Evitar</h4>
                    <div className="flex flex-wrap gap-2">
                      {report.what_pushes_away?.words_to_avoid?.map((item, i) => (
                        <Badge key={i} variant="outline" className="border-amber-500/30 text-foreground">{item}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 text-foreground">⚠️ Abordagens que Falham</h4>
                    <ul className="space-y-2">
                      {report.what_pushes_away?.approaches_that_fail?.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 text-foreground">
                          <span className="text-amber-400 mt-0.5">⚠</span>{item}
                        </li>
                      ))}
                    </ul>
                    {report.what_pushes_away?.tone_to_avoid && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium text-foreground/60">Tom a evitar: </span>
                        <span className="text-foreground">{report.what_pushes_away.tone_to_avoid}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* RISK TAB */}
              <TabsContent value="risk" className="space-y-4 mt-4">
                {report.risk_assessment ? (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        Avaliação de Risco
                      </h4>
                      <div className="space-y-4">
                        {report.risk_assessment.deal_probability && (
                          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-center">
                            <p className="text-sm text-foreground/60 mb-1">Probabilidade de Fechar</p>
                            <p className="text-3xl font-bold text-primary">{report.risk_assessment.deal_probability}</p>
                          </div>
                        )}
                        {report.risk_assessment.main_risk && (
                          <div className="p-3 bg-rose-500/5 rounded-lg border border-rose-500/20">
                            <h5 className="text-sm font-medium text-rose-400 mb-1">⚠️ Risco Principal</h5>
                            <p className="text-foreground">{report.risk_assessment.main_risk}</p>
                          </div>
                        )}
                        {report.risk_assessment.mitigation_strategy && (
                          <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                            <h5 className="text-sm font-medium text-emerald-400 mb-1">🛡️ Estratégia de Mitigação</h5>
                            <p className="text-foreground">{report.risk_assessment.mitigation_strategy}</p>
                          </div>
                        )}
                        {report.risk_assessment.timeline_estimate && (
                          <div>
                            <h5 className="text-sm font-medium text-foreground/60 mb-1">⏱️ Timeline Estimado</h5>
                            <p className="text-foreground">{report.risk_assessment.timeline_estimate}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-foreground/60">
                      <Scale className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Avaliação de risco não disponível nesta análise.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Histórico de Qualificações
          </CardTitle>
          <CardDescription>Últimas análises realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : qualificationHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhuma qualificação realizada ainda.</p>
            </div>
          ) : (
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-2">
                {qualificationHistory.map((item) => {
                  const insights = item.ai_insights as LeadQualificationReport;
                  const score = insights?.score || 0;
                  const hasUrl = !!item.profile_url;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => loadHistoryReport(item)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getScoreBg(score)} ${getScoreColor(score)}`}>
                          {score}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.contact_name}</p>
                          <p className="text-xs text-foreground/60">
                            {item.company && `${item.company} • `}
                            {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: ptBR })}
                            {hasUrl && <span className="text-primary ml-1">• Link salvo</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => loadHistoryReport(item)}
                          title="Ver relatório"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {hasUrl && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              requalifyLead(item);
                            }}
                            title="Requalificar lead"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
