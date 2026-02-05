import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
