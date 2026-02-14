import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM_EMAIL = "Learning Brand <noreply@equipe.aceleracaoforti.online>";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY não configurada" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const resend = new Resend(RESEND_API_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { flowId, immediate = true } = await req.json();

    if (!flowId) throw new Error("flowId é obrigatório");

    // 1. Load the flow
    const { data: flow, error: flowError } = await supabase
      .from('email_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) throw new Error("Fluxo não encontrado");

    const nodes: any[] = flow.nodes || [];
    const audienceType = flow.audience_type || 'all';
    const audienceMembershipIds: string[] = flow.audience_membership_ids || [];
    const tenantId = flow.tenant_id;
    const ownerMembershipId = flow.owner_membership_id;

    // 2. Resolve recipients
    let memberships: { id: string; user_id: string }[] = [];

    if (audienceType === 'specific' && audienceMembershipIds.length > 0) {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, user_id')
        .in('id', audienceMembershipIds)
        .eq('status', 'active');
      if (error) throw error;
      memberships = data || [];
    } else {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, user_id')
        .eq('tenant_id', tenantId)
        .eq('role', 'mentee')
        .eq('status', 'active');
      if (error) throw error;
      memberships = data || [];
    }

    if (memberships.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum destinatário encontrado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get profiles for email addresses
    const userIds = memberships.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Get mentor name from owner membership
    let mentorName = 'Seu Mentor';
    if (ownerMembershipId) {
      const { data: ownerMembership } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('id', ownerMembershipId)
        .single();
      if (ownerMembership) {
        const { data: mentorProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', ownerMembership.user_id)
          .single();
        if (mentorProfile?.full_name) mentorName = mentorProfile.full_name;
      }
    }

    // Get business profiles for all recipients via mentee_profiles
    const membershipIds = memberships.map(m => m.id);
    const { data: menteeProfiles } = await supabase
      .from('mentee_profiles')
      .select('membership_id, business_name')
      .in('membership_id', membershipIds);
    const businessMap = new Map(menteeProfiles?.map(bp => [bp.membership_id, bp]) || []);

    // Get membership created_at for journey days
    const { data: membershipDetails } = await supabase
      .from('memberships')
      .select('id, created_at')
      .in('id', memberships.map(m => m.id));
    const membershipDateMap = new Map(membershipDetails?.map(m => [m.id, m.created_at]) || []);

    // Build recipient list
    const recipients = memberships
      .map(m => {
        const profile = profileMap.get(m.user_id);
        const biz = businessMap.get(m.id);
        const joinedAt = membershipDateMap.get(m.id);
        const diasNaJornada = joinedAt ? Math.floor((Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        return {
          membershipId: m.id,
          userId: m.user_id,
          email: profile?.email,
          fullName: profile?.full_name || 'Mentorado',
          businessName: biz?.business_name || '',
          diasNaJornada,
        };
      })
      .filter(r => r.email);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum destinatário com email encontrado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Load templates if needed
    const templateIds = nodes
      .filter((n: any) => n.type === 'email' && n.data?.templateId)
      .map((n: any) => n.data.templateId);

    let templateMap = new Map();
    if (templateIds.length > 0) {
      const { data: templates } = await supabase
        .from('email_templates')
        .select('id, subject, body_html')
        .in('id', templateIds);
      templateMap = new Map(templates?.map(t => [t.id, t]) || []);
    }

    // 4. Get email nodes in order
    const emailNodes = nodes.filter((n: any) => n.type === 'email');

    if (emailNodes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum nó de email no fluxo" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Replace all variables helper
    const replaceVars = (text: string, recipient: typeof recipients[0]) => {
      return text
        .replace(/\{\{nome\}\}/g, recipient.fullName)
        .replace(/\{\{email\}\}/g, recipient.email || '')
        .replace(/\{\{business_name\}\}/g, recipient.businessName)
        .replace(/\{\{mentor_name\}\}/g, mentorName)
        .replace(/\{\{dias_na_jornada\}\}/g, String(recipient.diasNaJornada))
        .replace(/\{\{trilhas_concluidas\}\}/g, '0'); // TODO: query trail_progress when available
    };

    // 6. Send emails
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      for (let i = 0; i < emailNodes.length; i++) {
        const node = emailNodes[i];
        let subject = node.data.subject || '';
        let body = node.data.body || '';

        if (node.data.templateId && templateMap.has(node.data.templateId)) {
          const tpl = templateMap.get(node.data.templateId);
          subject = tpl.subject;
          body = tpl.body_html;
        }

        if (!subject && !body) continue;

        const personalizedBody = replaceVars(body, recipient);
        const personalizedSubject = replaceVars(subject, recipient);

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
              .email-container { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
              .content { padding: 30px; }
              .footer { text-align: center; padding: 20px; background: #f3f4f6; font-size: 12px; color: #6b7280; }
              a { color: #f59e0b; }
              .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>${personalizedSubject}</h1>
              </div>
              <div class="content">
                ${personalizedBody}
              </div>
              <div class="footer">
                <p style="margin-bottom:10px;color:#4b5563;">Com carinho,<br/><strong>${mentorName}</strong></p>
                <p>© ${new Date().getFullYear()} Learning Brand. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        if (successCount > 0 || errorCount > 0) {
          await delay(600);
        }

        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: [recipient.email!],
            subject: personalizedSubject,
            html: htmlContent,
          });
          successCount++;
        } catch (err: any) {
          errorCount++;
          errors.push(`${recipient.email}: ${err.message}`);
          console.error(`Failed to send to ${recipient.email}:`, err.message);
        }
      }

      // Record execution
      try {
        await supabase.from('email_flow_executions').insert({
          flow_id: flowId,
          membership_id: recipient.membershipId,
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to record execution:', e);
      }
    }

    if (!immediate) {
      await supabase
        .from('email_flows')
        .update({ is_active: true })
        .eq('id', flowId);
    }

    const totalEmails = recipients.length * emailNodes.length;
    const message = errorCount > 0
      ? `${successCount} de ${totalEmails} email(s) enviados. ${errorCount} falharam.`
      : `${successCount} email(s) enviados para ${recipients.length} mentorado(s) com sucesso!`;

    console.log(`Flow ${flowId} execution complete: ${successCount} sent, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        message,
        stats: { total: totalEmails, sent: successCount, failed: errorCount },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in execute-email-flow:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
