import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Building2, Calendar, Image, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Lead {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  company: string | null;
  notes: string | null;
  status: string | null;
  temperature: string | null;
  ai_insights: {
    // Legacy fields from screenshot analysis
    interests?: string[];
    objections?: string[];
    insights?: string[];
    suggested_approach?: string;
    conversation_summary?: string;
    source_type?: string;
    // Lead Qualifier fields
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

          {/* Phone */}
          {lead.contact_phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Phone className="w-3 h-3" />
              <span>{lead.contact_phone}</span>
            </div>
          )}

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
