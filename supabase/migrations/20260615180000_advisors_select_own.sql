-- Allow advisors to read their own profile row (including inactive) for portal guards.
DROP POLICY IF EXISTS advisors_select_own ON public.advisors;
CREATE POLICY advisors_select_own
  ON public.advisors
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower((auth.jwt() ->> 'email')));
