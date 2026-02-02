import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Mail, User, ArrowLeft, Loader2, KeyRound, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

const emailSchema = z.string().email("Email inválido");

type AuthStep = "email" | "code" | "name";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; code?: string; fullName?: string }>({});
  const [countdown, setCountdown] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, isLoading: authLoading } = useAuth();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redirect based on role when user is authenticated
  useEffect(() => {
    if (!authLoading && user) {
      if (role === 'mentor') {
        navigate('/admin');
      } else if (role === 'mentorado') {
        navigate('/app');
      }
    }
  }, [user, role, authLoading, navigate]);

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

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateEmail()) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Código enviado!",
        description: "Verifique seu email e digite o código recebido.",
      });
      
      setStep("code");
      setCountdown(60);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar código",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const fullCode = `LBV-${code}`;
    
    if (code.length !== 8) {
      setErrors({ code: "Digite os 8 números do código" });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email, code: fullCode },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.needsName) {
        // New user needs to provide name
        setStep("name");
        setIsLoading(false);
        return;
      }

      if (data.tokenHash) {
        // Verify the token hash with Supabase
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: data.email,
          token_hash: data.tokenHash,
          type: "email",
        });

        if (verifyError) {
          console.error("Token verification error:", verifyError);
          throw new Error("Erro ao autenticar. Tente novamente.");
        }

        toast({
          title: data.isNewUser ? "Conta criada!" : "Bem-vindo de volta!",
          description: data.isNewUser ? "Sua conta foi criada com sucesso." : "Login realizado com sucesso.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Código inválido",
        description: error.message || "Verifique o código e tente novamente",
        variant: "destructive",
      });
      setErrors({ code: "Código inválido ou expirado" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!fullName.trim()) {
      setErrors({ fullName: "Nome é obrigatório" });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const fullCode = `LBV-${code}`;
      
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email, code: fullCode, fullName },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: data.email,
          token_hash: data.tokenHash,
          type: "email",
        });

        if (verifyError) {
          throw new Error("Erro ao autenticar. Tente novamente.");
        }

        toast({
          title: "Conta criada!",
          description: "Bem-vindo ao LBV TECH!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    } else if (step === "name") {
      setStep("code");
      setErrors({});
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
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
              <div className="w-14 h-14 rounded-xl gradient-gold flex items-center justify-center glow-gold">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">MentorHub Pro</CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === "email" && "Digite seu email para receber o código de acesso"}
              {step === "code" && "Digite o código enviado para seu email"}
              {step === "name" && "Complete seu cadastro"}
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
                    <div className="text-lg font-mono text-primary font-semibold">LBV-</div>
                    <InputOTP
                      maxLength={8}
                      value={code}
                      onChange={(value) => setCode(value)}
                      className="justify-center"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="bg-secondary border-border" />
                        <InputOTPSlot index={1} className="bg-secondary border-border" />
                        <InputOTPSlot index={2} className="bg-secondary border-border" />
                        <InputOTPSlot index={3} className="bg-secondary border-border" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={4} className="bg-secondary border-border" />
                        <InputOTPSlot index={5} className="bg-secondary border-border" />
                        <InputOTPSlot index={6} className="bg-secondary border-border" />
                        <InputOTPSlot index={7} className="bg-secondary border-border" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  
                  {errors.code && <p className="text-sm text-destructive text-center">{errors.code}</p>}
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Enviado para <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-gold text-primary-foreground hover:opacity-90"
                  disabled={isLoading || code.length !== 8}
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

            {/* Step: Name (new user) */}
            {step === "name" && (
              <form onSubmit={handleCreateAccount} className="space-y-4">
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
                    🎉 Parece que você é novo por aqui!<br />
                    Complete seu cadastro abaixo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      className="pl-10 bg-secondary border-border"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-gold text-primary-foreground hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar minha conta"
                  )}
                </Button>
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
