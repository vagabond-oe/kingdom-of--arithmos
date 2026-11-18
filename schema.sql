-- ARITHMOS DATABASE SCHEMA

-- 1. STUDENT PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    college_name TEXT,
    team_name TEXT,
    student_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    fictional_name TEXT NOT NULL,
    house TEXT NOT NULL,
    website_role TEXT DEFAULT 'student',
    username TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. STUDENTS CAN VIEW THEIR OWN PROFILE
CREATE POLICY "Students can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);