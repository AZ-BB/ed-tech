-- Add fixed Stripe Product IDs for the create-new-price admin pricing flow.
-- Safe if 20260831200000 was applied before stripe_product_id existed in that file.

ALTER TABLE public.stripe_student_products
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

UPDATE public.stripe_student_products
SET stripe_product_id = 'prod_UzJJARAuV1bUeX'
WHERE product_key = 'individual_signup'
  AND (stripe_product_id IS NULL OR stripe_product_id = '');

UPDATE public.stripe_student_products
SET stripe_product_id = 'prod_V2aJchKc8HZwig'
WHERE product_key = 'funnel_subscription'
  AND (stripe_product_id IS NULL OR stripe_product_id = '');

UPDATE public.stripe_student_products
SET stripe_product_id = 'prod_Uvp7Go1v3eOl3O'
WHERE product_key = 'custom_subscription'
  AND (stripe_product_id IS NULL OR stripe_product_id = '');

ALTER TABLE public.stripe_student_products
  ALTER COLUMN stripe_product_id SET NOT NULL;

COMMENT ON COLUMN public.stripe_student_products.stripe_product_id IS
  'Fixed Stripe Product ID; admin pricing saves create new Prices under this product.';
