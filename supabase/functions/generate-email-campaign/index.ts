import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, mentorId } = await req.json();

    if (!prompt || !mentorId) {
      throw new Error("Missing required fields: prompt and mentorId");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em email marketing para mentores de negócios.
Dado uma descrição de campanha, você deve criar um fluxo de automação de emails completo.

IMPORTANTE: Retorne APENAS o JSON válido, sem markdown, sem explicações.

O JSON deve ter esta estrutura:
{
  "flowName": "Nome da campanha",
  "flowDescription": "Descrição curta",
  "triggerType": "onboarding|inactivity|trail_completion|date|manual",
  "triggerConfig": {},
  "nodes": [
    {
      "type": "email",
      "subject": "Assunto do email",
      "body": "Corpo do email em HTML simples. Use {{nome}} para o nome do mentorado."
    },
    {
      "type": "wait",
      "duration": 2,
      "unit": "days"
    }
  ]
}

Crie emails persuasivos, empáticos e profissionais. Use técnicas de copywriting.
Os emails devem ter CTAs claros e criar conexão emocional.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Crie uma campanha de email marketing para: ${prompt}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from AI response
    let campaignData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        campaignData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build nodes array with proper format for ReactFlow
    const flowNodes: any[] = [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 250, y: 50 },
        data: {
          label: "Gatilho",
          triggerType: campaignData.triggerType || "manual",
          config: campaignData.triggerConfig || {},
        },
      },
    ];

    const flowEdges: any[] = [];
    let yPosition = 200;
    let previousNodeId = "trigger-1";

    campaignData.nodes?.forEach((node: any, index: number) => {
      const nodeId = `${node.type}-${index + 1}`;
      
      if (node.type === "email") {
        flowNodes.push({
          id: nodeId,
          type: "email",
          position: { x: 250, y: yPosition },
          data: {
            label: "Enviar Email",
            subject: node.subject,
            body: node.body,
            templateId: "",
          },
        });
      } else if (node.type === "wait") {
        flowNodes.push({
          id: nodeId,
          type: "wait",
          position: { x: 250, y: yPosition },
          data: {
            label: "Aguardar",
            duration: node.duration || 1,
            unit: node.unit || "days",
          },
        });
      }

      // Add edge from previous node
      flowEdges.push({
        id: `e-${previousNodeId}-${nodeId}`,
        source: previousNodeId,
        target: nodeId,
        markerEnd: { type: "arrowclosed" },
      });

      previousNodeId = nodeId;
      yPosition += 150;
    });

    // Look up mentor's tenant_id
    let tenantId: string | null = null;
    const { data: mentorMembership } = await supabase
      .from('memberships')
      .select('tenant_id')
      .eq('user_id', (await supabase.from('mentors').select('user_id').eq('id', mentorId).single()).data?.user_id || '')
      .eq('role', 'mentor')
      .eq('status', 'active')
      .maybeSingle();
    if (mentorMembership) tenantId = mentorMembership.tenant_id;

    // Save the flow to database
    const { data: flowData, error: flowError } = await supabase
      .from("email_flows")
      .insert({
        mentor_id: mentorId,
        tenant_id: tenantId,
        name: campaignData.flowName || "Campanha Gerada por IA",
        description: campaignData.flowDescription || prompt,
        nodes: flowNodes,
        edges: flowEdges,
        is_active: false,
      })
      .select()
      .single();

    if (flowError) {
      console.error("Flow insert error:", flowError);
      throw flowError;
    }

    // Save trigger configuration
    if (campaignData.triggerType && campaignData.triggerType !== "manual") {
      await supabase.from("email_flow_triggers").insert({
        flow_id: flowData.id,
        trigger_type: campaignData.triggerType,
        config: campaignData.triggerConfig || {},
      });
    }

    console.log("Campaign generated successfully:", flowData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        flow: flowData,
        message: "Campanha gerada com sucesso!"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error generating campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
