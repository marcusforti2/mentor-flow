import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { membership_id } = await req.json();
    if (!membership_id) throw new Error("membership_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch business profile
    const { data: bp, error: bpErr } = await supabase
      .from("mentorado_business_profiles")
      .select("*")
      .eq("membership_id", membership_id)
      .maybeSingle();

    if (bpErr || !bp) {
      return new Response(JSON.stringify({ error: "Business profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch user profile (name, email)
    const { data: membership } = await supabase
      .from("memberships")
      .select("user_id, tenant_id")
      .eq("id", membership_id)
      .single();

    if (!membership) throw new Error("Membership not found");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", membership.user_id)
      .single();

    if (!profile?.email) throw new Error("User email not found");

    // 3. Fetch tenant info for branding
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", membership.tenant_id)
      .single();

    // 4. Generate AI tips based on business profile
    const dailyGoal = bp.daily_prospection_goal || 10;
    const businessContext = [
      bp.business_name ? `Negócio: ${bp.business_name}` : null,
      bp.business_type ? `Tipo: ${bp.business_type}` : null,
      bp.target_audience ? `Público-alvo: ${bp.target_audience}` : null,
      bp.main_offer ? `Oferta principal: ${bp.main_offer}` : null,
      bp.ideal_client_profile ? `Perfil de cliente ideal: ${bp.ideal_client_profile}` : null,
      bp.main_bottleneck ? `Principal gargalo: ${bp.main_bottleneck}` : null,
      bp.current_sales_channels?.length ? `Canais de venda: ${bp.current_sales_channels.join(", ")}` : null,
      bp.average_ticket ? `Ticket médio: ${bp.average_ticket}` : null,
      bp.sales_cycle_days ? `Ciclo de vendas: ${bp.sales_cycle_days} dias` : null,
      bp.pitch_context ? `Contexto de pitch: ${bp.pitch_context}` : null,
      `Meta diária de prospecção: ${dailyGoal} contatos`,
    ].filter(Boolean).join("\n");

    let aiTips = "";

    if (lovableKey) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `Você é um coach de vendas especializado em mentoria high ticket. 
Gere um email motivacional e prático em HTML para um mentorado que acabou de cadastrar seu perfil de negócio.
O email deve:
1. Parabenizar pela ação de organizar o negócio
2. Analisar a meta diária de prospecção e dar 3 dicas ESPECÍFICAS baseadas no perfil do negócio
3. Dar uma estratégia de ritmo e consistência personalizada para o tipo de negócio
4. Terminar com uma frase motivacional de impacto

Use formatação HTML limpa (h2, p, ul, li, strong). NÃO use markdown.
Mantenha o tom profissional mas encorajador. Max 400 palavras.
NÃO inclua tags html/head/body, apenas o conteúdo interno.`,
              },
              {
                role: "user",
                content: `Perfil do mentorado:\nNome: ${profile.full_name}\n\n${businessContext}`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiTips = aiData.choices?.[0]?.message?.content || "";
        } else {
          console.error("AI gateway error:", aiResponse.status);
        }
      } catch (e) {
        console.error("AI error:", e);
      }
    }

    // Fallback if AI fails
    if (!aiTips) {
      aiTips = `
        <h2>🎯 Sua meta: ${dailyGoal} prospecções por dia</h2>
        <p>Olá ${profile.full_name?.split(" ")[0] || ""}!</p>
        <p>Parabéns por cadastrar seu perfil de negócio! Isso mostra comprometimento com seus resultados.</p>
        <h3>3 dicas para manter o ritmo:</h3>
        <ul>
          <li><strong>Bloqueie horários fixos</strong> para prospecção — trate como uma reunião inadiável</li>
          <li><strong>Use a regra dos 5 minutos</strong> — se não tem vontade, faça apenas 5 minutos. A ação gera motivação</li>
          <li><strong>Registre cada contato</strong> no CRM — o que não é medido não é gerenciado</li>
        </ul>
        <p><strong>Consistência supera intensidade.</strong> ${dailyGoal} contatos por dia = ${dailyGoal * 22} por mês. Os resultados vêm!</p>
      `;
    }

    // 5. Send email via Resend
    if (!resendKey) {
      console.warn("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_resend_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mentorName = tenant?.name || "Sua Mentoria";
    const emailHtml = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f13; color: #e4e4e7; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; color: #d4af37; margin: 0;">🚀 Seu plano de prospecção está ativo!</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">${mentorName}</p>
        </div>
        <div style="background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">
          ${aiTips}
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #71717a; font-size: 12px;">Este email foi gerado automaticamente pela IA da ${mentorName}</p>
        </div>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${mentorName} <onboarding@resend.dev>`,
        to: [profile.email],
        subject: `🎯 ${profile.full_name?.split(" ")[0]}, sua meta de ${dailyGoal} prospecções/dia está ativa!`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();
    console.log("Email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, email_sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-prospection-tips error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
