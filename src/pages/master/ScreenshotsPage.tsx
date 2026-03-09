import { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Download, Loader2, CheckCircle2, Image, FileText } from 'lucide-react';
import { toast } from 'sonner';

const MENTOR_SCREENS = [
  { label: 'Dashboard', path: '/mentor' },
  { label: 'Mentorados', path: '/mentor/mentorados' },
  { label: 'CRM', path: '/mentor/crm' },
  { label: 'Trilhas', path: '/mentor/trilhas' },
  { label: 'Calendário', path: '/mentor/calendario' },
  { label: 'Centro SOS', path: '/mentor/sos' },
  { label: 'Emails', path: '/mentor/emails' },
  { label: 'Relatórios', path: '/mentor/relatorios' },
  { label: 'Perfil', path: '/mentor/perfil' },
  { label: 'Playbooks', path: '/mentor/playbooks' },
  { label: 'Automações', path: '/mentor/automacoes' },
  { label: 'Popups', path: '/mentor/popups' },
  { label: 'WhatsApp', path: '/mentor/whatsapp' },
  { label: 'Formulários', path: '/mentor/formularios' },
  { label: 'Jornada CS', path: '/mentor/jornada-cs' },
  { label: 'Propriedade Intelectual', path: '/mentor/propriedade-intelectual' },
];

interface ScreenCapture {
  label: string;
  dataUrl: string;
}

export default function ScreenshotsPage() {
  const [captures, setCaptures] = useState<ScreenCapture[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('');
  const [progress, setProgress] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const captureIframe = useCallback(
    (path: string): Promise<string> =>
      new Promise((resolve, reject) => {
        const iframe = iframeRef.current;
        if (!iframe) return reject('No iframe');

        iframe.src = window.location.origin + path;

        const onLoad = async () => {
          iframe.removeEventListener('load', onLoad);
          // Wait for rendering
          await new Promise((r) => setTimeout(r, 3000));

          try {
            const doc = iframe.contentDocument;
            if (!doc?.body) throw new Error('Cannot access iframe');

            const canvas = await html2canvas(doc.body, {
              width: 1440,
              height: 900,
              windowWidth: 1440,
              windowHeight: 900,
              scale: 1,
              useCORS: true,
              allowTaint: true,
              logging: false,
            });
            resolve(canvas.toDataURL('image/png'));
          } catch (err) {
            console.error('Capture failed:', err);
            reject(err);
          }
        };

        iframe.addEventListener('load', onLoad);
      }),
    []
  );

  const captureAll = useCallback(async () => {
    setIsCapturing(true);
    setCaptures([]);
    setProgress(0);
    const results: ScreenCapture[] = [];

    for (let i = 0; i < MENTOR_SCREENS.length; i++) {
      const screen = MENTOR_SCREENS[i];
      setCurrentScreen(screen.label);
      setProgress(Math.round(((i + 1) / MENTOR_SCREENS.length) * 100));

      try {
        const dataUrl = await captureIframe(screen.path);
        results.push({ label: screen.label, dataUrl });
        setCaptures([...results]);
      } catch {
        toast.error(`Falha ao capturar: ${screen.label}`);
      }
    }

    setIsCapturing(false);
    setCurrentScreen('');
    toast.success(`${results.length} telas capturadas!`);
  }, [captureIframe]);

  const downloadPNG = useCallback((capture: ScreenCapture) => {
    const a = document.createElement('a');
    a.href = capture.dataUrl;
    a.download = `mentorflow-${capture.label.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }, []);

  const downloadAllPDF = useCallback(() => {
    if (captures.length === 0) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1440, 900] });

    captures.forEach((capture, i) => {
      if (i > 0) pdf.addPage([1440, 900], 'landscape');
      pdf.setFontSize(16);
      pdf.text(capture.label, 20, 30);
      pdf.addImage(capture.dataUrl, 'PNG', 0, 40, 1440, 860);
    });

    pdf.save('mentorflow-screenshots.pdf');
    toast.success('PDF baixado!');
  }, [captures]);

  const downloadAllPNG = useCallback(() => {
    captures.forEach((c) => {
      const a = document.createElement('a');
      a.href = c.dataUrl;
      a.download = `mentorflow-${c.label.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
    });
  }, [captures]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Screenshots</h1>
          <p className="text-muted-foreground text-sm">
            Capture todas as telas do mentor para showcase, documentação ou monitoramento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={captureAll} disabled={isCapturing}>
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {currentScreen} ({progress}%)
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Capturar Todas ({MENTOR_SCREENS.length} telas)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {isCapturing && (
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Download buttons */}
      {captures.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {captures.length} telas capturadas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={downloadAllPDF} variant="default">
              <FileText className="h-4 w-4 mr-2" />
              Baixar PDF (todas)
            </Button>
            <Button onClick={downloadAllPNG} variant="outline">
              <Image className="h-4 w-4 mr-2" />
              Baixar PNGs individuais
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Thumbnails grid */}
      {captures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {captures.map((capture) => (
            <Card
              key={capture.label}
              className="overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => downloadPNG(capture)}
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                  src={capture.dataUrl}
                  alt={capture.label}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Download className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium text-foreground">{capture.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hidden iframe for capturing */}
      <iframe
        ref={iframeRef}
        className="fixed -left-[9999px] -top-[9999px]"
        style={{ width: 1440, height: 900, border: 'none' }}
        title="Screenshot Capture"
      />
    </div>
  );
}
