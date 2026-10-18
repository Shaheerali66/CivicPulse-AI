-- ============================================================================
-- CivicPulse AI — Database Schema Migration 001: Initial Schema
-- Source of Truth: PRD-02 v2.0 (Sections 3 & 5)
-- All comments use Roman English or Roman Urdu.
-- ============================================================================

-- Extensions required
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Helper Function: Automatic updated_at timestamp maintenance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Har update par updated_at ko current timestamp par set karega
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Table: profiles (PRD-02 Section 5.1)
-- Linked directly to auth.users. Stores app-specific user profile data.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'citizen',
  phone TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Validation constraints
  CONSTRAINT chk_profiles_role CHECK (role IN ('citizen', 'officer', 'admin')),
  CONSTRAINT chk_profiles_phone_len CHECK (phone IS NULL OR length(phone) <= 30),
  CONSTRAINT chk_profiles_display_name_len CHECK (display_name IS NULL OR length(display_name) <= 150)
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Table: departments (PRD-02 Section 5.2)
-- Stores municipal departments configured for routing and assignment.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Validation constraints
  CONSTRAINT chk_departments_name_len CHECK (length(name) >= 2 AND length(name) <= 120),
  CONSTRAINT chk_departments_slug_len CHECK (length(slug) >= 2 AND length(slug) <= 120)
);

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Table: department_members (PRD-02 Section 5.3)
-- Maps officers to departments with strict membership role and active state.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_role TEXT NOT NULL DEFAULT 'officer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Unique constraint on (department_id, user_id)
  CONSTRAINT uq_department_members_dept_user UNIQUE (department_id, user_id),
  CONSTRAINT chk_dept_membership_role CHECK (membership_role IN ('officer', 'lead', 'supervisor'))
);

-- ----------------------------------------------------------------------------
-- 5. Table: complaints (PRD-02 Section 5.4)
-- Canonical complaint records with location, category, tracking, and assignments.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT NOT NULL UNIQUE,
  citizen_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'submitted',
  priority TEXT NOT NULL DEFAULT 'medium',
  submission_method TEXT NOT NULL,
  department_id UUID NULL REFERENCES public.departments(id) ON DELETE SET NULL,
  assigned_to UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  location_label TEXT NULL,
  photo_path TEXT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,

  -- Constraints from PRD-02
  CONSTRAINT chk_complaints_title_len CHECK (length(title) >= 3 AND length(title) <= 200),
  CONSTRAINT chk_complaints_description_len CHECK (length(description) >= 10 AND length(description) <= 5000),
  CONSTRAINT chk_complaints_latitude CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  CONSTRAINT chk_complaints_longitude CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
  CONSTRAINT chk_complaints_submission_method CHECK (submission_method IN ('ai', 'manual')),
  CONSTRAINT chk_complaints_status CHECK (status IN (
    'submitted', 'analyzing', 'needs_review', 'assigned',
    'in_progress', 'resolved', 'closed', 'rejected'
  )),
  CONSTRAINT chk_complaints_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT chk_complaints_category CHECK (category IN (
    'road_damage', 'footpath_damage', 'garbage', 'waste_collection',
    'water_leakage', 'blocked_drain', 'streetlight', 'electrical_hazard',
    'other', 'unknown'
  ))
);

CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Table: ai_analyses (PRD-02 Section 5.5)
-- Structured AI analysis results produced by the trusted server workflow.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  model_name TEXT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  suggested_department_category TEXT NULL,
  safety_concern BOOLEAN NOT NULL DEFAULT false,
  needs_human_review BOOLEAN NOT NULL DEFAULT true,
  reasoning_summary TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT chk_ai_confidence_range CHECK (confidence >= 0.0 AND confidence <= 1.0),
  CONSTRAINT chk_ai_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT chk_ai_category CHECK (category IN (
    'road_damage', 'footpath_damage', 'garbage', 'waste_collection',
    'water_leakage', 'blocked_drain', 'streetlight', 'electrical_hazard',
    'other', 'unknown'
  )),
  CONSTRAINT chk_ai_summary_len CHECK (length(summary) >= 5 AND length(summary) <= 1000),
  CONSTRAINT chk_ai_reasoning_len CHECK (reasoning_summary IS NULL OR length(reasoning_summary) <= 1000)
);

-- ----------------------------------------------------------------------------
-- 7. Table: duplicate_groups (PRD-02 Section 5.6)
-- Groups of related or potentially duplicated complaints.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.duplicate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 8. Table: complaint_links (PRD-02 Section 5.7)
-- Explicit relationships between complaints or duplicate groups.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  related_complaint_id UUID NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  duplicate_group_id UUID NULL REFERENCES public.duplicate_groups(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  similarity_score NUMERIC NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,

  -- Constraints
  CONSTRAINT chk_complaint_links_not_self CHECK (related_complaint_id IS NULL OR complaint_id <> related_complaint_id),
  CONSTRAINT chk_complaint_links_target CHECK (related_complaint_id IS NOT NULL OR duplicate_group_id IS NOT NULL),
  CONSTRAINT chk_complaint_links_rel_type CHECK (relationship_type IN ('duplicate', 'related', 'child', 'parent')),
  CONSTRAINT chk_complaint_links_similarity CHECK (similarity_score IS NULL OR (similarity_score >= 0.0 AND similarity_score <= 1.0)),
  CONSTRAINT chk_complaint_links_review_status CHECK (review_status IN ('pending', 'confirmed', 'rejected'))
);

-- ----------------------------------------------------------------------------
-- 9. Table: complaint_events (PRD-02 Section 5.8)
-- Immutable audit log for status, assignment, and processing history.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  previous_value JSONB NULL,
  new_value JSONB NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 10. Table: notifications (PRD-02 Section 5.9)
-- In-app notifications scoped directly to the recipient user.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  complaint_id UUID NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_notifications_title_len CHECK (length(title) >= 1 AND length(title) <= 200),
  CONSTRAINT chk_notifications_msg_len CHECK (length(message) >= 1 AND length(message) <= 2000)
);

-- ----------------------------------------------------------------------------
-- 11. Profile Onboarding Database Trigger
-- Ensures every new user in auth.users receives a safe citizen profile by default.
-- Retries and duplicates are handled safely via ON CONFLICT DO NOTHING.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Naya user hamesha 'citizen' role se initialize hoga (no self-promotion)
  INSERT INTO public.profiles (id, display_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'citizen',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
