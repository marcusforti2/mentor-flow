import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// ============================================
// HELPER: Send Welcome Email via Resend
// ============================================
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

    console.log("Welcome email sent successfully to:", email);
    return { success: true, messageId: result.id };
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return { success: false, error: error?.message || String(error) };
  }
}

// ============================================
// HELPER: Create Audit Log Entry
// ============================================
async function createAuditLog(
  supabase: any,
  params: {
    userId: string | null;
    action: string;
    resourceType: string;
    resourceId: string;
    tenantId: string;
    metadata: Record<string, any>;
  }
) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      tenant_id: params.tenantId,
      metadata: params.metadata,
    });
    
    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}

// ============================================
// CORS Headers
// ============================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenant_id, email, full_name, phone, role } = await req.json();

    // ========== VALIDATION ==========
    if (!tenant_id || !email || !role) {
      return new Response(
        JSON.stringify({ error: "tenant_id, email e role são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Block admin/master_admin creation via this endpoint
    if (['admin', 'master_admin', 'ops'].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Criação de admin/ops não é permitida por esta função" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate allowed roles
    if (!['mentor', 'mentee'].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Role inválido. Use: mentor ou mentee" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ========== SUPABASE CLIENTS ==========
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ========== AUTHENTICATE CALLER ==========
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação não fornecido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      console.error("create-membership: Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("create-membership: Caller:", caller.id, "creating membership for:", email, "role:", role);

    // ========== CHECK CALLER PERMISSIONS ==========
    const { data: callerMemberships, error: membershipError } = await supabaseAdmin
      .from("memberships")
      .select("id, tenant_id, role")
      .eq("user_id", caller.id)
      .eq("status", "active");

    if (membershipError) {
      console.error("create-membership: Error fetching memberships:", membershipError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isMasterAdmin = callerMemberships?.some(m => m.role === 'master_admin');
    const callerMembershipInTenant = callerMemberships?.find(m => m.tenant_id === tenant_id);
    const isTenantMentor = callerMembershipInTenant?.role === 'mentor';
    const isTenantAdmin = callerMembershipInTenant?.role === 'admin';

    console.log("create-membership: Permissions:", { isMasterAdmin, isTenantMentor, isTenantAdmin });

    // Permission rules:
    // - master_admin: can create mentor/mentee in any tenant
    // - admin: can create mentor/mentee in their tenant
    // - mentor: can create only mentee in their tenant
    // - mentee: cannot create anyone
    
    if (role === 'mentor') {
      if (!isMasterAdmin && !isTenantAdmin) {
        console.log("create-membership: Permission denied - only master_admin/admin can create mentor");
        return new Response(
          JSON.stringify({ error: "Apenas Master Admin ou Admin do tenant pode criar mentores" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else if (role === 'mentee') {
      if (!isMasterAdmin && !isTenantAdmin && !isTenantMentor) {
        console.log("create-membership: Permission denied - caller not authorized");
        return new Response(
          JSON.stringify({ error: "Você não tem permissão para criar mentorados neste programa" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ========== VERIFY TENANT EXISTS ==========
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("create-membership: Tenant not found:", tenantError);
      return new Response(
        JSON.stringify({ error: "Programa não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ========== NORMALIZE EMAIL ==========
    const normalizedEmail = email.toLowerCase().trim();

    // ========== CHECK/CREATE USER VIA ADMIN API ==========
    let targetUserId: string;
    let isNewUser = false;

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name")
      .eq("email", normalizedEmail)
      .single();

    if (existingProfile?.user_id) {
      targetUserId = existingProfile.user_id;
      console.log("create-membership: Found existing user:", targetUserId);

      // Check if user already has membership in this tenant
      const { data: existingMembership } = await supabaseAdmin
        .from("memberships")
        .select("id, role, status")
        .eq("user_id", targetUserId)
        .eq("tenant_id", tenant_id)
        .single();

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          return new Response(
            JSON.stringify({ error: "Este usuário já possui membership ativo neste programa" }),
            { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        // Reactivate inactive membership
        const { data: reactivatedMembership, error: reactivateError } = await supabaseAdmin
          .from("memberships")
          .update({ status: 'active', role: role, updated_at: new Date().toISOString() })
          .eq("id", existingMembership.id)
          .select("id")
          .single();

        if (reactivateError) throw reactivateError;

        console.log("create-membership: Reactivated existing membership:", reactivatedMembership.id);

        // Audit log
        await createAuditLog(supabaseAdmin, {
          userId: caller.id,
          action: "membership_reactivated",
          resourceType: "membership",
          resourceId: reactivatedMembership.id,
          tenantId: tenant_id,
          metadata: {
            target_user_id: targetUserId,
            target_email: normalizedEmail,
            role: role,
            actor_role: isMasterAdmin ? 'master_admin' : (isTenantAdmin ? 'admin' : 'mentor'),
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            membership_id: reactivatedMembership.id,
            status: "reactivated",
            user_id: targetUserId,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      // Create new user via Admin API
      console.log("create-membership: Creating new user via Admin API:", normalizedEmail);

      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: full_name || null,
          phone: phone || null,
        },
      });

      if (createUserError) {
        console.error("create-membership: Error creating user:", createUserError);
        
        // Handle duplicate email error
        if (createUserError.message?.includes('already been registered')) {
          // Try to get user by email from auth
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          const existingAuthUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);
          
          if (existingAuthUser) {
            targetUserId = existingAuthUser.id;
            console.log("create-membership: Found existing auth user:", targetUserId);
          } else {
            return new Response(
              JSON.stringify({ error: "Erro ao criar usuário: " + createUserError.message }),
              { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: "Erro ao criar usuário: " + createUserError.message }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        targetUserId = newUser.user.id;
        isNewUser = true;
        console.log("create-membership: Created new user:", targetUserId);

        // Update profile with name and phone if provided
        if (full_name || phone) {
          await supabaseAdmin
            .from("profiles")
            .update({ 
              full_name: full_name || null, 
              phone: phone || null,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", targetUserId);
        }
      }
    }

    // ========== CREATE MEMBERSHIP ==========
    const { data: membership, error: membershipCreateError } = await supabaseAdmin
      .from("memberships")
      .insert({
        user_id: targetUserId,
        tenant_id: tenant_id,
        role: role,
        status: "active",
        can_impersonate: false,
      })
      .select("id")
      .single();

    if (membershipCreateError) {
      console.error("create-membership: Error creating membership:", membershipCreateError);
      
      // Handle unique constraint violation
      if (membershipCreateError.code === '23505') {
        return new Response(
          JSON.stringify({ error: "Este usuário já possui membership neste programa" }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao criar membership: " + membershipCreateError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("create-membership: Created membership:", membership.id);

    // ========== AUDIT LOG ==========
    await createAuditLog(supabaseAdmin, {
      userId: caller.id,
      action: "membership_created",
      resourceType: "membership",
      resourceId: membership.id,
      tenantId: tenant_id,
      metadata: {
        target_user_id: targetUserId,
        target_email: normalizedEmail,
        target_name: full_name || null,
        role: role,
        is_new_user: isNewUser,
        actor_role: isMasterAdmin ? 'master_admin' : (isTenantAdmin ? 'admin' : 'mentor'),
        actor_membership_id: callerMembershipInTenant?.id || null,
      },
    });

    // ========== SEND WELCOME EMAIL (async, non-blocking) ==========
    const siteUrl = Deno.env.get("SITE_URL") || "https://client-flourish-ai.lovable.app";
    const loginUrl = `${siteUrl}/auth`;

    sendWelcomeEmail({
      email: normalizedEmail,
      fullName: full_name || null,
      role: role,
      tenantName: tenant.name,
      loginUrl: loginUrl,
    }).then((result) => {
      if (result.success) {
        console.log("create-membership: Welcome email sent to:", normalizedEmail);
      } else {
        console.error("create-membership: Failed to send welcome email:", result.error);
      }
    }).catch((err) => {
      console.error("create-membership: Email send error:", err);
    });

    console.log("create-membership: Success - membership created for:", normalizedEmail);

    // ========== RETURN MINIMAL DATA ==========
    return new Response(
      JSON.stringify({
        success: true,
        membership_id: membership.id,
        status: "active",
        user_id: targetUserId,
        is_new_user: isNewUser,
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("create-membership: Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
