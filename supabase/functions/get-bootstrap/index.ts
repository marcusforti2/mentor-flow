import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Role priority order (highest privilege first)
const ROLE_PRIORITY: Record<string, number> = {
  'master_admin': 0,
  'admin': 1,
  'ops': 2,
  'mentor': 3,
  'mentee': 4,
};

// Helper to get redirect path by role
function getRedirectPath(role: string): string {
  switch (role) {
    case 'master_admin':
      return '/master';
    case 'admin':
    case 'ops':
    case 'mentor':
      return '/mentor';
    case 'mentee':
      return '/mentorado';
    default:
      return '/mentorado';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== AUTHENTICATE USER ==========
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação não fornecido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("get-bootstrap: Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("get-bootstrap: User authenticated:", user.id, user.email);

    // ========== GET USER'S MEMBERSHIPS ==========
    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select(`
        id,
        tenant_id,
        role,
        status,
        can_impersonate,
        tenants (
          id,
          name,
          slug
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active");

    if (membershipError) {
      console.error("get-bootstrap: Error fetching memberships:", membershipError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar memberships" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("get-bootstrap: Found memberships:", memberships?.length || 0);

    // ========== GET USER PROFILE ==========
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, phone")
      .eq("user_id", user.id)
      .single();

    // ========== DETERMINE PRIMARY MEMBERSHIP ==========
    let activeMembership = null;
    let redirectPath = '/mentorado';

    if (memberships && memberships.length > 0) {
      // Sort by role priority (highest privilege first)
      const sortedMemberships = [...memberships].sort((a, b) => {
        const priorityA = ROLE_PRIORITY[a.role] ?? 999;
        const priorityB = ROLE_PRIORITY[b.role] ?? 999;
        return priorityA - priorityB;
      });

      activeMembership = sortedMemberships[0];
      redirectPath = getRedirectPath(activeMembership.role);
      
      console.log("get-bootstrap: Primary membership:", activeMembership.role, "redirect:", redirectPath);
    }

    // ========== FORMAT RESPONSE ==========
    const formattedMemberships = memberships?.map(m => ({
      id: m.id,
      tenant_id: m.tenant_id,
      tenant_name: (m.tenants as any)?.name || 'Unknown',
      tenant_slug: (m.tenants as any)?.slug || 'unknown',
      role: m.role,
      status: m.status,
      can_impersonate: m.can_impersonate,
    })) || [];

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || user.user_metadata?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          phone: profile?.phone || null,
        },
        memberships: formattedMemberships,
        active_membership: activeMembership ? {
          id: activeMembership.id,
          tenant_id: activeMembership.tenant_id,
          tenant_name: (activeMembership.tenants as any)?.name || 'Unknown',
          tenant_slug: (activeMembership.tenants as any)?.slug || 'unknown',
          role: activeMembership.role,
          can_impersonate: activeMembership.can_impersonate,
        } : null,
        redirect_path: redirectPath,
        has_memberships: formattedMemberships.length > 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("get-bootstrap: Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
