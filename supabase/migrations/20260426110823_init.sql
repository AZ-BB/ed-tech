CREATE TABLE countries
(
    id VARCHAR(2) PRIMARY KEY,
    name TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE universities
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT DEFAULT NULL,
    country_code VARCHAR(2) NOT NULL REFERENCES countries(id),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT DEFAULT NULL,
    ranking INTEGER DEFAULT NULL,
    logo_url TEXT DEFAULT NULL,
    acceptance_rate INTEGER DEFAULT NULL,
    intl_students INTEGER DEFAULT NULL,

    website_url TEXT DEFAULT NULL,
    email TEXT DEFAULT NULL,
    phone TEXT DEFAULT NULL,
    admission_page_url TEXT DEFAULT NULL,
    address TEXT DEFAULT NULL,

    ielts_min_score FLOAT DEFAULT NULL,
    toefl_min_score INTEGER DEFAULT NULL,
    sat_policy TEXT DEFAULT NULL,
    documents JSONB DEFAULT NULL,

    deadline_date DATE DEFAULT NULL,
    is_priority BOOLEAN NOT NULL DEFAULT FALSE,
    method TEXT DEFAULT NULL,
    application_fee FLOAT DEFAULT NULL,
    intakes TEXT DEFAULT NULL,

    tuition_per_year FLOAT DEFAULT NULL,
    estimated_living_cost_per_year FLOAT DEFAULT NULL,
    is_scholarship_available BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE majors
(
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE programs
(
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    major_id INTEGER NOT NULL REFERENCES majors(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE university_majors
(
    id SERIAL PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id),
    major_id INTEGER NOT NULL REFERENCES majors(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE university_major_programs
(
    id SERIAL PRIMARY KEY,
    university_major_id INTEGER NOT NULL REFERENCES university_majors(id),
    program_id INTEGER NOT NULL REFERENCES programs(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE scholarship_type AS ENUM
('government', 'university', 'corporate', 'foundation', 'other');
CREATE TYPE scholarship_competition_type AS ENUM
('low', 'medium', 'high', 'very_high');
CREATE TYPE tuition_type AS ENUM
('full', 'partial');

CREATE TABLE scholarships
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    target_students TEXT DEFAULT NULL,

    level TEXT DEFAULT NULL,
    fields JSONB DEFAULT NULL,

    is_renewable BOOLEAN NOT NULL DEFAULT FALSE,
    coverage INTEGER DEFAULT NULL,
    type scholarship_type DEFAULT NULL,

    nationality_country_code VARCHAR(2) NOT NULL REFERENCES countries(id),
    city TEXT DEFAULT NULL,
    academic_eligibility TEXT DEFAULT NULL,
    ielts_min_score FLOAT DEFAULT NULL,
    toefl_min_score INTEGER DEFAULT NULL,
    sat_policy TEXT DEFAULT NULL,
    documents JSONB DEFAULT NULL,

    deadline_date DATE DEFAULT NULL,
    is_priority BOOLEAN NOT NULL DEFAULT FALSE,
    application_fee FLOAT DEFAULT NULL,
    intakes TEXT DEFAULT NULL,
    other TEXT DEFAULT NULL,
    docuemnts JSONB DEFAULT NULL,

    deadline TEXT DEFAULT NULL,
    method TEXT DEFAULT NULL,
    competition scholarship_competition_type DEFAULT NULL,

    tuition_type tuition_type DEFAULT NULL,
    tuition TEXT DEFAULT NULL,
    travel TEXT DEFAULT NULL,
    other_benefits TEXT DEFAULT NULL,
    living_stipend TEXT DEFAULT NULL,
    tooltip TEXT DEFAULT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scholarship_destinations
(
    id SERIAL PRIMARY KEY,
    scholarship_id UUID NOT NULL REFERENCES scholarships(id),
    country_code VARCHAR(2) NOT NULL REFERENCES countries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE advisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT DEFAULT NULL,

    title TEXT DEFAULT NULL,
    experience_years INTEGER DEFAULT NULL,
    nationality_country_code VARCHAR(2) NOT NULL REFERENCES countries(id),

    languages TEXT DEFAULT NULL,
    avatar_url TEXT DEFAULT NULL,

    description TEXT DEFAULT NULL,
    best_for TEXT DEFAULT NULL,

    session_for TEXT DEFAULT NULL,
    session_coverage JSONB DEFAULT NULL,
    about TEXT DEFAULT NULL,

    questions JSONB DEFAULT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE advisor_specializations_countries (
    id SERIAL PRIMARY KEY,
    advisor_id UUID NOT NULL REFERENCES advisors(id),
    country_code VARCHAR(2) NOT NULL REFERENCES countries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE advisor_tags (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE advisor_tags_joint (
    id SERIAL PRIMARY KEY,
    advisor_id UUID NOT NULL REFERENCES advisors(id),
    tag_id INTEGER NOT NULL REFERENCES advisor_tags(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE ambassadors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,

    avatar_url TEXT DEFAULT NULL,

    start_year INTEGER DEFAULT NULL,
    graduation_year INTEGER DEFAULT NULL,
    is_current_student BOOLEAN NOT NULL DEFAULT FALSE,

    destination_country_code VARCHAR(2) NOT NULL REFERENCES countries(id),
    nationality_country_code VARCHAR(2) NOT NULL REFERENCES countries(id),

    university_id UUID DEFAULT NULL REFERENCES universities(id),
    university_name TEXT DEFAULT NULL,

    major TEXT DEFAULT NULL,

    has_msc BOOLEAN NOT NULL DEFAULT FALSE,
    has_phd BOOLEAN NOT NULL DEFAULT FALSE,

    about TEXT DEFAULT NULL,
    help_in JSONB DEFAULT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ambassador_tags (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ambassador_tags_joint (
    id SERIAL PRIMARY KEY,
    ambassador_id UUID NOT NULL REFERENCES ambassadors(id),
    tag_id INTEGER NOT NULL REFERENCES ambassador_tags(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'moderator');

CREATE TABLE admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,

    phone TEXT DEFAULT NULL,
    avatar_url TEXT DEFAULT NULL,

    role admin_role DEFAULT 'admin',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country_code VARCHAR(2) NOT NULL REFERENCES countries(id),
    contact_email TEXT NOT NULL,
    
    students_limit INTEGER DEFAULT NULL,
    credit_pool INTEGER DEFAULT NULL,

    default_ambasador_credit_limit INTEGER DEFAULT NULL,
    default_advisor_credit_limit INTEGER DEFAULT NULL,

    code TEXT NOT NULL UNIQUE,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE school_recharge_history (
    id SERIAL PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id),
    amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE gender AS ENUM ('male', 'female');

CREATE TABLE school_admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    school_id UUID NOT NULL REFERENCES schools(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,
    gender gender DEFAULT 'male',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE student_status AS ENUM ('high_priority', 'at_risk', 'missing_docs');

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT NULL,

    nationality_country_code VARCHAR(2) NOT NULL REFERENCES countries(id),

    status student_status DEFAULT NULL,

    school_id UUID NOT NULL REFERENCES schools(id),

    notification_app_updates BOOLEAN NOT NULL DEFAULT TRUE,
    notification_news_platform BOOLEAN NOT NULL DEFAULT TRUE,

    ambassador_credit_limit INTEGER DEFAULT NULL,
    advisor_credit_limit INTEGER DEFAULT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE ai_usage_type AS ENUM ('matching', 'essay_review');

CREATE TABLE ai_usage (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES student_profiles(id),
    inputs JSONB NOT NULL,
    outputs JSONB NOT NULL,

    type ai_usage_type DEFAULT 'matching',

    model TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    cost FLOAT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TYPE student_activity_type AS ENUM ('save', 'shortlist', 'block');
CREATE TYPE student_activity_entity_type AS ENUM ('university', 'scholarship', 'advisor', 'ambassador');

CREATE TABLE student_activities (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES student_profiles(id),

    type student_activity_type DEFAULT 'save',
    entity_type student_activity_entity_type NOT NULL,

    uni_id UUID DEFAULT NULL REFERENCES universities(id),
    scholarship_id UUID DEFAULT NULL REFERENCES scholarships(id),
    advisor_id UUID DEFAULT NULL REFERENCES advisors(id),
    ambassador_id UUID DEFAULT NULL REFERENCES ambassadors(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE advisor_session_status AS ENUM ('pending', 'completed', 'cancelled', 'confirmed');
CREATE TABLE advisor_sessions (
    id SERIAL PRIMARY KEY,
    advisor_id UUID NOT NULL REFERENCES advisors(id),
    student_id UUID NOT NULL REFERENCES student_profiles(id),

    destination_country_code VARCHAR(2) NOT NULL REFERENCES countries(id),
    current_stage TEXT NOT NULL,
    specific_uni TEXT DEFAULT NULL,
    help_with TEXT DEFAULT NULL,

    status advisor_session_status DEFAULT 'pending',
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE ambassador_session_request_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled');
CREATE TABLE ambassador_session_requests (
    id SERIAL PRIMARY KEY,
    ambassador_id UUID NOT NULL REFERENCES ambassadors(id),
    student_id UUID NOT NULL REFERENCES student_profiles(id),

    pref_time_1 TIMESTAMP WITH TIME ZONE NOT NULL,
    pref_time_2 TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    pref_time_3 TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    discussion_topics TEXT DEFAULT NULL,
    status ambassador_session_request_status DEFAULT 'pending',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE student_credits_type AS ENUM ('advisor', 'ambassador');
CREATE TYPE student_credits_status AS ENUM ('used', 'refunded');
CREATE TABLE student_credits_history (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES student_profiles(id),
    school_id UUID NOT NULL REFERENCES schools(id),
    
    amount INTEGER NOT NULL,
    type student_credits_type NOT NULL,
    advisor_session_id INTEGER DEFAULT NULL REFERENCES advisor_sessions(id),
    ambassador_session_request_id INTEGER DEFAULT NULL REFERENCES ambassador_session_requests(id),

    status student_credits_status DEFAULT 'used',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    price INTEGER NOT NULL,
    universities_count INTEGER NOT NULL,
    is_most_popular BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE application_curriculum_type AS ENUM ('ib', 'a_level', 'american','french', 'indian', 'national', 'other');
CREATE TYPE application_status AS ENUM ('new', 'assigned', 'in_progress', 'blocked', 'submitted');
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES student_profiles(id),

    school_id UUID DEFAULT NULL REFERENCES schools(id),
    school_name TEXT DEFAULT NULL,

    curriculum application_curriculum_type DEFAULT NULL,
    expected_graduation_year INTEGER DEFAULT NULL,

    preferences_universities JSONB DEFAULT NULL,
    preferences_universities_notes TEXT DEFAULT NULL,

    final_grade TEXT NOT NULL,
    gpa FLOAT DEFAULT NULL,

    sat FLOAT DEFAULT NULL,
    act FLOAT DEFAULT NULL,
    ielts FLOAT DEFAULT NULL,
    toefl FLOAT DEFAULT NULL,

    inteended_fields TEXT NOT NULL,
    open_to_realted_fields BOOLEAN NOT NULL DEFAULT FALSE,

    preferred_uni_or_countries TEXT NOT NULL,
    extracurricular_activities TEXT NOT NULL,

    awards TEXT DEFAULT NULL,
    additional_notes TEXT DEFAULT NULL,

    status application_status DEFAULT 'new',
    assigned_to UUID DEFAULT NULL REFERENCES admins(id),

    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    in_progress_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,

    plan_id INTEGER NOT NULL REFERENCES applications_plans(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE application_document_type AS ENUM ('passport', 'transcript', 'english_test_result', 'personal_statement', 'recommendation_letter', 'cv', 'certificate', 'award', 'portfolio');
CREATE TABLE application_documents (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES applications(id),

    type application_document_type NOT NULL,
    url TEXT NOT NULL,

    recommender_name TEXT DEFAULT NULL,
    recommender_email TEXT DEFAULT NULL,

    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES student_profiles(id),
    application_id INTEGER NOT NULL REFERENCES applications(id),
    amount INTEGER NOT NULL,
    status payment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TYPE activity_log_entity_type AS ENUM ('student', 'school_admin', 'admin');
CREATE TABLE acitivity_logs (
    id SERIAL PRIMARY KEY,
    entitiy_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,

    action TEXT NOT NULL,
    message TEXT NOT NULL,

    created_by_type activity_log_entity_type NOT NULL,
    admin_id UUID DEFAULT NULL REFERENCES admins(id),
    school_admin_id UUID DEFAULT NULL REFERENCES school_admin_profiles(id),
    student_id UUID DEFAULT NULL REFERENCES student_profiles(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);