import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { BusinessProfileForm } from "@/components/crm/BusinessProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "@/components/AvatarUpload";
import { toast } from "sonner";
import { Loader2, User, Briefcase, Save, Instagram, Linkedin, Globe, Phone, Mail, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Perfil() {
  const { user, profile } = useAuth();
  const { activeMembership } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    instagram: "",
    linkedin: "",
    website: "",
    bio: "",
  });

  const membershipId = activeMembership?.id || null;

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        instagram: (profile as any).instagram || "",
        linkedin: (profile as any).linkedin || "",
        website: (profile as any).website || "",
        bio: (profile as any).bio || "",
      });
    }
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          instagram: formData.instagram,
          linkedin: formData.linkedin,
          website: formData.website,
          bio: formData.bio,
        } as any)
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

      <Tabs defaultValue="pessoal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pessoal" className="gap-2"><User className="w-4 h-4" />Dados Pessoais</TabsTrigger>
          <TabsTrigger value="negocio" className="gap-2"><Briefcase className="w-4 h-4" />Meu Negócio</TabsTrigger>
        </TabsList>

        <TabsContent value="pessoal" className="mt-6 space-y-6">
          {/* Avatar & Identity */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />Informações Pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <AvatarUpload
                  currentUrl={profile?.avatar_url}
                  fallbackText={formData.full_name?.charAt(0) || "U"}
                  size="lg"
                />
                <div>
                  <p className="font-medium">{formData.full_name || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Seu nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Telefone / WhatsApp</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />E-mail</Label>
                <Input id="email" value={formData.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado aqui.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Bio / Sobre mim</Label>
                <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Conte um pouco sobre você..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />Redes Sociais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" />Instagram</Label>
                <Input id="instagram" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} placeholder="@seuperfil" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" />LinkedIn</Label>
                <Input id="linkedin" value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} placeholder="https://linkedin.com/in/seuperfil" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Website</Label>
                <Input id="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://seusite.com" />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Dados Pessoais
          </Button>
        </TabsContent>

        <TabsContent value="negocio" className="mt-6">
          {membershipId ? (
            <BusinessProfileForm membershipId={membershipId} />
          ) : (
            <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Não foi possível carregar o formulário de negócio.</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
