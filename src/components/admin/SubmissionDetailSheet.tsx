import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User, Mail, Phone, Calendar, Download, ExternalLink, Image as ImageIcon,
  FileText, Link as LinkIcon, CheckCircle2, Star, Type, AlignLeft,
  UserPlus, X,
} from 'lucide-react';

interface FormQuestion {
  id: string;
  question_text: string;
  question_type: string;
  system_field_key?: string;
  options: any[];
  is_required: boolean;
  order_index: number;
  section: string;
}

interface FormSubmission {
  id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Record<string, any>;
  created_at: string;
  membership_id: string | null;
}

interface SubmissionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: FormSubmission | null;
  questions: FormQuestion[];
  onCreateMentee?: (sub: FormSubmission) => void;
}

const QUESTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  textarea: <AlignLeft className="h-3.5 w-3.5" />,
  select: <CheckCircle2 className="h-3.5 w-3.5" />,
  multiple_choice: <CheckCircle2 className="h-3.5 w-3.5" />,
  yes_no: <CheckCircle2 className="h-3.5 w-3.5" />,
  scale: <Star className="h-3.5 w-3.5" />,
  link: <LinkIcon className="h-3.5 w-3.5" />,
  image: <ImageIcon className="h-3.5 w-3.5" />,
};

export default function SubmissionDetailSheet({
  open, onOpenChange, submission, questions, onCreateMentee,
}: SubmissionDetailSheetProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!submission) return null;

  const initials = (submission.respondent_name || 'R')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const orderedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);

  const renderAnswer = (question: FormQuestion, answer: any) => {
    if (answer == null || answer === '') {
      return <span className="text-muted-foreground italic text-sm">Não respondido</span>;
    }

    // Image type
    if (question.question_type === 'image') {
      const preview = typeof answer === 'object' ? answer.preview : null;
      const fileName = typeof answer === 'object' ? answer.fileName : null;

      if (preview) {
        return (
          <div className="space-y-2">
            <button
              onClick={() => setLightboxUrl(preview)}
              className="group relative rounded-xl overflow-hidden border border-border/50 hover:border-primary/40 transition-all"
            >
              <img
                src={preview}
                alt={fileName || 'Imagem'}
                className="max-h-64 w-auto rounded-xl object-contain"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </button>
            {fileName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> {fileName}
              </p>
            )}
          </div>
        );
      }

      return <span className="text-muted-foreground text-sm">{fileName || 'Imagem enviada'}</span>;
    }

    // Link type
    if (question.question_type === 'link') {
      const url = String(answer);
      return (
        <a
          href={url.startsWith('http') ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
        >
          <LinkIcon className="h-3.5 w-3.5 shrink-0" />
          {url}
        </a>
      );
    }

    // Scale type
    if (question.question_type === 'scale') {
      const value = Number(answer);
      return (
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-sm transition-colors ${
                  i < value ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-foreground">{value}/10</span>
        </div>
      );
    }

    // Yes/No
    if (question.question_type === 'yes_no') {
      const isYes = String(answer).toLowerCase() === 'sim';
      return (
        <Badge variant={isYes ? 'default' : 'secondary'} className="text-xs">
          {String(answer)}
        </Badge>
      );
    }

    // Select / multiple choice with object answer
    if (typeof answer === 'object' && answer !== null) {
      if (answer.text) {
        return <p className="text-sm text-foreground">{answer.text}</p>;
      }
      if (Array.isArray(answer)) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {answer.map((item: any, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {typeof item === 'string' ? item : item.text || JSON.stringify(item)}
              </Badge>
            ))}
          </div>
        );
      }
      return <p className="text-sm text-foreground">{JSON.stringify(answer)}</p>;
    }

    // Default text
    return <p className="text-sm text-foreground whitespace-pre-wrap">{String(answer)}</p>;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg font-bold truncate">
                  {submission.respondent_name || 'Respondente'}
                </SheetTitle>
                <div className="flex flex-col gap-0.5 mt-1">
                  {submission.respondent_email && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {submission.respondent_email}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(submission.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
            {onCreateMentee && (
              <Button
                size="sm"
                className="mt-3 w-full gap-1.5"
                onClick={() => onCreateMentee(submission)}
              >
                <UserPlus className="h-4 w-4" /> Criar Mentorado a partir desta resposta
              </Button>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-6 space-y-5">
              {orderedQuestions.map((q) => {
                const answer = submission.answers[q.id];
                return (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5 shrink-0">
                        {QUESTION_TYPE_ICONS[q.question_type] || <FileText className="h-3.5 w-3.5" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground leading-tight">
                          {q.question_text}
                          {q.is_required && <span className="text-destructive ml-0.5">*</span>}
                        </p>
                        {q.system_field_key && (
                          <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0">
                            {q.system_field_key}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="pl-6">
                      {renderAnswer(q, answer)}
                    </div>
                  </div>
                );
              })}

              {/* Show answers for questions not in current form (orphaned) */}
              {Object.entries(submission.answers)
                .filter(([qId]) => !orderedQuestions.find(q => q.id === qId))
                .map(([qId, answer]) => (
                  <div key={qId} className="space-y-2 opacity-60">
                    <p className="text-xs font-medium text-muted-foreground">(Pergunta removida)</p>
                    <div className="pl-6">
                      <p className="text-sm text-foreground">
                        {typeof answer === 'object' && answer !== null
                          ? JSON.stringify(answer)
                          : String(answer)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={lightboxUrl}
            alt="Imagem ampliada"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <a
            href={lightboxUrl}
            download="imagem-formulario.png"
            className="absolute bottom-6 right-6"
            onClick={e => e.stopPropagation()}
          >
            <Button size="sm" variant="secondary" className="gap-1.5">
              <Download className="h-4 w-4" /> Baixar
            </Button>
          </a>
        </div>
      )}
    </>
  );
}
