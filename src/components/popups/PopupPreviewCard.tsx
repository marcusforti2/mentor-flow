import { type TenantPopup } from '@/hooks/usePopups';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2, Pencil, Eye, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PopupPreviewCardProps {
  popup: TenantPopup;
  dismissalCount: number;
  onEdit: (popup: TenantPopup) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

export function PopupPreviewCard({ popup, dismissalCount, onEdit, onDelete, onToggle }: PopupPreviewCardProps) {
  const now = new Date();
  const isExpired = popup.display_mode === 'date_range' && popup.ends_at && new Date(popup.ends_at) < now;

  const statusBadge = () => {
    if (isExpired) return <Badge variant="secondary" className="bg-muted text-muted-foreground">Expirado</Badge>;
    if (popup.is_active) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>;
    return <Badge variant="secondary">Inativo</Badge>;
  };

  const modeBadge = () => {
    const modes: Record<string, string> = {
      first_access: '1ª vez',
      date_range: 'Período',
      always: 'Sempre',
    };
    return <Badge variant="outline" className="text-xs">{modes[popup.display_mode] || popup.display_mode}</Badge>;
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden group hover:shadow-lg transition-shadow">
      {/* Image preview */}
      {popup.image_url && (
        <div className="aspect-[2/1] overflow-hidden bg-muted">
          <img src={popup.image_url} alt={popup.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1">{popup.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {statusBadge()}
            {modeBadge()}
          </div>
        </div>

        {/* Date range info */}
        {popup.display_mode === 'date_range' && (popup.starts_at || popup.ends_at) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {popup.starts_at && format(new Date(popup.starts_at), 'dd/MM', { locale: ptBR })}
            {popup.starts_at && popup.ends_at && ' → '}
            {popup.ends_at && format(new Date(popup.ends_at), 'dd/MM', { locale: ptBR })}
          </div>
        )}

        {/* Metrics */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {dismissalCount} visualizações
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(popup.created_at), 'dd/MM/yy')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Switch
              checked={popup.is_active}
              onCheckedChange={(checked) => onToggle(popup.id, checked)}
              className="scale-90"
            />
            <span className="text-xs text-muted-foreground">{popup.is_active ? 'Ativo' : 'Inativo'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(popup)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => onDelete(popup.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
