-- Put United States first in university discovery sort (search_region_rank), then GCC, then other countries.

ALTER TABLE public.universities
  DROP COLUMN IF EXISTS search_region_rank;

ALTER TABLE public.universities
  ADD COLUMN search_region_rank smallint GENERATED ALWAYS AS (
    CASE country_code
      WHEN 'US' THEN 0
      WHEN 'SA' THEN 1
      WHEN 'BH' THEN 2
      WHEN 'AE' THEN 3
      WHEN 'KW' THEN 4
      WHEN 'OM' THEN 5
      WHEN 'QA' THEN 6
      ELSE 7
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS universities_search_region_rank_created_at_idx
  ON public.universities (search_region_rank, created_at DESC);
