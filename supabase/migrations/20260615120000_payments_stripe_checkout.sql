ALTER TABLE payments
  ADD COLUMN payment_request_token TEXT UNIQUE,
  ADD COLUMN payment_request_sent_at TIMESTAMPTZ,
  ADD COLUMN stripe_checkout_session_id TEXT;
