import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Building2, Calendar, Image, MessageCircle, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Lead {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  company: string | null;
  position: string | null;
  notes: string | null;
  status: string | null;
  temperature: string | null;
  whatsapp: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  ai_insights: {
    interests?: string[];
    objections?: string[];
    insights?: string[];
    suggested_approach?: string;
    conversation_summary?: string;
    source_type?: string;
    score?: number;
    recommendation?: string;
    summary?: string;
    pain_points?: string[];
    opportunities?: string[];
    approach_strategy?: {
      opening_hook?: string;
      value_proposition?: string;
      conversation_starters?: string[];
      objection_handlers?: Record<string, string>;
    };
    extracted_data?: {
      name?: string;
      company?: string;
      platform?: string;
      bio?: string;
      followers?: string;
      posts_count?: string;
      website?: string;
      headline?: string;
      location?: string;
    };
  } | null;
  screenshot_urls: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

const temperatureConfig = {
  hot: { label: "Quente", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  warm: { label: "Morno", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  cold: { label: "Frio", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

function getWhatsAppLink(lead: Lead): string | null {
  const raw = lead.whatsapp || lead.contact_phone;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const temp = temperatureConfig[lead.temperature as keyof typeof temperatureConfig] || temperatureConfig.cold;
  const initials = lead.contact_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("leadId", lead.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const whatsappLink = getWhatsAppLink(lead);

  return (
    <Card
      className="p-3 cursor-pointer hover:border-primary/50 transition-all group"
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name and Temperature */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{lead.contact_name}</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", temp.color)}>
              {temp.label}
            </Badge>
          </div>

          {/* Company */}
          {lead.company && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{lead.company}</span>
            </div>
          )}

          {/* Phone + WhatsApp */}
          <div className="flex items-center gap-2 mt-1">
            {lead.contact_phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{lead.contact_phone}</span>
              </div>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 transition-colors bg-emerald-500/10 px-1.5 py-0.5 rounded-full"
              >
                <MessageCircle className="w-3 h-3" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2">
            {lead.screenshot_urls && lead.screenshot_urls.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Image className="w-3 h-3" />
                <span>{lead.screenshot_urls.length}</span>
              </div>
            )}
            {lead.created_at && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(lead.created_at), "dd MMM", { locale: ptBR })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
