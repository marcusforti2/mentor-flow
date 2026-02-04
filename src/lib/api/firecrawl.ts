import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

type ScrapeOptions = {
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
  onlyMainContent?: boolean;
  waitFor?: number;
  location?: { country?: string; languages?: string[] };
};

export const firecrawlApi = {
  // Scrape a single URL
  async scrape(url: string, options?: ScrapeOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};

// Lead Qualifier API
export interface LeadQualificationReport {
  score: number;
  score_breakdown: {
    fit_with_offer: number;
    buying_signals: number;
    engagement_level: number;
    financial_capacity: number;
  };
  summary: string;
  recommendation: 'pursue_hot' | 'nurture' | 'low_priority' | 'not_fit';
  behavioral_profile: {
    primary_style: 'dominante' | 'influente' | 'estavel' | 'analitico';
    secondary_style: string;
    communication_preference: string;
    decision_making_style: string;
    what_motivates: string[];
    what_frustrates: string[];
    how_to_build_rapport: string;
  };
  lead_perspective: {
    likely_goals: string[];
    current_challenges: string[];
    fears_and_concerns: string[];
    desires_and_aspirations: string[];
  };
  approach_strategy: {
    opening_hook: string;
    key_points_to_touch: string[];
    topics_to_avoid: string[];
    best_channel: 'dm_instagram' | 'linkedin' | 'whatsapp' | 'email';
    best_time_to_contact: string;
  };
  value_anchoring: {
    pain_to_highlight: string;
    result_to_promise: string;
    social_proof_angle: string;
    price_justification: string;
    roi_argument: string;
  };
  expected_objections: Array<{
    objection: string;
    likelihood: 'alta' | 'media' | 'baixa';
    response_strategy: string;
    script_example: string;
  }>;
  what_pushes_away: {
    behaviors_to_avoid: string[];
    words_to_avoid: string[];
    approaches_that_fail: string[];
  };
  extracted_data: {
    name: string;
    headline: string;
    company: string;
    industry: string;
    location: string;
    followers: number | null;
    content_topics: string[];
    recent_posts_summary: string;
  };
}

export interface BusinessProfile {
  business_name?: string;
  business_type?: string;
  main_offer?: string;
  target_audience?: string;
  unique_value_proposition?: string;
  pain_points_solved?: string[];
  price_range?: string;
}

export const leadQualifierApi = {
  async analyze(
    profileUrl: string, 
    businessProfile?: BusinessProfile
  ): Promise<{ success: boolean; report?: LeadQualificationReport; error?: string }> {
    const { data, error } = await supabase.functions.invoke('lead-qualifier', {
      body: { profileUrl, businessProfile },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};

// Cold Messages API
export interface ColdMessage {
  title: string;
  content: string;
  timing: string;
}

export interface ColdMessagesResult {
  message1: ColdMessage;
  message2: ColdMessage;
  tips: string[];
}

export const coldMessagesApi = {
  async generate(params: {
    leadName: string;
    leadContext?: string;
    platform: 'instagram' | 'linkedin';
    tone: 'casual' | 'professional' | 'direct';
    businessProfile?: BusinessProfile;
  }): Promise<{ success: boolean; messages?: ColdMessagesResult; error?: string }> {
    const { data, error } = await supabase.functions.invoke('cold-messages', {
      body: params,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};
