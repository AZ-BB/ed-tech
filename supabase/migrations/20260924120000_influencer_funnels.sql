-- Admin-managed influencer landing/signup funnels (dynamic URL slugs + Calendly).

CREATE TABLE IF NOT EXISTS public.influencer_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  calendly_scheduling_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT influencer_funnels_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT influencer_funnels_slug_length CHECK (char_length(slug) >= 2 AND char_length(slug) <= 64),
  CONSTRAINT influencer_funnels_display_name_nonempty CHECK (char_length(trim(display_name)) > 0),
  CONSTRAINT influencer_funnels_calendly_nonempty CHECK (char_length(trim(calendly_scheduling_url)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS influencer_funnels_slug_unique ON public.influencer_funnels (slug);

COMMENT ON TABLE public.influencer_funnels IS
  'Dynamic influencer marketing funnels: public /{locale}/{slug} landing and signup with per-funnel Calendly.';

ALTER TABLE public.influencer_funnels ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.influencer_funnels FROM PUBLIC;
REVOKE ALL ON TABLE public.influencer_funnels FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.influencer_funnels TO service_role;
