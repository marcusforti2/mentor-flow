import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Helper function to send welcome email via Resend
async function sendWelcomeEmail(params: {
  email: string;
  fullName: string | null;
  role: string;
  tenantName: string;
  loginUrl: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const { email, fullName, role, tenantName, loginUrl } = params;
  const displayName = fullName || email.split('@')[0];
  
  const roleLabel = role === 'mentor' ? 'Mentor' : 
                    role === 'mentee' ? 'Mentorado' : 
                    role === 'admin' ? 'Administrador' : 
                    role === 'ops' ? 'Operador' : role;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background-color: #f4f4f8; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .logo span { color: #d4af37; }
    h1 { color: #1a1a2e; font-size: 24px; margin-bottom: 20px; }
    .steps { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .steps h3 { margin-top: 0; color: #1a1a2e; font-size: 16px; }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { margin-bottom: 10px; }
    .highlight { background: #d4af37; color: #1a1a2e; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .info-box { border-left: 4px solid #d4af37; padding: 15px; background: #fdf9e8; margin: 20px 0; }
    .info-box strong { color: #1a1a2e; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px; }
    .button { display: inline-block; background: #d4af37; color: #1a1a2e; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">LBV <span>TECH</span></div>
      </div>
      
      <h1>Olá ${displayName},</h1>
      
      <p>Seu acesso à plataforma <strong>LBV TECH</strong> já está liberado.</p>
      
      <div class="steps">
        <h3>📋 Como acessar</h3>
        <ol>
          <li>Acesse a plataforma: <a href="${loginUrl}">${loginUrl}</a></li>
          <li>Na tela de login, informe este email: <span class="highlight">${email}</span></li>
          <li>Você receberá um código de acesso por email</li>
          <li>Digite o código e pronto, você estará dentro da plataforma</li>
        </ol>
      </div>
      
      <div class="info-box">
        <p style="margin: 0;"><strong>Seu perfil de acesso:</strong></p>
        <p style="margin: 5px 0;">• Papel: <strong>${roleLabel}</strong></p>
        <p style="margin: 5px 0;">• Empresa: <strong>${tenantName}</strong></p>
      </div>
      
      <p>Se tiver qualquer dúvida ou dificuldade de acesso, fale com nosso suporte:</p>
      <p>📧 <a href="mailto:suporte@equipe.aceleracaoforti.online">suporte@equipe.aceleracaoforti.online</a></p>
      
      <p>Seja bem-vindo(a)!</p>
      
      <div class="footer">
        <p>Com carinho,<br><strong>Equipe LBV TECH</strong></p>
        <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} LBV TECH. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LBV TECH <no-reply@equipe.aceleracaoforti.online>",
        to: [email],
        subject: "Bem-vindo à LBV TECH | Seu acesso está pronto",
        html: htmlBody,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("Resend API error:", result);
      return { success: false, error: result };
    }

    console.log("Welcome email sent successfully to:", email, "Result:", result);
    return { success: true, messageId: result.id };
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return { success: false, error: error?.message || String(error) };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenant_id, email, full_name, phone, role } = await req.json();

    // Validate required fields
    if (!tenant_id || !email || !role) {
      throw new Error("tenant_id, email e role são obrigatórios");
    }

    // Validate role
    if (!['mentor', 'mentee', 'admin', 'ops'].includes(role)) {
      throw new Error("Role inválido. Use: mentor, mentee, admin ou ops");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get caller's auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Token de autenticação não fornecido");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !caller) {
      console.error("create-membership: Auth error:", authError);
      throw new Error("Não autorizado");
    }

    console.log("create-membership: Caller:", caller.id, "creating invite for:", email, "role:", role);

    // Get caller's memberships to check permissions
    const { data: callerMemberships, error: membershipError } = await supabase
      .from("memberships")
      .select("id, tenant_id, role")
      .eq("user_id", caller.id)
      .eq("status", "active");

    if (membershipError) {
      console.error("create-membership: Error fetching memberships:", membershipError);
      throw new Error("Erro ao verificar permissões");
    }

    // Check permissions
    const isMasterAdmin = callerMemberships?.some(m => m.role === 'master_admin');
    const isTenantAdmin = callerMemberships?.some(m => m.tenant_id === tenant_id && ['admin', 'mentor'].includes(m.role));
    const callerMembershipInTenant = callerMemberships?.find(m => m.tenant_id === tenant_id);

    console.log("create-membership: Permissions:", { isMasterAdmin, isTenantAdmin });

    // Permission rules:
    // - master_admin: can create any role in any tenant
    // - admin/mentor: can create mentee only in their own tenant
    // - mentor cannot create another mentor
    
    if (role === 'mentor' || role === 'admin' || role === 'ops') {
      if (!isMasterAdmin) {
        console.log("create-membership: Permission denied - only master_admin can create", role);
        return new Response(
          JSON.stringify({ error: "Apenas o Master Admin pode criar mentores, admins ou operadores" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else if (role === 'mentee') {
      if (!isMasterAdmin && !isTenantAdmin) {
        console.log("create-membership: Permission denied - caller not authorized for tenant");
        return new Response(
          JSON.stringify({ error: "Você não tem permissão para criar mentorados neste programa" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("create-membership: Tenant not found:", tenantError);
      throw new Error("Programa não encontrado");
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already has membership in this tenant with this role
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", normalizedEmail)
      .single();

    if (existingProfile?.user_id) {
      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("id, role")
        .eq("user_id", existingProfile.user_id)
        .eq("tenant_id", tenant_id)
        .eq("status", "active")
        .single();

      if (existingMembership) {
        console.log("create-membership: User already has membership in tenant");
        return new Response(
          JSON.stringify({ error: "Este usuário já está ativo neste programa" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check for existing invite
    const { data: existingInvite } = await supabase
      .from("invites")
      .select("id, status")
      .eq("tenant_id", tenant_id)
      .eq("email", normalizedEmail)
      .eq("role", role)
      .single();

    if (existingInvite?.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: "Este convite já foi aceito" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upsert invite
    const inviteData = {
      tenant_id,
      email: normalizedEmail,
      role,
      status: 'pending',
      metadata: {
        full_name: full_name || null,
        phone: phone || null,
      },
      created_by_membership_id: callerMembershipInTenant?.id || null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    let invite;
    if (existingInvite) {
      // Update existing pending invite
      const { data, error } = await supabase
        .from("invites")
        .update({
          ...inviteData,
          revoked_at: null,
        })
        .eq("id", existingInvite.id)
        .select()
        .single();
      
      if (error) throw error;
      invite = data;
      console.log("create-membership: Updated existing invite:", invite.id);
    } else {
      // Create new invite
      const { data, error } = await supabase
        .from("invites")
        .insert(inviteData)
        .select()
        .single();
      
      if (error) throw error;
      invite = data;
      console.log("create-membership: Created new invite:", invite.id);
    }

    // Build login URL
    const siteUrl = Deno.env.get("SITE_URL") || "https://client-flourish-ai.lovable.app";
    const loginUrl = `${siteUrl}/auth`;

    console.log("create-membership: Success - invite created for:", normalizedEmail);

    // Send welcome email asynchronously (non-blocking)
    // Only send for new invites, not when updating existing ones
    if (!existingInvite) {
      // Fire and forget - don't await, email sending shouldn't block the response
      sendWelcomeEmail({
        email: normalizedEmail,
        fullName: full_name || null,
        role: role,
        tenantName: tenant.name,
        loginUrl: loginUrl,
      }).then((result) => {
        if (result.success) {
          console.log("create-membership: Welcome email sent successfully to:", normalizedEmail);
        } else {
          console.error("create-membership: Failed to send welcome email:", result.error);
        }
      }).catch((err) => {
        console.error("create-membership: Email send error:", err);
      });
      
      console.log("create-membership: Welcome email queued for:", normalizedEmail);
    } else {
      console.log("create-membership: Skipping email - existing invite updated for:", normalizedEmail);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          full_name: full_name || null,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        login_url: loginUrl,
        email_sent: !existingInvite, // Indicate if email was sent
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("create-membership: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
