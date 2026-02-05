 import { useState } from "react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { toast } from "sonner";
 import {
   Copy,
   MessageCircle,
   Mail,
   Clock,
   CheckCircle,
   Link,
   User,
 } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 interface Invite {
   id: string;
   invite_token: string;
   full_name: string;
   email: string | null;
   phone: string | null;
   business_name: string | null;
   status: string;
   welcome_message: string;
   created_at: string;
   expires_at: string;
   accepted_at: string | null;
 }
 
 interface WelcomeMessageCardProps {
   invite: Invite;
   onResend?: () => void;
 }
 
 export function WelcomeMessageCard({ invite, onResend }: WelcomeMessageCardProps) {
   const [copied, setCopied] = useState(false);
 
   const copyToClipboard = async (text: string, type: 'message' | 'link') => {
     try {
       await navigator.clipboard.writeText(text);
       setCopied(true);
       toast.success(type === 'message' ? 'Mensagem copiada!' : 'Link copiado!');
       setTimeout(() => setCopied(false), 2000);
     } catch (error) {
       toast.error('Erro ao copiar');
     }
   };
 
   const openWhatsApp = () => {
     if (!invite.phone) {
       toast.error('Telefone não informado');
       return;
     }
     
     // Clean phone number
     const cleanPhone = invite.phone.replace(/\D/g, '');
     const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
     
     const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(invite.welcome_message)}`;
     window.open(url, '_blank');
   };
 
   const openEmail = () => {
     if (!invite.email) {
       toast.error('Email não informado');
       return;
     }
     
     const subject = 'Convite para Mentoria';
     const url = `mailto:${invite.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(invite.welcome_message)}`;
     window.location.href = url;
   };
 
   const inviteLink = `${window.location.origin}/onboarding?token=${invite.invite_token}`;
   const isExpired = new Date(invite.expires_at) < new Date();
   const timeAgo = formatDistanceToNow(new Date(invite.created_at), { 
     addSuffix: true, 
     locale: ptBR 
   });
 
   return (
     <Card className={`${invite.status === 'accepted' ? 'border-green-500/30 bg-green-500/5' : isExpired ? 'border-destructive/30 bg-destructive/5' : ''}`}>
       <CardHeader className="pb-3">
         <div className="flex items-start justify-between">
           <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
               <User className="h-5 w-5 text-primary" />
             </div>
             <div>
               <CardTitle className="text-base">{invite.full_name}</CardTitle>
               <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                 {invite.email && <span>{invite.email}</span>}
                 {invite.phone && <span>• {invite.phone}</span>}
               </div>
             </div>
           </div>
           <Badge
             variant={
               invite.status === 'accepted' ? 'default' :
               isExpired ? 'destructive' : 'secondary'
             }
           >
             {invite.status === 'accepted' ? (
               <><CheckCircle className="h-3 w-3 mr-1" /> Aceito</>
             ) : isExpired ? (
               <><Clock className="h-3 w-3 mr-1" /> Expirado</>
             ) : (
               <><Clock className="h-3 w-3 mr-1" /> Pendente</>
             )}
           </Badge>
         </div>
       </CardHeader>
       <CardContent className="space-y-4">
         {invite.business_name && (
           <p className="text-sm text-muted-foreground">
             🏢 {invite.business_name}
           </p>
         )}
 
         {/* Welcome Message Preview */}
         <div className="bg-secondary/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
           {invite.welcome_message}
         </div>
 
         {/* Actions */}
         {invite.status !== 'accepted' && !isExpired && (
           <div className="flex flex-wrap gap-2">
             <Button
               size="sm"
               variant="outline"
               onClick={() => copyToClipboard(invite.welcome_message, 'message')}
             >
               <Copy className="h-4 w-4 mr-1" />
               {copied ? 'Copiado!' : 'Copiar Mensagem'}
             </Button>
             <Button
               size="sm"
               variant="outline"
               onClick={() => copyToClipboard(inviteLink, 'link')}
             >
               <Link className="h-4 w-4 mr-1" />
               Copiar Link
             </Button>
             {invite.phone && (
               <Button
                 size="sm"
                 variant="outline"
                 className="text-green-600 hover:text-green-700"
                 onClick={openWhatsApp}
               >
                 <MessageCircle className="h-4 w-4 mr-1" />
                 WhatsApp
               </Button>
             )}
             {invite.email && (
               <Button
                 size="sm"
                 variant="outline"
                 onClick={openEmail}
               >
                 <Mail className="h-4 w-4 mr-1" />
                 Email
               </Button>
             )}
           </div>
         )}
 
         {/* Footer Info */}
         <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
           <span>Criado {timeAgo}</span>
           <span className="font-mono bg-muted px-2 py-0.5 rounded">
             {invite.invite_token}
           </span>
         </div>
       </CardContent>
     </Card>
   );
 }