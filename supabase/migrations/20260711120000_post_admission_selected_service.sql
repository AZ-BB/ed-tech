-- Persist student-selected post-admission service on cases.

ALTER TABLE public.post_admission_cases
    ADD COLUMN selected_service TEXT NULL,
    ADD COLUMN service_other_detail TEXT NULL;

ALTER TABLE public.post_admission_cases
    ADD CONSTRAINT post_admission_cases_selected_service_check
    CHECK (
        selected_service IS NULL
        OR selected_service IN (
            'visaSupport',
            'accommodation',
            'tuitionPayment',
            'scholarshipSearch',
            'healthTravelInsurance',
            'flightBooking',
            'other'
        )
    );

ALTER TABLE public.post_admission_cases
    ADD CONSTRAINT post_admission_cases_other_detail_check
    CHECK (
        selected_service IS DISTINCT FROM 'other'
        OR (
            service_other_detail IS NOT NULL
            AND btrim(service_other_detail) <> ''
        )
    );

COMMENT ON COLUMN public.post_admission_cases.selected_service IS
    'Student-selected post-admission service key at booking time.';

COMMENT ON COLUMN public.post_admission_cases.service_other_detail IS
    'Free-text detail when selected_service is other.';
