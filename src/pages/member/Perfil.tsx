import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { BusinessProfileForm } from "@/components/crm/BusinessProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { toast } from "sonner";
import { Loader2, User, Briefcase, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Perfil() {
  const { user, profile } = useAuth();
  const { activeMembership } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", email: "", phone: "" });

  // Use membership ID for the business profile form
  const membershipId = activeMembership?.id || null;

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: formData.full_name, phone: formData.phone })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erro ao salvar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e do seu negócio</p>
      </div>

      <Tabs defaultValue="negocio" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="negocio" className="gap-2"><Briefcase className="w-4 h-4" />Meu Negócio</TabsTrigger>
          <TabsTrigger value="pessoal" className="gap-2"><User className="w-4 h-4" />Dados Pessoais</TabsTrigger>
        </TabsList>

        <TabsContent value="negocio" className="mt-6">
          {membershipId ? (
            <BusinessProfileForm membershipId={membershipId} />
          ) : (
            <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Não foi possível carregar o formulário de negócio.</p></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="pessoal" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />Informações Pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <AvatarUpload
                  currentUrl={profile?.avatar_url}
                  fallbackText={formData.full_name?.charAt(0) || "U"}
                  size="lg"
                />
                <div><p className="font-medium">{formData.full_name || "Sem nome"}</p><p className="text-sm text-muted-foreground">{formData.email}</p></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="full_name">Nome Completo</Label><Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Seu nome completo" /></div>
                <div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" value={formData.email} disabled className="bg-muted" /><p className="text-xs text-muted-foreground">O e-mail não pode ser alterado aqui.</p></div>
              <Button onClick={handleSaveProfile} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Salvar Dados Pessoais</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
