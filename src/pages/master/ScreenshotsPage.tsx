import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Download, Loader2, CheckCircle2, Image, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTenants } from '@/hooks/useTenants';

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

const MENTORADO_SCREENS = [
  { label: 'Dashboard', path: '/mentorado' },
  { label: 'Trilhas', path: '/mentorado/trilhas' },
  { label: 'Meu CRM', path: '/mentorado/meu-crm' },
  { label: 'Calendário', path: '/mentorado/calendario' },
  { label: 'Centro SOS', path: '/mentorado/sos' },
  { label: 'Perfil', path: '/mentorado/perfil' },
  { label: 'Ferramentas IA', path: '/mentorado/ferramentas' },
  { label: 'Meus Arquivos', path: '/mentorado/meus-arquivos' },
  { label: 'Tarefas', path: '/mentorado/tarefas' },
  { label: 'Playbooks', path: '/mentorado/playbooks' },
  { label: 'Métricas', path: '/mentorado/metricas' },
];

type ScreenGroup = 'mentor' | 'mentorado' | 'all';

const SCREEN_GROUPS: Record<ScreenGroup, { label: string; screens: typeof MENTOR_SCREENS }> = {
  mentor: { label: 'Mentor', screens: MENTOR_SCREENS },
  mentorado: { label: 'Mentorado', screens: MENTORADO_SCREENS },
  all: { label: 'Todas', screens: [...MENTOR_SCREENS, ...MENTORADO_SCREENS] },
};

interface ScreenCapture {
  label: string;
  dataUrl: string;
}

export default function ScreenshotsPage() {
  const { tenants, isLoading: tenantsLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [captures, setCaptures] = useState<ScreenCapture[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<ScreenGroup>('all');

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);
  const activeScreens = SCREEN_GROUPS[selectedGroup].screens;

  const captureScreen = useCallback(
    (path: string): Promise<string> =>
      new Promise((resolve, reject) => {
        // Open a popup window with the route
        const popup = window.open(
          window.location.origin + path,
          'screenshot_capture',
          `width=1440,height=900,left=0,top=0,toolbar=no,menubar=no,scrollbars=no,resizable=no`
        );

        if (!popup) {
          reject(new Error('Popup bloqueado pelo navegador. Permita popups para esta página.'));
          return;
        }

        const onLoad = () => {
          // Wait for content to render
          setTimeout(async () => {
            try {
              const canvas = await html2canvas(popup.document.body, {
                width: 1440,
                height: 900,
                windowWidth: 1440,
                windowHeight: 900,
                scale: 1,
                useCORS: true,
                allowTaint: true,
                logging: false,
              });
              const dataUrl = canvas.toDataURL('image/png');
              popup.close();
              resolve(dataUrl);
            } catch (err) {
              popup.close();
              console.error('Capture failed:', err);
              reject(err);
            }
          }, 4000);
        };

        popup.addEventListener('load', onLoad);
      }),
    []
  );

  const captureAll = useCallback(async () => {
    setIsCapturing(true);
    setCaptures([]);
    setProgress(0);
    const results: ScreenCapture[] = [];

    for (let i = 0; i < activeScreens.length; i++) {
      const screen = activeScreens[i];
      setCurrentScreen(screen.label);
      setProgress(Math.round(((i + 1) / activeScreens.length) * 100));

      try {
        const dataUrl = await captureScreen(screen.path);
        results.push({ label: screen.label, dataUrl });
        setCaptures([...results]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        toast.error(`Falha ao capturar ${screen.label}: ${msg}`);
        if (msg.includes('Popup')) break;
      }
    }

    setIsCapturing(false);
    setCurrentScreen('');
    if (results.length > 0) {
      toast.success(`${results.length} telas capturadas!`);
    }
  }, [captureScreen, activeScreens]);

  const downloadPNG = useCallback((capture: ScreenCapture) => {
    const a = document.createElement('a');
    a.href = capture.dataUrl;
    const prefix = selectedTenant?.slug || 'mentorflow';
    a.download = `${prefix}-${capture.label.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }, [selectedTenant]);

  const downloadAllPDF = useCallback(() => {
    if (captures.length === 0) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1440, 900] });
    captures.forEach((capture, i) => {
      if (i > 0) pdf.addPage([1440, 900], 'landscape');
      pdf.setFontSize(16);
      pdf.text(capture.label, 20, 30);
      pdf.addImage(capture.dataUrl, 'PNG', 0, 40, 1440, 860);
    });
    const prefix = selectedTenant?.slug || 'mentorflow';
    pdf.save(`${prefix}-screenshots.pdf`);
    toast.success('PDF baixado!');
  }, [captures, selectedTenant]);

  const downloadAllPNG = useCallback(() => {
    captures.forEach((c) => {
      const a = document.createElement('a');
      a.href = c.dataUrl;
      const prefix = selectedTenant?.slug || 'mentorflow';
      a.download = `${prefix}-${c.label.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
    });
  }, [captures, selectedTenant]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Screenshots</h1>
          <p className="text-muted-foreground text-sm">
            Capture todas as telas do mentor e mentorado para showcase, documentação ou monitoramento.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tenant Selector */}
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <SelectValue placeholder={tenantsLoading ? 'Carregando...' : 'Selecione o Tenant'} />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group Selector */}
          <Select value={selectedGroup} onValueChange={(v) => setSelectedGroup(v as ScreenGroup)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas ({MENTOR_SCREENS.length + MENTORADO_SCREENS.length})</SelectItem>
              <SelectItem value="mentor">Mentor ({MENTOR_SCREENS.length})</SelectItem>
              <SelectItem value="mentorado">Mentorado ({MENTORADO_SCREENS.length})</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={captureAll} disabled={isCapturing}>
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {currentScreen} ({progress}%)
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Capturar ({activeScreens.length} telas)
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
              {selectedTenant && (
                <span className="text-muted-foreground font-normal">— {selectedTenant.name}</span>
              )}
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

      {/* Empty state */}
      {captures.length === 0 && !isCapturing && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Selecione um tenant e clique em <strong>Capturar</strong> para gerar os prints.
            </p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Certifique-se de permitir popups no navegador.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
