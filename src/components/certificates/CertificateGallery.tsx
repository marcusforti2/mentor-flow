import { useState } from "react";
import { Award, Download, Share2, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CertificateModal } from "./CertificateModal";
import type { Certificate } from "@/hooks/useCertificates";

interface CertificateGalleryProps {
  certificates: Certificate[];
  studentName: string;
}

export function CertificateGallery({ certificates, studentName }: CertificateGalleryProps) {
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);

  if (certificates.length === 0) {
    return (
      <Card className="glass-card p-8 text-center">
        <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">
          Nenhum certificado ainda
        </h3>
        <p className="text-sm text-muted-foreground">
          Conclua 100% de uma trilha para ganhar seu primeiro certificado!
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {certificates.map((cert) => (
          <Card
            key={cert.id}
            className="glass-card overflow-hidden group hover:border-primary/40 transition-all cursor-pointer"
            onClick={() => setViewingCert(cert)}
          >
            {/* Mini certificate preview */}
            <div
              className="aspect-[297/210] relative"
              style={{
                background: "linear-gradient(135deg, hsl(240 10% 8%), hsl(240 10% 12%), hsl(240 10% 8%))",
              }}
            >
              <div className="absolute inset-2 border border-primary/20 rounded-md" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <Award className="w-6 h-6 text-primary mb-1" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Certificado
                </p>
                <p className="font-display text-sm font-bold text-foreground mt-1 line-clamp-2">
                  {cert.trail_title || "Trilha"}
                </p>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button size="sm" variant="secondary">
                  <Eye className="w-4 h-4 mr-1" />
                  Visualizar
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <h4 className="font-semibold text-foreground text-sm line-clamp-1">
                {cert.trail_title || "Trilha"}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(cert.issued_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {viewingCert && (
        <CertificateModal
          isOpen={!!viewingCert}
          onClose={() => setViewingCert(null)}
          studentName={studentName}
          trailTitle={viewingCert.trail_title || "Trilha"}
          issuedAt={viewingCert.issued_at}
        />
      )}
    </>
  );
}
