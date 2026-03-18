import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BusinessProfile {
  business_name: string | null;
  business_type: string | null;
  target_audience: string | null;
  main_offer: string | null;
  price_range: string | null;
  unique_value_proposition: string | null;
  pain_points_solved: string[] | null;
  ideal_client_profile: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (images.length > 10) {
      return new Response(JSON.stringify({ error: "Maximum 10 images allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${images.length} images for user ${user.id}`);

    // Accept any active membership (mentee, admin, mentor, master_admin)
    // This supports both direct usage and impersonation
    const { data: membership } = await supabase
      .from("memberships")
      .select("id, tenant_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("role")
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Active membership not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get business profile for context
    let businessProfile: BusinessProfile | null = null;
    
    const { data: menteeProfile } = await supabase
      .from("mentee_profiles")
      .select("business_profile")
      .eq("membership_id", membership.id)
      .maybeSingle();
    
    if (menteeProfile?.business_profile) {
      const bp = menteeProfile.business_profile as any;
      businessProfile = {
        business_name: bp.business_name || null,
        business_type: bp.business_type || null,
        target_audience: bp.target_audience || null,
        main_offer: bp.main_offer || null,
        price_range: bp.price_range || null,
        unique_value_proposition: bp.unique_value_proposition || null,
        pain_points_solved: bp.pain_points_solved || null,
        ideal_client_profile: bp.ideal_client_profile || null,
      };
    }
    
    if (!businessProfile) {
      const { data: mbp } = await supabase
        .from("mentorado_business_profiles")
        .select("*")
        .eq("membership_id", membership.id)
        .maybeSingle();
      businessProfile = mbp;
    }

    const businessContext = businessProfile ? buildBusinessContext(businessProfile) : "Nenhum perfil de negócio cadastrado.";

    // Build multimodal content
    const content: any[] = [
      {
        type: "text",
        text: buildPrompt(businessContext, images.length),
      },
    ];

    for (const image of images) {
      content.push({
        type: "image_url",
        image_url: { url: image },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_leads_data",
              description: "Extrair dados estruturados de múltiplos leads a partir das imagens analisadas. Cada pessoa/conversa diferente deve gerar um lead separado.",
              parameters: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    description: "Lista de leads detectados nas imagens. Cada conversa ou pessoa diferente gera um lead.",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "Nome completo do lead detectado nas imagens",
                        },
                        phone: {
                          type: "string",
                          description: "Telefone do lead se visível",
                        },
                        email: {
                          type: "string",
                          description: "Email do lead se visível",
                        },
                        company: {
                          type: "string",
                          description: "Empresa ou ocupação do lead",
                        },
                        temperature: {
                          type: "string",
                          enum: ["cold", "warm", "hot"],
                          description: "Nível de interesse: cold (frio), warm (morno), hot (quente)",
                        },
                        interests: {
                          type: "array",
                          items: { type: "string" },
                          description: "Lista de interesses identificados do lead",
                        },
                        objections: {
                          type: "array",
                          items: { type: "string" },
                          description: "Objeções ou resistências detectadas",
                        },
                        insights: {
                          type: "array",
                          items: { type: "string" },
                          description: "Insights úteis para vender para este lead",
                        },
                        suggested_approach: {
                          type: "string",
                          description: "Sugestão de abordagem personalizada para este lead",
                        },
                        conversation_summary: {
                          type: "string",
                          description: "Resumo da conversa ou conteúdo das imagens",
                        },
                        source_type: {
                          type: "string",
                          enum: ["whatsapp", "instagram", "linkedin", "facebook", "twitter", "other"],
                          description: "Origem do print (rede social identificada)",
                        },
                        image_indices: {
                          type: "array",
                          items: { type: "integer" },
                          description: "Índices (0-based) das imagens que pertencem a este lead",
                        },
                      },
                      required: ["name", "temperature", "insights", "suggested_approach", "image_indices"],
                    },
                  },
                },
                required: ["leads"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_leads_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_leads_data") {
      throw new Error("Invalid AI response format");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`Extracted ${result.leads?.length || 0} leads`);

    return new Response(JSON.stringify({ success: true, leads: result.leads || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-lead-screenshots:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildBusinessContext(profile: BusinessProfile): string {
  const parts: string[] = [];
  
  if (profile.business_name) parts.push(`Negócio: ${profile.business_name}`);
  if (profile.business_type) parts.push(`Tipo: ${profile.business_type}`);
  if (profile.target_audience) parts.push(`Público-alvo: ${profile.target_audience}`);
  if (profile.main_offer) parts.push(`Oferta principal: ${profile.main_offer}`);
  if (profile.price_range) parts.push(`Faixa de preço: ${profile.price_range}`);
  if (profile.unique_value_proposition) parts.push(`Diferencial: ${profile.unique_value_proposition}`);
  if (profile.pain_points_solved?.length) parts.push(`Dores que resolve: ${profile.pain_points_solved.join(", ")}`);
  if (profile.ideal_client_profile) parts.push(`Cliente ideal: ${profile.ideal_client_profile}`);
  
  return parts.length > 0 ? parts.join("\n") : "Nenhum perfil de negócio cadastrado.";
}

function buildPrompt(businessContext: string, imageCount: number): string {
  return `Você é um assistente de vendas especializado em analisar screenshots de conversas e redes sociais para extrair informações de leads.

## CONTEXTO DO NEGÓCIO DO VENDEDOR
${businessContext}

## SUA TAREFA
Analise cuidadosamente todas as ${imageCount} imagens fornecidas. Elas podem ser:
- Prints de conversas do WhatsApp
- Screenshots de perfis ou conversas do Instagram
- Prints de conversas ou perfis do LinkedIn
- Screenshots de outras redes sociais
- Qualquer combinação das anteriores

## REGRA CRÍTICA: MÚLTIPLOS LEADS
- Cada PESSOA DIFERENTE identificada nas imagens deve gerar um LEAD SEPARADO.
- Se as imagens mostram conversas com 3 pessoas diferentes, gere 3 leads.
- Se todas as imagens são da MESMA conversa com a MESMA pessoa, gere apenas 1 lead.
- Use o campo "image_indices" para indicar quais imagens (pelo índice 0-based) pertencem a cada lead.
- Você pode gerar até ${imageCount} leads (um por imagem no máximo).

## O QUE VOCÊ DEVE EXTRAIR POR LEAD
1. **Nome do lead**: Identifique o nome da pessoa nas conversas ou perfis
2. **Contato**: Se houver telefone ou email visível
3. **Empresa/Ocupação**: Profissão ou empresa do lead
4. **Temperatura do lead**: 
   - HOT: Demonstrou interesse claro, pediu proposta, está pronto para comprar
   - WARM: Mostrou curiosidade, fez perguntas, mas ainda não decidiu
   - COLD: Apenas conversou, não demonstrou interesse específico
5. **Interesses**: O que o lead parece querer ou precisar
6. **Objeções**: Resistências ou preocupações mencionadas
7. **Insights para venda**: Informações úteis para personalizar a abordagem
8. **Sugestão de abordagem**: Como o vendedor deve abordar este lead
9. **Origem**: De qual rede social é o print

## IMPORTANTE
- Se não conseguir identificar alguma informação, deixe em branco ou use valores padrão
- Seja específico nos insights - use informações das conversas
- A sugestão de abordagem deve ser prática e acionável
- Considere o contexto do negócio do vendedor para personalizar as sugestões
- SEMPRE gere pelo menos 1 lead, mesmo que precise usar "Lead Desconhecido" como nome`;
}
