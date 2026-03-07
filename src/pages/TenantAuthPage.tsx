import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTenant, MembershipRole } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2, KeyRound, ArrowRight, ClipboardPaste, MessageCircle } from "lucide-react";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

const emailSchema = z.string().email("Email inválido");

type AuthStep = "email" | "code";

export default function TenantAuthPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { activeMembership, isLoading: tenantLoading, refreshMembershipsAndWait } = useTenant();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const [countdown, setCountdown] = useState(0);
  const isSubmittingRef = useRef(false);

  // Fetch tenant by slug
  const { data: tenant, isLoading: tenantDataLoading } = useQuery({
    queryKey: ["tenant-auth", tenantSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, secondary_color, settings")
        .eq("slug", tenantSlug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantSlug,
  });

  // Apply tenant branding to CSS vars
  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;
    if (tenant.primary_color) {
      // Convert hex to HSL-ish for CSS variable if needed
      root.style.setProperty("--tenant-primary", tenant.primary_color);
    }
    return () => {
      root.style.removeProperty("--tenant-primary");
    };
  }, [tenant]);

  const getTargetPath = (role: MembershipRole): string => {
    switch (role) {
      case "master_admin": return "/master";
      case "admin": case "ops": case "mentor": return "/mentor";
      case "mentee": return "/mentorado";
      default: return "/mentorado";
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && !tenantLoading && user && activeMembership && step === "email") {
      navigate(getTargetPath(activeMembership.role), { replace: true });
    }
  }, [user, activeMembership, authLoading, tenantLoading, navigate, step]);

  // Countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const bootstrapAfterAuth = async (redirectHint?: string) => {
    let session = null;
    let attempts = 0;
    while (!session && attempts < 10) {
      const { data } = await supabase.auth.getSession();
      session = data.session;
      if (!session) { await new Promise(r => setTimeout(r, 200)); attempts++; }
    }
    if (!session?.user) {
      toast({ title: "Erro de sessão", description: "Não foi possível estabelecer a sessão.", variant: "destructive" });
      return;
    }
    try {
      const { data: bootstrap, error } = await supabase.functions.invoke("get-bootstrap");
      if (error) throw error;
      if (!bootstrap.has_memberships) {
        toast({ title: "Acesso pendente", description: "Seu acesso está sendo configurado.", variant: "destructive" });
        return;
      }
      const targetPath = redirectHint || bootstrap.redirect_path || "/mentorado";
      await new Promise(r => setTimeout(r, 500));
      await refreshMembershipsAndWait();
      await new Promise(r => setTimeout(r, 100));
      navigate(targetPath, { replace: true });
    } catch {
      toast({ title: "Erro ao carregar perfil", description: "Tente fazer login novamente.", variant: "destructive" });
    }
  };

  const validateEmail = () => {
    try { emailSchema.parse(email); setErrors({}); return true; }
    catch (e) { if (e instanceof z.ZodError) setErrors({ email: e.errors[0].message }); return false; }
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateEmail()) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email, tenant_hint: tenant?.id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({ title: "Código enviado!", description: "Verifique seu email e digite o código recebido." });
      setStep("code");
      setCountdown(60);
    } catch (error: any) {
      const msg = error.message?.includes("não configurado") || error.message?.includes("convidado")
        ? "Você precisa ser convidado para acessar este programa."
        : error.message || "Tente novamente";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent, codeToVerify?: string) => {
    e?.preventDefault();
    const finalCode = (codeToVerify || code).trim();
    if (finalCode.length !== 6) { setErrors({ code: "Digite os 6 dígitos" }); return; }
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email, code: finalCode, tenant_id: tenant?.id },
      });
      if (error) throw { message: "Erro de conexão.", error_type: "internal" };
      if (data.error) throw { message: data.error, error_type: data.error_type || "otp_invalid" };
      if (data.tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.tokenHash, type: "magiclink" });
        if (verifyError) throw { message: "Erro ao estabelecer sessão.", error_type: "internal" };
        toast({ title: data.isNewUser ? "Conta criada!" : "Bem-vindo de volta!", description: data.isNewUser ? "Sua conta foi criada." : "Login realizado." });
        await bootstrapAfterAuth(data.redirect_path);
      }
    } catch (error: any) {
      const msg = error.message || "Verifique o código";
      if (error.error_type === "otp_invalid" || error.error_type === "otp_expired") {
        setErrors({ code: msg });
      }
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6 && !isSubmittingRef.current) handleVerifyCode(undefined, value);
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (digits.length > 0) { setCode(digits); if (digits.length === 6) handleVerifyCode(undefined, digits); }
    } catch { toast({ title: "Não foi possível colar", description: "Digite o código manualmente.", variant: "destructive" }); }
  };

  // Loading states
  if (tenantDataLoading || authLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center theme-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Tenant not found
  if (!tenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center theme-light">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-display font-bold text-foreground">Programa não encontrado</h1>
          <p className="text-muted-foreground">O link que você acessou não corresponde a nenhum programa ativo.</p>
          <Link to="/auth">
            <Button variant="outline">Ir para login padrão</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tenantColor = tenant.primary_color || "hsl(160 84% 39%)";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden theme-light">
      {/* Branded background */}
      <div
        className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: tenantColor }}
      />
      <div
        className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-5 pointer-events-none"
        style={{ background: tenantColor }}
      />

      <div className="w-full max-w-md relative">
        <Card className="bg-card border-border">
          <CardHeader className="text-center pb-2">
            {/* Tenant logo/branding */}
            <div className="flex justify-center mb-4">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.name} className="h-16 w-16 object-contain rounded-xl" />
              ) : (
                <div
                  className="h-16 w-16 rounded-xl flex items-center justify-center font-display font-bold text-2xl text-white"
                  style={{ backgroundColor: tenantColor }}
                >
                  {tenant.name.charAt(0)}
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">{tenant.name}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === "email" ? "Digite seu email para acessar o programa" : "Digite o código enviado para seu email"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "email" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10 bg-secondary border-border"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full text-white hover:opacity-90"
                  style={{ background: tenantColor }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <>Enviar código <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setCode(""); setErrors({}); }}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar
                </button>

                <div className="space-y-3">
                  <Label className="text-foreground flex items-center gap-2">
                    <KeyRound className="w-4 h-4" style={{ color: tenantColor }} />
                    Código de acesso
                  </Label>

                  <div className="flex flex-col items-center gap-4">
                    <InputOTP maxLength={6} value={code} onChange={handleCodeChange} className="justify-center">
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="bg-secondary border-border w-12 h-14 text-xl" />
                        <InputOTPSlot index={1} className="bg-secondary border-border w-12 h-14 text-xl" />
                        <InputOTPSlot index={2} className="bg-secondary border-border w-12 h-14 text-xl" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="bg-secondary border-border w-12 h-14 text-xl" />
                        <InputOTPSlot index={4} className="bg-secondary border-border w-12 h-14 text-xl" />
                        <InputOTPSlot index={5} className="bg-secondary border-border w-12 h-14 text-xl" />
                      </InputOTPGroup>
                    </InputOTP>

                    <Button type="button" variant="outline" size="sm" onClick={handlePasteCode} className="gap-2">
                      <ClipboardPaste className="w-4 h-4" /> Colar código
                    </Button>
                  </div>

                  {errors.code && <p className="text-sm text-destructive text-center">{errors.code}</p>}
                  <p className="text-xs text-muted-foreground text-center">
                    Enviado para <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white hover:opacity-90"
                  style={{ background: tenantColor }}
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</> : "Verificar código"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => countdown === 0 && handleSendCode()}
                    disabled={countdown > 0}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar código"}
                  </button>
                </div>
              </form>
            )}

            <p className="text-xs text-center text-muted-foreground mt-6">
              Ao continuar, você concorda com nossos{" "}
              <a href="#" className="hover:underline" style={{ color: tenantColor }}>Termos de Uso</a>
              {" "}e{" "}
              <a href="#" className="hover:underline" style={{ color: tenantColor }}>Política de Privacidade</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
