 import { useState, useRef } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Checkbox } from "@/components/ui/checkbox";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { toast } from "sonner";
 import {
   Upload,
   FileSpreadsheet,
   Loader2,
   CheckCircle,
   AlertCircle,
   ArrowRight,
   ArrowLeft,
   X,
 } from "lucide-react";
 
 interface ParsedRow {
   full_name: string;
   email: string;
   phone?: string;
   business_name?: string;
   selected?: boolean;
 }
 
 interface MentoradoUploadModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   mentorId: string;
   mentorName: string;
   onSuccess: () => void;
 }
 
 type Step = 'upload' | 'preview' | 'confirm' | 'complete';
 
 export function MentoradoUploadModal({
   open,
   onOpenChange,
   mentorId,
   mentorName,
   onSuccess,
 }: MentoradoUploadModalProps) {
   const [step, setStep] = useState<Step>('upload');
   const [isLoading, setIsLoading] = useState(false);
   const [file, setFile] = useState<File | null>(null);
   const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
   const [mapping, setMapping] = useState<Record<string, string | null>>({});
   const [errors, setErrors] = useState<string[]>([]);
   const [createdCount, setCreatedCount] = useState(0);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   const resetState = () => {
     setStep('upload');
     setFile(null);
     setParsedData([]);
     setMapping({});
     setErrors([]);
     setCreatedCount(0);
   };
 
   const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFile = e.target.files?.[0];
     if (!selectedFile) return;
 
     // Validate file type
     const validTypes = ['.csv', '.txt'];
     const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
     if (!validTypes.includes(ext)) {
       toast.error('Formato inválido', {
         description: 'Use arquivos CSV ou TXT',
       });
       return;
     }
 
     setFile(selectedFile);
     setIsLoading(true);
 
     try {
       // Read file as base64
       const reader = new FileReader();
       reader.onload = async (event) => {
         const content = event.target?.result as string;
         const base64 = btoa(content);
 
         // Send to edge function for parsing
         const { data, error } = await supabase.functions.invoke('parse-mentorado-spreadsheet', {
           body: { fileContent: base64, fileName: selectedFile.name },
         });
 
         if (error) throw error;
         if (!data.success) throw new Error(data.error);
 
         // Add selected flag to each row
         const dataWithSelection = data.data.map((row: ParsedRow) => ({
           ...row,
           selected: true,
         }));
 
         setParsedData(dataWithSelection);
         setMapping(data.mapping);
         setErrors(data.errors || []);
         setStep('preview');
       };
       reader.readAsText(selectedFile);
     } catch (error: any) {
       console.error('Error parsing file:', error);
       toast.error('Erro ao processar arquivo', {
         description: error.message,
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   const toggleRowSelection = (index: number) => {
     setParsedData(prev =>
       prev.map((row, i) =>
         i === index ? { ...row, selected: !row.selected } : row
       )
     );
   };
 
   const toggleAllSelection = (selected: boolean) => {
     setParsedData(prev => prev.map(row => ({ ...row, selected })));
   };
 
   const handleCreateInvites = async () => {
     const selectedRows = parsedData.filter(row => row.selected);
     if (selectedRows.length === 0) {
       toast.error('Selecione pelo menos um mentorado');
       return;
     }
 
     setIsLoading(true);
 
     try {
       let created = 0;
 
       for (const row of selectedRows) {
         // Generate unique token
         const { data: tokenData } = await supabase.rpc('generate_invite_token');
         const token = tokenData || generateFallbackToken();
 
         // Generate welcome message
         const baseUrl = window.location.origin;
         const inviteLink = `${baseUrl}/onboarding?token=${token}`;
         const welcomeMessage = `Olá ${row.full_name.split(' ')[0]}! 👋
 
 Você foi convidado(a) para a mentoria ${mentorName}.
 
 Clique no link abaixo para criar sua conta e começar sua jornada:
 ${inviteLink}
 
 Esse link é exclusivo para você.`;
 
         // Insert invite
         const { error } = await supabase.from('mentorado_invites').insert({
           mentor_id: mentorId,
           invite_token: token,
           full_name: row.full_name,
           email: row.email || null,
           phone: row.phone || null,
           business_name: row.business_name || null,
           welcome_message: welcomeMessage,
           status: 'pending',
         });
 
         if (error) {
           console.error('Error creating invite:', error);
           if (error.code === '23505') {
             // Duplicate token, try again with new token
             continue;
           }
           throw error;
         }
 
         created++;
       }
 
       setCreatedCount(created);
       setStep('complete');
       toast.success(`${created} convites criados!`);
       onSuccess();
     } catch (error: any) {
       console.error('Error creating invites:', error);
       toast.error('Erro ao criar convites', {
         description: error.message,
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   const generateFallbackToken = () => {
     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
     let result = '';
     for (let i = 0; i < 8; i++) {
       result += chars.charAt(Math.floor(Math.random() * chars.length));
     }
     return result;
   };
 
   const selectedCount = parsedData.filter(r => r.selected).length;
 
   return (
     <Dialog
       open={open}
       onOpenChange={(value) => {
         if (!value) resetState();
         onOpenChange(value);
       }}
     >
       <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
         <DialogHeader>
           <DialogTitle>
             {step === 'upload' && 'Importar Planilha'}
             {step === 'preview' && 'Revisar Dados'}
             {step === 'confirm' && 'Confirmar Importação'}
             {step === 'complete' && 'Importação Concluída'}
           </DialogTitle>
           <DialogDescription>
             {step === 'upload' && 'Faça upload de um arquivo CSV com os dados dos mentorados'}
             {step === 'preview' && 'Revise os dados identificados antes de criar os convites'}
             {step === 'confirm' && `Você está prestes a criar ${selectedCount} convites`}
             {step === 'complete' && `${createdCount} convites foram criados com sucesso`}
           </DialogDescription>
         </DialogHeader>
 
         {/* Upload Step */}
         {step === 'upload' && (
           <div className="space-y-4 py-4">
             <div
               className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
               onClick={() => fileInputRef.current?.click()}
             >
               <input
                 ref={fileInputRef}
                 type="file"
                 accept=".csv,.txt"
                 onChange={handleFileSelect}
                 className="hidden"
               />
               {isLoading ? (
                 <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
               ) : (
                 <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
               )}
               <p className="text-lg font-medium mb-1">
                 {isLoading ? 'Processando...' : 'Arraste ou clique para selecionar'}
               </p>
               <p className="text-sm text-muted-foreground">
                 Arquivos CSV com colunas: Nome, Email, Telefone, Empresa
               </p>
             </div>
 
             <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
               <p className="font-medium mb-2">💡 Dicas para sua planilha:</p>
               <ul className="list-disc list-inside space-y-1">
                 <li>A primeira linha deve ser o cabeçalho</li>
                 <li>A coluna "Nome" é obrigatória</li>
                 <li>Email, Telefone e Empresa são opcionais</li>
                 <li>O sistema identifica as colunas automaticamente</li>
               </ul>
             </div>
           </div>
         )}
 
         {/* Preview Step */}
         {step === 'preview' && (
           <div className="flex-1 min-h-0 space-y-4">
             {/* Mapping Info */}
             <div className="flex flex-wrap gap-2 text-xs">
               {mapping.full_name && (
                 <span className="bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                   Nome: {mapping.full_name}
                 </span>
               )}
               {mapping.email && (
                 <span className="bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                   Email: {mapping.email}
                 </span>
               )}
               {mapping.phone && (
                 <span className="bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                   Telefone: {mapping.phone}
                 </span>
               )}
               {mapping.business_name && (
                 <span className="bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                   Empresa: {mapping.business_name}
                 </span>
               )}
             </div>
 
             {/* Errors */}
             {errors.length > 0 && (
               <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                 <div className="flex items-center gap-2 font-medium mb-1">
                   <AlertCircle className="h-4 w-4" />
                   {errors.length} aviso(s)
                 </div>
                 <ul className="list-disc list-inside text-xs max-h-20 overflow-y-auto">
                   {errors.slice(0, 5).map((err, i) => (
                     <li key={i}>{err}</li>
                   ))}
                   {errors.length > 5 && <li>...e mais {errors.length - 5}</li>}
                 </ul>
               </div>
             )}
 
             {/* Selection Header */}
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Checkbox
                   checked={selectedCount === parsedData.length}
                   onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                 />
                 <span className="text-sm text-muted-foreground">
                   {selectedCount} de {parsedData.length} selecionados
                 </span>
               </div>
             </div>
 
             {/* Data Table */}
             <ScrollArea className="h-[300px] border rounded-lg">
               <div className="p-4 space-y-2">
                 {parsedData.map((row, index) => (
                   <div
                     key={index}
                     className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                       row.selected ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-transparent'
                     }`}
                   >
                     <Checkbox
                       checked={row.selected}
                       onCheckedChange={() => toggleRowSelection(index)}
                     />
                     <div className="flex-1 min-w-0">
                       <p className="font-medium truncate">{row.full_name}</p>
                       <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                         {row.email && <span>{row.email}</span>}
                         {row.phone && <span>• {row.phone}</span>}
                         {row.business_name && <span>• {row.business_name}</span>}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </ScrollArea>
 
             {/* Actions */}
             <div className="flex justify-between pt-4">
               <Button variant="outline" onClick={() => setStep('upload')}>
                 <ArrowLeft className="h-4 w-4 mr-2" />
                 Voltar
               </Button>
               <Button
                 onClick={handleCreateInvites}
                 disabled={selectedCount === 0 || isLoading}
                 className="gradient-gold text-primary-foreground"
               >
                 {isLoading ? (
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 ) : (
                   <ArrowRight className="h-4 w-4 mr-2" />
                 )}
                 Criar {selectedCount} Convites
               </Button>
             </div>
           </div>
         )}
 
         {/* Complete Step */}
         {step === 'complete' && (
           <div className="py-8 text-center space-y-4">
             <div className="h-16 w-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
               <CheckCircle className="h-8 w-8 text-green-500" />
             </div>
             <div>
               <p className="text-lg font-medium">Convites Criados!</p>
               <p className="text-muted-foreground">
                 {createdCount} convites foram criados. Você pode copiar as mensagens de boas-vindas na aba "Convites Pendentes".
               </p>
             </div>
             <Button onClick={() => onOpenChange(false)}>
               Fechar
             </Button>
           </div>
         )}
       </DialogContent>
     </Dialog>
   );
 }