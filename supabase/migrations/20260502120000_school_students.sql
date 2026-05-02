-- Allowed emails per school (one-to-many from schools). Signup requires a matching row;
-- signed_up tracks whether that invite has completed registration.

CREATE TABLE school_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    signed_up BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT school_students_email_nonempty CHECK (length(trim(email)) > 0)
);

CREATE UNIQUE INDEX school_students_school_id_email_lower_idx
    ON school_students (school_id, lower(trim(email)));

CREATE INDEX school_students_school_id_idx ON school_students (school_id);

COMMENT ON TABLE school_students IS 'Pre-approved student emails per school; signup matches school code + email. signed_up = registration completed.';

CREATE OR REPLACE FUNCTION school_students_normalize_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER school_students_normalize_email_trigger
    BEFORE INSERT OR UPDATE OF email ON school_students
    FOR EACH ROW
    EXECUTE PROCEDURE school_students_normalize_email();
