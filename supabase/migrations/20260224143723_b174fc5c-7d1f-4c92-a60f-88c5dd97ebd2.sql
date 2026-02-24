
-- Create tenant_popups table
CREATE TABLE public.tenant_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.memberships(id),
  title text NOT NULL,
  body_html text NOT NULL,
  image_url text,
  cta_label text,
  cta_url text,
  display_mode text NOT NULL DEFAULT 'first_access',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create popup_dismissals table
CREATE TABLE public.popup_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id uuid NOT NULL REFERENCES public.tenant_popups(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id),
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(popup_id, membership_id)
);

-- Enable RLS
ALTER TABLE public.tenant_popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS for tenant_popups: staff can CRUD within their tenant
CREATE POLICY "Staff can manage popups"
ON public.tenant_popups
FOR ALL
USING (public.is_tenant_staff(auth.uid(), tenant_id))
WITH CHECK (public.is_tenant_staff(auth.uid(), tenant_id));

-- Mentees can view active popups in their tenant
CREATE POLICY "Mentees can view active popups"
ON public.tenant_popups
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_popups.tenant_id
      AND status = 'active'
  )
);

-- RLS for popup_dismissals: users can manage their own dismissals
CREATE POLICY "Users can insert own dismissals"
ON public.popup_dismissals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = popup_dismissals.membership_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
);

CREATE POLICY "Users can view own dismissals"
ON public.popup_dismissals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE id = popup_dismissals.membership_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
);

-- Staff can view all dismissals in their tenant (for metrics)
CREATE POLICY "Staff can view tenant dismissals"
ON public.popup_dismissals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_popups tp
    WHERE tp.id = popup_dismissals.popup_id
      AND public.is_tenant_staff(auth.uid(), tp.tenant_id)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_popups_updated_at
BEFORE UPDATE ON public.tenant_popups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for popup images
INSERT INTO storage.buckets (id, name, public)
VALUES ('popup-images', 'popup-images', true)
ON CONFLICT DO NOTHING;

-- Storage policies for popup-images
CREATE POLICY "Anyone can view popup images"
ON storage.objects FOR SELECT
USING (bucket_id = 'popup-images');

CREATE POLICY "Staff can upload popup images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'popup-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Staff can delete popup images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'popup-images'
  AND auth.role() = 'authenticated'
);
