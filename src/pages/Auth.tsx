import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant, MembershipRole } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2, KeyRound, ArrowRight, ClipboardPaste, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { BrandLogo } from "@/components/BrandLogo";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const emailSchema = z.string().email("Email inválido");

type AuthStep = "email" | "code" | "selectTenant";

interface TenantOption {
  id: string;
  name: string;
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const [countdown, setCountdown] = useState(0);
  
  // Multi-tenant selection state
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { activeMembership, isLoading: tenantLoading, refreshMembershipsAndWait } = useTenant();

  // Helper to get target path by role
  const getTargetPath = (role: MembershipRole): string => {
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
  };

  // Bootstrap function: Use get-bootstrap Edge Function for reliable post-auth
  const bootstrapAfterAuth = async (redirectHint?: string) => {
    console.log('[Auth] Starting bootstrap after OTP verification...');
    
    // Wait for Supabase auth state to fully propagate
    // This is critical because onAuthStateChange may not have fired yet
    let session = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!session && attempts < maxAttempts) {
      const { data } = await supabase.auth.getSession();
      session = data.session;
      if (!session) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
    }
    
    console.log('[Auth] Session check:', { hasSession: !!session, userId: session?.user?.id, attempts });
    
    if (!session?.user) {
      console.error('[Auth] No session after verification');
      toast({
        title: "Erro de sessão",
        description: "Não foi possível estabelecer a sessão. Tente novamente.",
        variant: "destructive",
      });
      return;
    }
    
