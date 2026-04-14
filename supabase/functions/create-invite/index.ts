import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';

// ── White-label branding helper ──
interface TenantBranding { name: string; logoUrl: string | null; primaryColor: string; fromEmail: string; }
const DEFAULT_BRANDING: TenantBranding = { name: "MentorFlow.io", logoUrl: null, primaryColor: "#d4af37", fromEmail: "MentorFlow.io <no-reply@equipe.aceleracaoforti.online>" };

async function getTenantBranding(supabase: any, tenantId: string | null): Promise<TenantBranding> {
  if (!tenantId) return DEFAULT_BRANDING;
  try {
    const { data: tenant } = await supabase.from("tenants").select("name, logo_url, brand_attributes").eq("id", tenantId).maybeSingle();
    if (!tenant) return DEFAULT_BRANDING;
    const attrs = tenant.brand_attributes || {};
    const brandName = tenant.name || DEFAULT_BRANDING.name;
    return { name: brandName, logoUrl: tenant.logo_url || null, primaryColor: attrs.primary_color || "#d4af37", fromEmail: `${brandName} <no-reply@equipe.aceleracaoforti.online>` };
  } catch { return DEFAULT_BRANDING; }
}

// ============================================
// HELPER: Send Invite Email via Resend
// ============================================
async function sendInviteEmail(params: {
  email: string;
  fullName: string | null;
  role: string;
  tenantName: string;
  loginUrl: string;
  branding: TenantBranding;
}) {
  if (!RESEND_API_KEY) {
    console.warn("create-invite: RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const { email, fullName, role, tenantName, loginUrl, branding } = params;
  const displayName = fullName || email.split('@')[0];
  
  const roleLabel = role === 'mentor' ? 'Mentor' : 
                    role === 'mentee' ? 'Mentorado' : 
                    role === 'admin' ? 'Administrador' : 
                    role === 'ops' ? 'Operador' : role;

  const logoSection = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height: 48px; max-width: 200px;" />`
    : `<div class="logo">${branding.name}</div>`;

  const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background-color: #f4f4f8; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .header { text-align: center; margin-bottom: 30px; }
  .logo { font-size: 28px; font-weight: 700; color: #1a1a2e; }
  h1 { color: #1a1a2e; font-size: 24px; margin-bottom: 20px; }
  .steps { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .steps h3 { margin-top: 0; color: #1a1a2e; font-size: 16px; }
  .steps ol { margin: 0; padding-left: 20px; }
  .steps li { margin-bottom: 10px; }
  .highlight { background: ${branding.primaryColor}; color: #0a0a0b; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .info-box { border-left: 4px solid ${branding.primaryColor}; padding: 15px; background: #fdf9e8; margin: 20px 0; }
  .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px; }
</style></head><body>
  <div class="container"><div class="card">
    <div class="header">${logoSection}</div>
    <h1>Olá ${displayName},</h1>
    <p>Você foi convidado(a) para acessar a plataforma <strong>${tenantName}</strong>!</p>
    <div class="steps">
      <h3>📋 Como acessar</h3>
      <ol>
        <li>Acesse a plataforma: <a href="${loginUrl}">${loginUrl}</a></li>
        <li>Na tela de login, informe este email: <span class="highlight">${email}</span></li>
        <li>Você receberá um código de acesso por email</li>
        <li>Digite o código e pronto!</li>
      </ol>
    </div>
    <div class="info-box">
      <p style="margin: 0;"><strong>Seu perfil de acesso:</strong></p>
      <p style="margin: 5px 0;">• Papel: <strong>${roleLabel}</strong></p>
      <p style="margin: 5px 0;">• Programa: <strong>${tenantName}</strong></p>
    </div>
    <p><strong>Importante:</strong> Não responda este email com informações pessoais ou senhas.</p>
    <p>Seja bem-vindo(a)!</p>
    <div class="footer">
      <p>Com carinho,<br><strong>Equipe ${branding.name}</strong></p>
      <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} ${branding.name}. Todos os direitos reservados.</p>
    </div>
  </div></div>
</body></html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: branding.fromEmail,
        to: [email],
        subject: `Bem-vindo ao ${tenantName} | Seu convite de acesso`,
        html: htmlBody,
      }),
    });
    const result = await response.json();
    if (!response.ok) { console.error("create-invite: Resend API error:", result); return { success: false, error: result }; }
    console.log("create-invite: Invite email sent successfully to:", email);
    return { success: true, messageId: result.id };
  } catch (error: any) {
    console.error("create-invite: Error sending email:", error);
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
    await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      tenant_id: params.tenantId,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error("create-invite: Audit log error:", err);
  }
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  const corsHeaders = {
    ...getCorsHeaders(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const tenant_id = typeof body.tenant_id === 'string' ? body.tenant_id.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 200) : null;
    const phone = typeof body.phone === 'string' ? body.phone.replace(/[^\d+() -]/g, '').slice(0, 30) : null;
    const role = typeof body.role === 'string' ? body.role.trim() : '';

    // ========== VALIDATION ==========
    if (!tenant_id || !email || !role) {
      return new Response(
        JSON.stringify({ error: "tenant_id, email e role são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Email muito longo" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
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
      console.error("create-invite: Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("create-invite: Caller:", caller.id, "creating invite for:", email, "role:", role);

    // ========== CHECK CALLER PERMISSIONS ==========
    const { data: callerMemberships, error: membershipError } = await supabaseAdmin
      .from("memberships")
      .select("id, tenant_id, role")
      .eq("user_id", caller.id)
      .eq("status", "active");

    if (membershipError) {
      console.error("create-invite: Error fetching memberships:", membershipError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isMasterAdmin = callerMemberships?.some(m => m.role === 'master_admin');
    const callerMembershipInTenant = callerMemberships?.find(m => m.tenant_id === tenant_id);
    const isTenantMentor = callerMembershipInTenant?.role === 'mentor';
    const isTenantAdmin = callerMembershipInTenant?.role === 'admin';

    console.log("create-invite: Permissions:", { isMasterAdmin, isTenantMentor, isTenantAdmin });

    // Permission rules:
    // - master_admin: can invite mentor/mentee in any tenant
    // - admin: can invite mentor/mentee in their tenant
    // - mentor: can invite only mentee in their tenant
    // - mentee: cannot invite anyone
    
    if (role === 'mentor') {
      if (!isMasterAdmin && !isTenantAdmin) {
        console.log("create-invite: Permission denied - only master_admin/admin can invite mentor");
        return new Response(
          JSON.stringify({ error: "Apenas Master Admin ou Admin do tenant pode convidar mentores" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else if (role === 'mentee') {
      if (!isMasterAdmin && !isTenantAdmin && !isTenantMentor) {
        console.log("create-invite: Permission denied - caller not authorized");
        return new Response(
          JSON.stringify({ error: "Você não tem permissão para convidar mentorados neste programa" }),
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
      console.error("create-invite: Tenant not found:", tenantError);
      return new Response(
        JSON.stringify({ error: "Programa não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ========== NORMALIZE EMAIL ==========
    const normalizedEmail = email.toLowerCase().trim();

    // ========== CHECK FOR EXISTING MEMBERSHIP ==========
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", normalizedEmail)
      .single();

    if (existingProfile?.user_id) {
      const { data: existingMembership } = await supabaseAdmin
        .from("memberships")
        .select("id, role, status")
        .eq("user_id", existingProfile.user_id)
        .eq("tenant_id", tenant_id)
        .single();

      if (existingMembership?.status === 'active') {
        return new Response(
          JSON.stringify({ error: "Este usuário já possui acesso ativo neste programa" }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ========== CHECK FOR EXISTING PENDING INVITE ==========
    const { data: existingInvite } = await supabaseAdmin
      .from("invites")
      .select("id, status, expires_at")
      .eq("email", normalizedEmail)
      .eq("tenant_id", tenant_id)
      .eq("role", role)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      // Check if expired
      const expiresAt = new Date(existingInvite.expires_at);
      if (expiresAt > new Date()) {
        return new Response(
          JSON.stringify({ error: "Já existe um convite pendente para este email neste programa" }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      // Expired invite - revoke it
      await supabaseAdmin
        .from("invites")
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq("id", existingInvite.id);
    }

    // ========== CREATE INVITE ==========
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invites")
      .insert({
        email: normalizedEmail,
        tenant_id: tenant_id,
        role: role,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_by_membership_id: callerMembershipInTenant?.id || null,
        metadata: {
          full_name: full_name || null,
          phone: phone || null,
        },
      })
      .select("id")
      .single();

    if (inviteError) {
      console.error("create-invite: Error creating invite:", inviteError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite: " + inviteError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("create-invite: Invite created:", invite.id);

    // ========== AUDIT LOG ==========
    await createAuditLog(supabaseAdmin, {
      userId: caller.id,
      action: "invite_created",
      resourceType: "invite",
      resourceId: invite.id,
      tenantId: tenant_id,
      metadata: {
        target_email: normalizedEmail,
        target_name: full_name || null,
        role: role,
        actor_role: isMasterAdmin ? 'master_admin' : (isTenantAdmin ? 'admin' : 'mentor'),
        expires_at: expiresAt.toISOString(),
      },
    });

    // ========== SEND EMAIL (skip for sandbox) ==========
    let emailSent = false;
    
    if (tenant_id !== SANDBOX_TENANT_ID) {
      const siteUrl = Deno.env.get("SITE_URL") || "https://bymentorflow.com.br";
      const loginUrl = `${siteUrl}/auth`;

      const branding = await getTenantBranding(supabaseAdmin, tenant_id);

      const emailResult = await sendInviteEmail({
        email: normalizedEmail,
        fullName: full_name || null,
        role: role,
        tenantName: tenant.name,
        loginUrl: loginUrl,
        branding,
      });

      emailSent = emailResult.success;
      
      if (!emailResult.success) {
        console.warn("create-invite: Email not sent:", emailResult.error);
      }
    } else {
      console.log("create-invite: Skipping email for sandbox tenant");
    }

    console.log("create-invite: Success - invite created for:", normalizedEmail);

    return new Response(
      JSON.stringify({
        success: true,
        invite_id: invite.id,
        status: "pending",
        email_sent: emailSent,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("create-invite: Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
