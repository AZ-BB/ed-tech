-- University Search: GCC countries first (sa, bh, ae, kw, om, qa), then others.
-- Ranks mirror src/lib/university-search-gcc.ts

ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS search_region_rank smallint GENERATED ALWAYS AS (
    CASE country_code
      WHEN 'SA' THEN 0
      WHEN 'BH' THEN 1
      WHEN 'AE' THEN 2
      WHEN 'KW' THEN 3
      WHEN 'OM' THEN 4
      WHEN 'QA' THEN 5
      ELSE 6
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS universities_search_region_rank_created_at_idx
  ON public.universities (search_region_rank, created_at DESC);
