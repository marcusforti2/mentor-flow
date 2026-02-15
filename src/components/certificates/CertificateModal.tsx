import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Award, Sparkles, Linkedin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  trailTitle: string;
  issuedAt: string;
  isCelebration?: boolean;
}

export function CertificateModal({
  isOpen,
  onClose,
  studentName,
  trailTitle,
  issuedAt,
  isCelebration = false,
}: CertificateModalProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const hasTriggeredConfetti = useRef(false);

  const triggerConfetti = useCallback(() => {
    if (hasTriggeredConfetti.current || !isCelebration) return;
    hasTriggeredConfetti.current = true;
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [isCelebration]);

  const handleOpen = (open: boolean) => {
    if (open && isCelebration) triggerConfetti();
    if (!open) {
      hasTriggeredConfetti.current = false;
      onClose();
    }
  };

  const formattedDate = new Date(issuedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const downloadPDF = async () => {
    if (!certRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
      pdf.save(`certificado-${trailTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("Certificado baixado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const shareLinkedIn = () => {
    const text = `🏆 Acabei de concluir a trilha "${trailTitle}" e recebi meu certificado! #aprendizado #mentoria`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&summary=${encodeURIComponent(text)}`, "_blank");
  };

  const shareWhatsApp = () => {
    const text = `🏆 Concluí a trilha "${trailTitle}" e ganhei um certificado! Confira: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 bg-background border-border overflow-hidden">
        {/* Celebration header */}
        {isCelebration && (
          <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <span className="font-display font-bold text-lg">Parabéns! Trilha Concluída!</span>
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Certificate preview */}
        <div className="p-6">
          <div
            ref={certRef}
            className="relative w-full aspect-[297/210] rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(240 10% 8%), hsl(240 10% 12%), hsl(240 10% 8%))",
            }}
          >
            {/* Border decoration */}
            <div className="absolute inset-3 border-2 border-primary/30 rounded-lg" />
            <div className="absolute inset-5 border border-primary/15 rounded-lg" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>

              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Certificado de Conclusão
              </p>

              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                {trailTitle}
              </h2>

              <p className="text-muted-foreground mb-1 text-sm">
                Certificamos que
              </p>
              <p className="font-display text-2xl font-bold text-primary mb-6">
                {studentName}
              </p>

              <p className="text-sm text-muted-foreground max-w-md mb-8">
                concluiu com sucesso todos os módulos e lições desta trilha de aprendizado,
                demonstrando dedicação e comprometimento com seu desenvolvimento profissional.
              </p>

              <p className="text-xs text-muted-foreground">
                Emitido em {formattedDate}
              </p>
            </div>

            {/* Corner decorations */}
            <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-primary/40 rounded-tl-lg" />
            <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-primary/40 rounded-tr-lg" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-primary/40 rounded-bl-lg" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-primary/40 rounded-br-lg" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pt-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={shareLinkedIn}>
              <Linkedin className="w-4 h-4 mr-1" />
              LinkedIn
            </Button>
            <Button variant="outline" size="sm" onClick={shareWhatsApp}>
              <MessageCircle className="w-4 h-4 mr-1" />
              WhatsApp
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={downloadPDF} disabled={isExporting}>
              <Download className="w-4 h-4 mr-1" />
              {isExporting ? "Gerando..." : "Baixar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
