import { useState, useEffect } from 'react';
import { usePopups, type TenantPopup } from '@/hooks/usePopups';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';
import DOMPurify from 'dompurify';

export function TenantPopupRenderer() {
  const { activePopups, dismissPopup } = usePopups();
  const [currentPopup, setCurrentPopup] = useState<TenantPopup | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (activePopups.length > 0 && !currentPopup) {
      setCurrentPopup(activePopups[0]);
      setOpen(true);
    }
  }, [activePopups, currentPopup]);

  const handleDismiss = () => {
    if (currentPopup) {
      dismissPopup.mutate(currentPopup.id);
    }
    setOpen(false);
    setCurrentPopup(null);
  };

  if (!currentPopup) return null;

  const sanitizedHtml = DOMPurify.sanitize(currentPopup.body_html);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 rounded-2xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 backdrop-blur-sm p-1.5 hover:bg-background transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Banner image */}
        {currentPopup.image_url && (
          <div className="w-full aspect-[2/1] overflow-hidden">
            <img
              src={currentPopup.image_url}
              alt={currentPopup.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">{currentPopup.title}</h2>

          <div
            className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />

          <div className="flex items-center gap-3 pt-2">
            {currentPopup.cta_url && currentPopup.cta_label && (
              <Button
                asChild
                className="flex-1"
              >
                <a href={currentPopup.cta_url} target="_blank" rel="noopener noreferrer">
                  {currentPopup.cta_label}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className={currentPopup.cta_url ? '' : 'w-full'}
            >
              Entendi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
