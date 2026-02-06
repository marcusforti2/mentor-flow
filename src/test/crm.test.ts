import { describe, it, expect } from 'vitest';
import {
  buildQualificationContext,
  buildShortQualificationSummary,
  type EnrichedLead,
} from '@/hooks/useLeadsWithQualification';
import type { LeadQualificationReport } from '@/lib/api/firecrawl';

// --- Test Data Factories ---
function createBasicLead(overrides: Partial<EnrichedLead> = {}): EnrichedLead {
  return {
    id: 'lead-1',
    contact_name: 'João Silva',
    company: 'TechCorp',
    contact_email: 'joao@techcorp.com',
    contact_phone: '+5511999999999',
    temperature: 'hot',
    status: 'novo',
    notes: 'Lead interessante do LinkedIn',
    ai_insights: null,
    hasQualification: false,
    updated_at: '2026-02-01T10:00:00Z',
    ...overrides,
  };
}

function createQualifiedLead(): EnrichedLead {
  const insights: LeadQualificationReport = {
    score: 85,
    score_breakdown: {
      fit_with_offer: 90,
      buying_signals: 80,
      engagement_level: 85,
      financial_capacity: 75,
    },
    summary: 'Lead com alto potencial de conversão',
    recommendation: 'pursue_hot',
    extracted_data: {
      name: 'João Silva',
      headline: 'CEO da TechCorp',
      company: 'TechCorp',
      industry: 'Tecnologia',
      location: 'São Paulo',
      followers: 5000,
      platform: 'linkedin',
      content_topics: ['SaaS', 'Vendas B2B', 'Gestão'],
    },
    behavioral_profile: {
      primary_style: 'dominante',
      secondary_style: 'influente',
      personality_summary: 'Líder orientado a resultados',
      communication_preference: 'Direto e objetivo',
      decision_making_style: 'Rápido e baseado em dados',
      what_motivates: ['Resultados', 'Crescimento', 'Reconhecimento'],
      what_frustrates: ['Lentidão', 'Falta de dados'],
      how_to_build_rapport: 'Apresentar resultados concretos',
      buying_triggers: ['ROI comprovado', 'Case studies'],
      red_flags_for_them: ['Promessas vagas'],
    },
    lead_perspective: {
      likely_goals: ['Escalar vendas', 'Automatizar processos'],
      current_challenges: ['Pipeline inconsistente', 'CAC alto'],
      fears_and_concerns: ['Investir sem retorno'],
      desires_and_aspirations: ['Ser referência no setor'],
      hidden_pains: ['Equipe desalinhada'],
    },
    approach_strategy: {
      opening_hook: 'Vi que você está escalando a TechCorp...',
      key_points_to_touch: ['Escala', 'ROI', 'Processo'],
      topics_to_avoid: ['Preço logo de início'],
      best_channel: 'linkedin',
      best_time_to_contact: 'Terça-feira pela manhã',
    },
    value_anchoring: {
      pain_to_highlight: 'Pipeline inconsistente',
      result_to_promise: '3x mais reuniões qualificadas',
      social_proof_angle: 'Clientes similares cresceram 200%',
      price_justification: 'Investimento recuperado em 60 dias',
      roi_argument: 'ROI de 5x no primeiro trimestre',
      urgency_angle: 'Mercado está aquecido agora',
    },
    expected_objections: [
      {
        objection: 'Já tenho um processo',
        likelihood: 'alta',
        response_strategy: 'Validar e oferecer complemento',
        script_example: 'Entendo, e o que você acha de potencializar o que já funciona?',
      },
      {
        objection: 'Preciso pensar',
        likelihood: 'media',
        response_strategy: 'Criar urgência com dados',
        script_example: 'Claro, enquanto isso posso enviar um caso de uso similar?',
      },
    ],
    what_pushes_away: {
      behaviors_to_avoid: ['Ser insistente demais', 'Falar de preço cedo'],
      words_to_avoid: ['barato', 'promoção', 'desconto'],
      approaches_that_fail: ['Cold call agressivo'],
    },
  };

  return createBasicLead({
    ai_insights: insights,
    hasQualification: true,
  });
}

