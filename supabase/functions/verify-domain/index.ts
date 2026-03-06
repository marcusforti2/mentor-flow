import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_IP = "185.158.133.1";

async function checkDNS(domain: string): Promise<{ resolved: boolean; ip: string | null; error?: string }> {
  try {
    // Use DNS-over-HTTPS (Cloudflare) to check A records
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!res.ok) throw new Error(`DNS query failed: ${res.status}`);
    const data = await res.json();

    const aRecords = (data.Answer || []).filter((r: any) => r.type === 1);
    if (aRecords.length === 0) {
      return { resolved: false, ip: null, error: "Nenhum registro A encontrado" };
    }

    const matchingRecord = aRecords.find((r: any) => r.data === LOVABLE_IP);
    return {
      resolved: !!matchingRecord,
      ip: aRecords[0].data,
      error: matchingRecord ? undefined : `A record aponta para ${aRecords[0].data} ao invés de ${LOVABLE_IP}`,
    };
  } catch (err: any) {
    return { resolved: false, ip: null, error: err.message };
  }
}

async function checkTXT(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=_lovable.${encodeURIComponent(domain)}&type=TXT`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const txtRecords = (data.Answer || []).filter((r: any) => r.type === 16);
    return txtRecords.some((r: any) => {
      const val = (r.data || "").replace(/"/g, "").trim();
      return val.includes(expectedToken);
    });
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate caller is master_admin
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Não autenticado");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Não autenticado");

    const { data: isMaster } = await supabase.rpc("is_master_admin", { _user_id: user.id });
    if (!isMaster) throw new Error("Apenas master_admin pode verificar domínios");

    const { domain_id, action } = await req.json();

    if (action === "verify" && domain_id) {
      // Fetch domain record
      const { data: domainRecord, error: fetchErr } = await supabase
        .from("tenant_domains")
        .select("*")
        .eq("id", domain_id)
        .single();

      if (fetchErr || !domainRecord) throw new Error("Domínio não encontrado");

      const domain = domainRecord.domain;

      // Check DNS A record
      const dnsResult = await checkDNS(domain);
      // Check TXT verification
      const txtVerified = await checkTXT(domain, domainRecord.verification_token);

      let newStatus = domainRecord.status;
      let dnsVerified = dnsResult.resolved;

      if (dnsResult.resolved && txtVerified) {
        newStatus = "active";
        dnsVerified = true;
      } else if (dnsResult.resolved && !txtVerified) {
        newStatus = "verifying";
        dnsVerified = true;
      } else {
        newStatus = domainRecord.status === "active" ? "offline" : "pending";
      }

      // Also check www subdomain
      const wwwResult = await checkDNS(`www.${domain}`);

      // Update record
      const { error: updateErr } = await supabase
        .from("tenant_domains")
        .update({
          status: newStatus,
          dns_verified: dnsVerified,
          ssl_active: newStatus === "active",
          last_check_at: new Date().toISOString(),
          error_message: dnsResult.error || null,
        })
        .eq("id", domain_id);

      if (updateErr) throw updateErr;

      // Also update tenant custom_domain if active and primary
      if (newStatus === "active" && domainRecord.is_primary) {
        await supabase
          .from("tenants")
          .update({ custom_domain: domain })
          .eq("id", domainRecord.tenant_id);
      }

      return new Response(
        JSON.stringify({
          domain,
          status: newStatus,
          dns_verified: dnsVerified,
          txt_verified: txtVerified,
          a_record_ip: dnsResult.ip,
          www_resolved: wwwResult.resolved,
          www_ip: wwwResult.ip,
          error: dnsResult.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify all domains for a tenant
    if (action === "verify_all") {
      const { tenant_id } = await req.json().catch(() => ({}));
      const query = supabase.from("tenant_domains").select("id, domain");
      if (tenant_id) query.eq("tenant_id", tenant_id);
      const { data: domains } = await query;

      const results = [];
      for (const d of domains || []) {
        const dns = await checkDNS(d.domain);
        results.push({ id: d.id, domain: d.domain, resolved: dns.resolved, ip: dns.ip });
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Ação inválida. Use action: 'verify' ou 'verify_all'");
  } catch (error: any) {
    console.error("verify-domain error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
