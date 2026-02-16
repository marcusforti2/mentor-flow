import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CalendarIcon, ChevronDown, Instagram, Linkedin, Globe, Building2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EditMenteeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  menteeData: {
    membership_id: string;
    user_id: string;
    profile: {
      full_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
    joined_at: string | null;
    business_profile_full: Record<string, unknown> | null;
  };
}

export function EditMenteeModal({ open, onOpenChange, onSuccess, menteeData }: EditMenteeModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [joinedAt, setJoinedAt] = useState<Date | undefined>(undefined);
  const [businessName, setBusinessName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [socialOpen, setSocialOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);

  useEffect(() => {
    if (open && menteeData) {
      setFullName(menteeData.profile?.full_name || '');
      setPhone(menteeData.profile?.phone || '');
      setJoinedAt(menteeData.joined_at ? new Date(menteeData.joined_at) : undefined);
      
      const bp = menteeData.business_profile_full;
      setBusinessName((bp?.business_name as string) || '');
      setInstagram((bp?.instagram as string) || '');
      setLinkedin((bp?.linkedin as string) || '');
      setWebsite((bp?.website as string) || '');
      setNotes((bp?.notes as string) || '');
      
      // Auto-expand sections with data
      if ((bp?.instagram as string) || (bp?.linkedin as string) || (bp?.website as string)) {
        setSocialOpen(true);
      }
      if ((bp?.business_name as string) || (bp?.notes as string)) {
        setBusinessOpen(true);
      }
    }
  }, [open, menteeData]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update profile (full_name, phone, social)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          instagram: instagram.trim() || null,
          linkedin: linkedin.trim() || null,
          website: website.trim() || null,
        } as any)
        .eq('user_id', menteeData.user_id);

      if (profileError) throw profileError;

      // 2. Build updated business_profile JSONB
      const existingBp = menteeData.business_profile_full || {};
      const updatedBp = {
        ...existingBp,
        business_name: businessName.trim() || null,
        instagram: instagram.trim() || null,
        linkedin: linkedin.trim() || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
      };

      // 3. Update mentee_profiles (joined_at + business_profile)
      const { error: menteeError } = await supabase
        .from('mentee_profiles')
        .update({
          joined_at: joinedAt ? joinedAt.toISOString() : null,
          business_profile: updatedBp,
          business_name: businessName.trim() || null,
        })
        .eq('membership_id', menteeData.membership_id);

      if (menteeError) throw menteeError;

      toast.success('Perfil atualizado com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating mentee:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Editar Mentorado
          </DialogTitle>
          <DialogDescription>
            Atualize as informações de {menteeData.profile?.full_name || 'mentorado'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do mentorado"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={menteeData.profile?.email || ''}
              disabled
              className="opacity-60"
            />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11999999999"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !joinedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {joinedAt ? format(joinedAt, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={joinedAt}
                    onSelect={setJoinedAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Redes Sociais */}
          <Collapsible open={socialOpen} onOpenChange={setSocialOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" type="button" className="w-full justify-between px-2 h-9">
                <span className="flex items-center gap-2 text-sm">
                  <Instagram className="h-4 w-4" />
                  Redes Sociais
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", socialOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">Instagram</Label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">LinkedIn</Label>
                <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/usuario" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Site / Portfolio</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://meusite.com" className="h-9" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Negócio */}
          <Collapsible open={businessOpen} onOpenChange={setBusinessOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" type="button" className="w-full justify-between px-2 h-9">
                <span className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" />
                  Negócio
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", businessOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">Empresa / Negócio</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nome da empresa" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações sobre o mentorado..." className="min-h-[60px]" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !fullName.trim()} className="flex-1 gradient-gold text-primary-foreground">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
