import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Crown, Mail, Lock, User, Loader2, Sparkles, Shield } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

const Setup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingMentor, setCheckingMentor] = useState(true);
  const [hasMentor, setHasMentor] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; businessName?: string }>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, signUp, assignRole } = useAuth();

  // Check if mentor already exists
  useEffect(() => {
    const checkForMentor = async () => {
      const { data, error } = await supabase.rpc('is_first_mentor');
      
      if (error) {
        console.error('Error checking for mentor:', error);
        toast({
          title: "Erro",
          description: "Não foi possível verificar o estado do sistema.",
          variant: "destructive",
        });
        return;
      }
      
      // is_first_mentor returns true if NO mentor exists
      setHasMentor(!data);
      setCheckingMentor(false);
      
      // If mentor exists, redirect to auth
      if (!data === false) {
        navigate('/auth');
      }
    };

    checkForMentor();
  }, [navigate, toast]);

  // Redirect if user is already logged in with a role
  useEffect(() => {
    if (user && role) {
      if (role === 'mentor') {
        navigate('/admin');
      } else if (role === 'mentorado') {
        navigate('/app');
      }
    }
  }, [user, role, navigate]);

  // After signup, assign mentor role
  useEffect(() => {
    const assignMentorRole = async () => {
      if (user && !role && assignRole) {
        setIsLoading(true);
        const { error } = await assignRole('mentor');
        setIsLoading(false);
        
        if (error) {
          toast({
            title: "Erro ao configurar conta",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        
        // Update mentor business name if provided
        if (businessName) {
          await supabase
            .from('mentors')
            .update({ business_name: businessName })
            .eq('user_id', user.id);
        }
        
        toast({
          title: "Configuração concluída!",
          description: "Você agora é o mentor principal da plataforma.",
        });
        
        navigate('/admin');
      }
    };

    assignMentorRole();
  }, [user, role, assignRole, businessName, navigate, toast]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; fullName?: string; businessName?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!fullName.trim()) {
      newErrors.fullName = "Nome é obrigatório";
    }

    if (!businessName.trim()) {
      newErrors.businessName = "Nome da mentoria é obrigatório";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    const { error } = await signUp(email, password, fullName);

    if (error) {
      setIsLoading(false);
      if (error.message.includes("already registered")) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já está em uso. Tente fazer login.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar conta",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "Conta criada!",
      description: "Verifique seu email para confirmar o cadastro.",
    });
    // Role assignment will happen in useEffect when user state updates
  };

  // Show loading while checking for existing mentor
  if (checkingMentor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  // If mentor already exists, show message (will redirect soon)
  if (hasMentor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Sistema já configurado</h1>
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 animated-gradient opacity-30" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
      
      <div className="w-full max-w-lg relative z-10">
        <Card className="glass-card border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center glow-gold">
                <Crown className="w-9 h-9 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl font-display font-bold text-foreground">
              Configuração Inicial
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Configure sua plataforma de mentoria como <span className="text-primary font-semibold">Mentor Principal</span>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSetup} className="space-y-5">
              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="business-name" className="text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Nome da Mentoria
                </Label>
                <Input
                  id="business-name"
                  type="text"
                  placeholder="Ex: Mentoria Elite Vendas"
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
                {errors.businessName && <p className="text-sm text-destructive">{errors.businessName}</p>}
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full-name" className="text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Seu Nome Completo
                </Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Nome completo"
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
              
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="bg-secondary/50 border-border/50 focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              
              <Button 
                type="submit" 
                className="w-full gradient-gold text-primary-foreground hover:opacity-90 h-12 text-base font-semibold glow-gold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-5 w-5" />
                    Criar Conta de Mentor
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs text-center text-muted-foreground">
                <Shield className="inline w-3 h-3 mr-1" />
                Esta página só está disponível para a configuração inicial.
                Após criar sua conta, novos usuários deverão ser aprovados por você.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Setup;
