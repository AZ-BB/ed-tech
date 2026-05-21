-- Fix search_region_rank: country_code values are uppercase (SA, AE, …) per countries.id and CSV import.

ALTER TABLE public.universities
  DROP COLUMN IF EXISTS search_region_rank;

ALTER TABLE public.universities
  ADD COLUMN search_region_rank smallint GENERATED ALWAYS AS (
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
