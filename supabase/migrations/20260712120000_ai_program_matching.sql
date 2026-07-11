-- AI Program Fit Test: feature flag + usage type
ALTER TYPE ai_usage_type ADD VALUE IF NOT EXISTS 'program_matching';

INSERT INTO system (key, value)
VALUES ('feature_ai_program_matching', 'true')
ON CONFLICT (key) DO NOTHING;