    // Call get-bootstrap for reliable membership resolution
    try {
      const { data: bootstrap, error: bootstrapError } = await supabase.functions.invoke('get-bootstrap');
      
      if (bootstrapError) {
        console.error('[Auth] Bootstrap error:', bootstrapError);
        throw bootstrapError;
      }
      
      console.log('[Auth] Bootstrap result:', { 
        hasMemberships: bootstrap.has_memberships,
        redirectPath: bootstrap.redirect_path,
        role: bootstrap.active_membership?.role
      });
      
      if (!bootstrap.has_memberships) {
        console.warn('[Auth] No memberships found, user may need to wait for invite acceptance');
        toast({
          title: "Acesso pendente",
          description: "Sua conta foi autenticada, mas o acesso ainda está sendo configurado. Tente novamente em alguns segundos.",
          variant: "destructive",
        });
        return;
      }
      
      // Use redirect hint from verify-otp if available, otherwise use bootstrap result
      const targetPath = redirectHint || bootstrap.redirect_path || '/mentorado';
      console.log('[Auth] Redirecting to:', targetPath);
      
      // Wait for TenantContext to pick up the new session via onAuthStateChange
      // This ensures activeMembership is populated before navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force refresh memberships in context to ensure it has latest data
      await refreshMembershipsAndWait();
      
      // Small additional delay for React state to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      navigate(targetPath, { replace: true });
    } catch (err) {
      console.error('[Auth] Bootstrap failed:', err);
      toast({
        title: "Erro ao carregar perfil",
        description: "Não foi possível carregar suas permissões. Tente fazer login novamente.",
        variant: "destructive",
      });
    }
  };

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redirect based on role when user is authenticated
  useEffect(() => {
    if (!authLoading && !tenantLoading && user && activeMembership && step === 'email') {
      console.log('[Auth] Auto-redirecting logged-in user:', activeMembership.role);
      const targetPath = getTargetPath(activeMembership.role);
      navigate(targetPath, { replace: true });
    }
  }, [user, activeMembership, authLoading, tenantLoading, navigate, step]);

  const validateEmail = () => {
    try {
      emailSchema.parse(email);
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors({ email: e.errors[0].message });
      }
      return false;
    }
  };

  const handleSendCode = async (e?: React.FormEvent, tenantHint?: string) => {
    e?.preventDefault();
    if (!validateEmail()) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email, tenant_hint: tenantHint || selectedTenantId || undefined },
      });

      if (error) throw error;
      
      // Handle multiple tenants case (409)
      if (data.error === 'multiple_tenants' && data.tenants) {
        console.log('[Auth] Multiple tenants found:', data.tenants);
        setAvailableTenants(data.tenants);
        setStep("selectTenant");
        setIsLoading(false);
        return;
      }
      
      if (data.error) throw new Error(data.error);

      toast({
        title: "Código enviado!",
        description: "Verifique seu email e digite o código recebido.",
      });
      
      setStep("code");
      setCountdown(60);
    } catch (error: any) {
      // Handle 403 (not invited)
      if (error.message?.includes('não configurado') || error.message?.includes('convidado')) {
        toast({
          title: "Acesso restrito",
          description: "Você precisa ser convidado para acessar a plataforma. Entre em contato com o administrador.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao enviar código",
          description: error.message || "Tente novamente",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      toast({
        title: "Selecione um programa",
        description: "Escolha o programa que deseja acessar",
        variant: "destructive",
      });
      return;
    }
    
    // Resend OTP with tenant hint
    await handleSendCode(undefined, selectedTenantId);
  };

  const isSubmittingRef = useRef(false);

  const handleVerifyCode = async (e?: React.FormEvent, codeToVerify?: string) => {
    e?.preventDefault();
    
    const finalCode = (codeToVerify || code).trim();
    
    if (finalCode.length !== 6) {
      setErrors({ code: "Digite os 6 dígitos do código" });
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { 
          email, 
          code: finalCode,
          tenant_id: selectedTenantId || undefined,
        },
      });

      // Handle Edge Function HTTP errors
      if (error) {
        console.error("[Auth] Edge function error:", error);
        throw { message: "Erro de conexão. Tente novamente.", error_type: 'internal' };
      }
      
      // Handle application-level errors with error_type
      if (data.error) {
        const errorType = data.error_type || 'otp_invalid';
        throw { message: data.error, error_type: errorType };
      }

      if (data.tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: "magiclink",
        });

        if (verifyError) {
          console.error("[Auth] verifyOtp error:", verifyError);
          throw { message: "Erro ao estabelecer sessão. Tente novamente.", error_type: 'internal' };
        }

        // Show warning if membership is missing but login succeeded
        if (data.membership_missing) {
          toast({
            title: "Aviso",
            description: "Sua conta foi autenticada, mas o perfil ainda está sendo configurado.",
          });
        } else {
          toast({
            title: data.isNewUser ? "Conta criada!" : "Bem-vindo de volta!",
            description: data.isNewUser ? "Sua conta foi criada com sucesso." : "Login realizado com sucesso.",
          });
        }

        // Pass redirect hint from verify-otp response
        await bootstrapAfterAuth(data.redirect_path);
      }
    } catch (error: any) {
      const errorType = error.error_type || 'otp_invalid';
      const message = error.message || "Verifique o código e tente novamente";
      
      // Different UI feedback based on error type
      if (errorType === 'otp_invalid' || errorType === 'otp_expired') {
        setErrors({ code: message });
        toast({
          title: "Código inválido",
          description: message,
          variant: "destructive",
        });
      } else if (errorType === 'no_invite') {
        setErrors({});
        toast({
          title: "Acesso restrito",
          description: message,
          variant: "destructive",
        });
      } else {
        // Internal error - don't blame the code
        setErrors({});
        toast({
          title: "Erro interno",
          description: message + " Seu código pode estar correto.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Auto-submit when code reaches 6 digits
  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6 && !isSubmittingRef.current) {
      handleVerifyCode(undefined, value);
    }
  };

  // Paste from clipboard
  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6);
      if (digits.length > 0) {
        setCode(digits);
        if (digits.length === 6) {
          handleVerifyCode(undefined, digits);
        }
      }
    } catch (err) {
      toast({
        title: "Não foi possível colar",
        description: "Permita o acesso à área de transferência ou digite o código manualmente.",
        variant: "destructive",
      });
    }
  };

  const handleResendCode = () => {
    if (countdown === 0) {
      handleSendCode();
    }
  };

  const handleBack = () => {
    if (step === "code") {
      setStep("email");
      setCode("");
      setErrors({});
    } else if (step === "selectTenant") {
      setStep("email");
      setSelectedTenantId("");
      setAvailableTenants([]);
    }
  };

  // Show loading while checking auth
  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center theme-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden theme-light">
      {/* Background effects */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md relative">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o início
        </Link>

        <Card className="bg-card border-border">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <BrandLogo variant="compact" size="lg" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">MentorFlow.io</CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === "email" && "Digite seu email para receber o código de acesso"}
              {step === "code" && "Digite o código enviado para seu email"}
              {step === "selectTenant" && "Selecione o programa que deseja acessar"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Step: Email */}
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
                  className="w-full gradient-gold text-primary-foreground hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar código
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Step: Select Tenant (for multiple invites) */}
            {step === "selectTenant" && (
              <form onSubmit={handleSelectTenant} className="space-y-6">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar
                </button>

                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center mb-4">
                  <p className="text-sm text-foreground">
                    Você tem acesso a múltiplos programas.<br />
                    Selecione qual deseja acessar agora.
                  </p>
                </div>

                <RadioGroup
                  value={selectedTenantId}
                  onValueChange={setSelectedTenantId}
                  className="space-y-3"
                >
                  {availableTenants.map((tenant) => (
                    <div key={tenant.id}>
                      <RadioGroupItem
                        value={tenant.id}
                        id={tenant.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={tenant.id}
                        className="flex items-center gap-3 rounded-lg border-2 border-border bg-secondary p-4 hover:bg-secondary/80 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
                      >
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="font-medium">{tenant.name}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-gold text-primary-foreground hover:opacity-90"
                  disabled={isLoading || !selectedTenantId}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando código...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Step: Code */}
            {step === "code" && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar
                </button>

                <div className="space-y-3">
                  <Label className="text-foreground flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    Código de acesso
                  </Label>
                  
                  <div className="flex flex-col items-center gap-4">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={handleCodeChange}
                      className="justify-center"
                    >
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
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePasteCode}
                      className="gap-2"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                      Colar código
                    </Button>
                  </div>
                  
                  {errors.code && <p className="text-sm text-destructive text-center">{errors.code}</p>}
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Enviado para <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-gold text-primary-foreground hover:opacity-90"
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar código"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {countdown > 0 
                      ? `Reenviar código em ${countdown}s`
                      : "Reenviar código"
                    }
                  </button>
                </div>
              </form>
            )}
            
            <p className="text-xs text-center text-muted-foreground mt-6">
              Ao continuar, você concorda com nossos{" "}
              <a href="#" className="text-primary hover:underline">Termos de Uso</a>
              {" "}e{" "}
              <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