describe('CRM - Lead Qualification', () => {
  describe('buildQualificationContext', () => {
    it('builds basic context for lead without AI insights', () => {
      const lead = createBasicLead();
      const context = buildQualificationContext(lead);

      expect(context).toContain('Nome: João Silva');
      expect(context).toContain('Empresa: TechCorp');
      expect(context).toContain('Temperatura: Quente 🔥');
      expect(context).toContain('Notas: Lead interessante do LinkedIn');
    });

    it('handles lead without company or notes', () => {
      const lead = createBasicLead({ company: null, notes: null });
      const context = buildQualificationContext(lead);

      expect(context).toContain('Nome: João Silva');
      expect(context).not.toContain('Empresa:');
      expect(context).not.toContain('Notas:');
    });

    it('maps temperature correctly', () => {
      const hotLead = createBasicLead({ temperature: 'hot' });
      expect(buildQualificationContext(hotLead)).toContain('Quente 🔥');

      const warmLead = createBasicLead({ temperature: 'warm' });
      expect(buildQualificationContext(warmLead)).toContain('Morno ☀️');

      const coldLead = createBasicLead({ temperature: 'cold' });
      expect(buildQualificationContext(coldLead)).toContain('Frio ❄️');
    });

    it('builds rich context for qualified lead', () => {
      const lead = createQualifiedLead();
      const context = buildQualificationContext(lead);

      // Score & summary
      expect(context).toContain('Score: 85/100');
      expect(context).toContain('Resumo: Lead com alto potencial de conversão');

      // Extracted data
      expect(context).toContain('Headline: CEO da TechCorp');
      expect(context).toContain('Indústria: Tecnologia');
      expect(context).toContain('SaaS');

      // Behavioral profile
      expect(context).toContain('PERFIL COMPORTAMENTAL');
      expect(context).toContain('Estilo DISC: DOMINANTE');
      expect(context).toContain('Personalidade: Líder orientado a resultados');

      // Lead perspective
      expect(context).toContain('PERSPECTIVA DO LEAD');
      expect(context).toContain('Escalar vendas');
      expect(context).toContain('Pipeline inconsistente');

      // Approach strategy
      expect(context).toContain('ESTRATÉGIA DE ABORDAGEM');
      expect(context).toContain('Vi que você está escalando a TechCorp');
      expect(context).toContain('linkedin');

      // Value anchoring
      expect(context).toContain('ANCORAGEM DE VALOR');
      expect(context).toContain('3x mais reuniões qualificadas');

      // Objections
      expect(context).toContain('OBJEÇÕES ESPERADAS');
      expect(context).toContain('Já tenho um processo');

      // What pushes away
      expect(context).toContain('O QUE AFASTA');
      expect(context).toContain('Ser insistente demais');
      expect(context).toContain('barato');
    });

    it('handles lead with null temperature', () => {
      const lead = createBasicLead({ temperature: null });
      const context = buildQualificationContext(lead);
      expect(context).not.toContain('Temperatura:');
    });
  });

  describe('buildShortQualificationSummary', () => {
    it('returns null for lead without AI insights', () => {
      const lead = createBasicLead();
      expect(buildShortQualificationSummary(lead)).toBeNull();
    });

    it('returns score and DISC style for qualified lead', () => {
      const lead = createQualifiedLead();
      const summary = buildShortQualificationSummary(lead);

      expect(summary).toContain('85pts');
      expect(summary).toContain('D'); // Dominante -> D
    });

    it('returns only score when no behavioral profile', () => {
      const lead = createBasicLead({
        ai_insights: {
          score: 70,
          behavioral_profile: { primary_style: '' } as any,
        } as any,
      });
      const summary = buildShortQualificationSummary(lead);
      expect(summary).toContain('70pts');
    });
  });
});

describe('CRM - Lead Data Model', () => {
  it('EnrichedLead has correct shape', () => {
    const lead = createBasicLead();

    expect(lead).toHaveProperty('id');
    expect(lead).toHaveProperty('contact_name');
    expect(lead).toHaveProperty('company');
    expect(lead).toHaveProperty('contact_email');
    expect(lead).toHaveProperty('contact_phone');
    expect(lead).toHaveProperty('temperature');
    expect(lead).toHaveProperty('status');
    expect(lead).toHaveProperty('notes');
    expect(lead).toHaveProperty('ai_insights');
    expect(lead).toHaveProperty('hasQualification');
    expect(lead).toHaveProperty('updated_at');
  });

  it('hasQualification is false when no ai_insights', () => {
    const lead = createBasicLead();
    expect(lead.hasQualification).toBe(false);
  });

  it('hasQualification is true when ai_insights present', () => {
    const lead = createQualifiedLead();
    expect(lead.hasQualification).toBe(true);
  });
});
