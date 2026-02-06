import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadQualificationReport, BusinessProfile } from '@/lib/api/firecrawl';

export interface EnrichedLead {
  id: string;
  contact_name: string;
  company: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  temperature: string | null;
  status: string | null;
  notes: string | null;
  ai_insights: LeadQualificationReport | null;
  hasQualification: boolean;
  updated_at: string | null;
}

export function useLeadsWithQualification(mentoradoId: string | null) {
  const [leads, setLeads] = useState<EnrichedLead[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!mentoradoId) return;
      setIsLoading(true);
      
      try {
        // Resolve legacy mentorado_id from membership
        let legacyMentoradoId = mentoradoId;
        const { data: membership } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('id', mentoradoId)
          .maybeSingle();
        
        if (membership?.user_id) {
          const { data: mentorado } = await supabase
            .from('mentorados')
            .select('id')
            .eq('user_id', membership.user_id)
            .maybeSingle();
          if (mentorado) legacyMentoradoId = mentorado.id;
        }

        const [profileRes, leadsRes] = await Promise.all([
          supabase
            .from('mentorado_business_profiles')
            .select('*')
            .eq('mentorado_id', legacyMentoradoId)
            .maybeSingle(),
          supabase
            .from('crm_prospections')
            .select('id, contact_name, company, contact_email, contact_phone, temperature, status, notes, ai_insights, updated_at')
            .or(`mentorado_id.eq.${legacyMentoradoId},membership_id.eq.${mentoradoId}`)
            .order('updated_at', { ascending: false })
            .limit(50)
        ]);
        
        if (profileRes.data) setBusinessProfile(profileRes.data);
        if (leadsRes.data) {
          const enrichedLeads: EnrichedLead[] = leadsRes.data.map(lead => ({
            ...lead,
            ai_insights: lead.ai_insights as unknown as LeadQualificationReport | null,
            hasQualification: !!(lead.ai_insights && (lead.ai_insights as Record<string, unknown>)?.behavioral_profile)
          }));
          setLeads(enrichedLeads);
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [mentoradoId]);

  return { leads, businessProfile, isLoading, refetch: () => {} };
}

// Utility to build rich context from qualification data
export function buildQualificationContext(lead: EnrichedLead): string {
  const parts: string[] = [];
  
  parts.push(`Nome: ${lead.contact_name}`);
  if (lead.company) parts.push(`Empresa: ${lead.company}`);
  
  if (lead.temperature) {
    const tempMap: Record<string, string> = { hot: 'Quente 🔥', warm: 'Morno ☀️', cold: 'Frio ❄️' };
    parts.push(`Temperatura: ${tempMap[lead.temperature] || lead.temperature}`);
  }

  const insights = lead.ai_insights;
  if (!insights) {
    if (lead.notes) parts.push(`Notas: ${lead.notes}`);
    return parts.join('\n');
  }

  // Score and summary
  if (insights.score) parts.push(`Score: ${insights.score}/100`);
  if (insights.summary) parts.push(`Resumo: ${insights.summary}`);

  // Extracted data
  const extracted = insights.extracted_data;
  if (extracted) {
    if (extracted.headline) parts.push(`Headline: ${extracted.headline}`);
    if (extracted.industry) parts.push(`Indústria: ${extracted.industry}`);
    if (extracted.content_topics?.length) {
      parts.push(`Tópicos: ${extracted.content_topics.slice(0, 3).join(', ')}`);
    }
  }

  // Behavioral profile
  const behavior = insights.behavioral_profile;
  if (behavior) {
    parts.push(`\n--- PERFIL COMPORTAMENTAL ---`);
    parts.push(`Estilo DISC: ${behavior.primary_style?.toUpperCase() || 'N/A'}`);
    if (behavior.personality_summary) parts.push(`Personalidade: ${behavior.personality_summary}`);
    if (behavior.communication_preference) parts.push(`Preferência de comunicação: ${behavior.communication_preference}`);
    if (behavior.decision_making_style) parts.push(`Tomada de decisão: ${behavior.decision_making_style}`);
    if (behavior.what_motivates?.length) {
      parts.push(`Motivadores: ${behavior.what_motivates.slice(0, 3).join(', ')}`);
    }
    if (behavior.what_frustrates?.length) {
      parts.push(`Frustrações: ${behavior.what_frustrates.slice(0, 3).join(', ')}`);
    }
    if (behavior.buying_triggers?.length) {
      parts.push(`Gatilhos de compra: ${behavior.buying_triggers.slice(0, 3).join(', ')}`);
    }
  }

  // Lead perspective
  const perspective = insights.lead_perspective;
  if (perspective) {
    parts.push(`\n--- PERSPECTIVA DO LEAD ---`);
    if (perspective.likely_goals?.length) {
      parts.push(`Objetivos: ${perspective.likely_goals.slice(0, 3).join(', ')}`);
    }
    if (perspective.current_challenges?.length) {
      parts.push(`Desafios: ${perspective.current_challenges.slice(0, 3).join(', ')}`);
    }
    if (perspective.fears_and_concerns?.length) {
      parts.push(`Medos: ${perspective.fears_and_concerns.slice(0, 2).join(', ')}`);
    }
    if (perspective.desires_and_aspirations?.length) {
      parts.push(`Desejos: ${perspective.desires_and_aspirations.slice(0, 2).join(', ')}`);
    }
    if (perspective.hidden_pains?.length) {
      parts.push(`Dores ocultas: ${perspective.hidden_pains.slice(0, 2).join(', ')}`);
    }
  }

  // Approach strategy
  const approach = insights.approach_strategy;
  if (approach) {
    parts.push(`\n--- ESTRATÉGIA DE ABORDAGEM ---`);
    if (approach.opening_hook) parts.push(`Gancho inicial: ${approach.opening_hook}`);
    if (approach.best_channel) parts.push(`Melhor canal: ${approach.best_channel}`);
    if (approach.best_time_to_contact) parts.push(`Melhor horário: ${approach.best_time_to_contact}`);
    if (approach.key_points_to_touch?.length) {
      parts.push(`Pontos chave: ${approach.key_points_to_touch.slice(0, 3).join(', ')}`);
    }
    if (approach.topics_to_avoid?.length) {
      parts.push(`Evitar: ${approach.topics_to_avoid.slice(0, 2).join(', ')}`);
    }
  }

  // Value anchoring
  const value = insights.value_anchoring;
  if (value) {
    parts.push(`\n--- ANCORAGEM DE VALOR ---`);
    if (value.pain_to_highlight) parts.push(`Dor a destacar: ${value.pain_to_highlight}`);
    if (value.result_to_promise) parts.push(`Resultado a prometer: ${value.result_to_promise}`);
    if (value.social_proof_angle) parts.push(`Prova social: ${value.social_proof_angle}`);
    if (value.urgency_angle) parts.push(`Urgência: ${value.urgency_angle}`);
  }

  // Expected objections
  const objections = insights.expected_objections;
  if (objections?.length) {
    parts.push(`\n--- OBJEÇÕES ESPERADAS ---`);
    objections.slice(0, 3).forEach((obj, i) => {
      parts.push(`${i + 1}. ${obj.objection} (${obj.likelihood})`);
      if (obj.response_strategy) parts.push(`   Resposta: ${obj.response_strategy}`);
    });
  }

  // What pushes away
  const pushes = insights.what_pushes_away;
  if (pushes) {
    parts.push(`\n--- O QUE AFASTA ---`);
    if (pushes.behaviors_to_avoid?.length) {
      parts.push(`Comportamentos a evitar: ${pushes.behaviors_to_avoid.slice(0, 2).join(', ')}`);
    }
    if (pushes.words_to_avoid?.length) {
      parts.push(`Palavras a evitar: ${pushes.words_to_avoid.slice(0, 3).join(', ')}`);
    }
  }

  return parts.join('\n');
}

// Shorter context for quick display
export function buildShortQualificationSummary(lead: EnrichedLead): string | null {
  if (!lead.ai_insights) return null;
  
  const insights = lead.ai_insights;
  const parts: string[] = [];
  
  if (insights.score) parts.push(`${insights.score}pts`);
  if (insights.behavioral_profile?.primary_style) {
    parts.push(insights.behavioral_profile.primary_style.charAt(0).toUpperCase());
  }
  
  return parts.length ? parts.join(' • ') : null;
}
