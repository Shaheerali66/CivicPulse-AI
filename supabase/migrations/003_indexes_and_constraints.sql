-- ============================================================================
-- CivicPulse AI — Database Schema Migration 003: Indexes & Performance Constraints
-- Source of Truth: PRD-02 v2.0 (Section 6.1)
-- All comments use Roman English or Roman Urdu.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Complaints Table Indexes (PRD-02 Section 6.1)
-- Optimized for citizen history, department queues, officer workloads, and tracking.
-- ----------------------------------------------------------------------------

-- Citizen history: Citizen apne complaints dekhta hai latest first
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_history
  ON public.complaints (citizen_id, submitted_at DESC);

-- Department queue: Department officers status aur date ke mutabiq filter karte hain
CREATE INDEX IF NOT EXISTS idx_complaints_dept_status_date
  ON public.complaints (department_id, status, submitted_at DESC);

-- Officer assignment: Officer apne assigned open complaints check karta hai
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_status
  ON public.complaints (assigned_to, status);

-- Tracking lookup: Unique tracking ID verification & fast search
CREATE INDEX IF NOT EXISTS idx_complaints_tracking_id
  ON public.complaints (tracking_id);

-- Category filtering for analytics and routing verification
CREATE INDEX IF NOT EXISTS idx_complaints_category
  ON public.complaints (category);

-- Active complaints partial index (unresolved complaints par fast query)
CREATE INDEX IF NOT EXISTS idx_complaints_active_queue
  ON public.complaints (department_id, priority, submitted_at DESC)
  WHERE status NOT IN ('resolved', 'closed', 'rejected');

-- Publicly visible complaints partial index
CREATE INDEX IF NOT EXISTS idx_complaints_public
  ON public.complaints (submitted_at DESC)
  WHERE is_public = true;

-- ----------------------------------------------------------------------------
-- 2. AI Analyses Indexes
-- Fast lookup of all AI analysis runs per complaint
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_analyses_complaint_history
  ON public.ai_analyses (complaint_id, created_at DESC);

-- Human review queue index
CREATE INDEX IF NOT EXISTS idx_ai_analyses_human_review
  ON public.ai_analyses (created_at DESC)
  WHERE needs_human_review = true;

-- ----------------------------------------------------------------------------
-- 3. Complaint Events (Audit History) Indexes
-- Immutable timeline retrieval for complaint audit logs
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_complaint_events_timeline
  ON public.complaint_events (complaint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaint_events_actor
  ON public.complaint_events (actor_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Notifications Indexes
-- Fast owner-scoped notification queries and unread count lookups
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_user_history
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Department Members Indexes
-- Instant verification of active memberships for RLS and server authorization
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dept_members_user_active
  ON public.department_members (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_dept_members_dept_active
  ON public.department_members (department_id, is_active);

-- ----------------------------------------------------------------------------
-- 6. Complaint Links & Duplicate Groups Indexes
-- Fast duplicate candidate detection and relationship queries
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_complaint_links_source
  ON public.complaint_links (complaint_id);

CREATE INDEX IF NOT EXISTS idx_complaint_links_target
  ON public.complaint_links (related_complaint_id);

CREATE INDEX IF NOT EXISTS idx_complaint_links_group
  ON public.complaint_links (duplicate_group_id);

CREATE INDEX IF NOT EXISTS idx_complaint_links_status
  ON public.complaint_links (review_status);
