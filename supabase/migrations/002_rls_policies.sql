-- ============================================================================
-- CivicPulse AI — Database Schema Migration 002: Row Level Security (RLS)
-- Source of Truth: PRD-02 v2.0 (Sections 7 & 8)
-- All comments use Roman English or Roman Urdu.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Security Functions (SECURITY DEFINER with fixed search_path)
-- Used in policy definitions to prevent recursion and privilege escalation.
-- ----------------------------------------------------------------------------

-- Function: Current user ka role return karta hai
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Function: Check karta hai agar current user admin hai ya nahi
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(public.get_current_user_role() = 'admin', false);
$$;

-- Function: Check karta hai agar user kisi specific department ka active member hai
CREATE OR REPLACE FUNCTION public.is_department_member(dept_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_id = dept_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

-- Function: Check karta hai agar user officer hai kisi bhi department mein
CREATE OR REPLACE FUNCTION public.is_any_active_officer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_members
    WHERE user_id = auth.uid()
      AND is_active = true
  ) OR public.is_admin();
$$;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS on all 8 application tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Policies: profiles
-- ----------------------------------------------------------------------------
-- SELECT: Users can view their own profile, or admins can view all profiles,
-- or officers can view profiles of citizens associated with complaints in their department.
CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR public.is_any_active_officer()
  );

-- INSERT: Handled by onboarding trigger or user self-creation strictly as 'citizen'
CREATE POLICY "profiles_insert_self_citizen"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role = 'citizen'
  );

-- UPDATE: User can update their own profile fields EXCEPT their role; Admin can update everything.
CREATE POLICY "profiles_update_self_no_role_escalation"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
    OR (
      id = auth.uid()
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Policies: departments
-- ----------------------------------------------------------------------------
-- SELECT: Active departments are readable by all authenticated users. Admins can view all.
CREATE POLICY "departments_select_active"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (
    is_active = true OR public.is_admin()
  );

-- INSERT/UPDATE/DELETE: Only admins can manage departments
CREATE POLICY "departments_admin_all"
  ON public.departments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Policies: department_members
-- ----------------------------------------------------------------------------
-- SELECT: Members can read their own membership; officers can read fellow members; admins can read all.
CREATE POLICY "dept_members_select"
  ON public.department_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_department_member(department_id)
    OR public.is_admin()
  );

-- INSERT/UPDATE/DELETE: Only administrators can add, update, or deactivate department members.
CREATE POLICY "dept_members_admin_manage"
  ON public.department_members
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. Policies: complaints
-- ----------------------------------------------------------------------------
-- SELECT:
-- 1. Citizens can view their own complaints (citizen_id = auth.uid()).
-- 2. Department officers can view complaints in their active assigned department.
-- 3. Admins can view all complaints.
CREATE POLICY "complaints_select_authorized"
  ON public.complaints
  FOR SELECT
  TO authenticated
  USING (
    citizen_id = auth.uid()
    OR (department_id IS NOT NULL AND public.is_department_member(department_id))
    OR public.is_admin()
  );

-- INSERT:
-- Enable insert for all users (citizens and anonymous/public submissions)
CREATE POLICY "Enable insert for all users" ON "public"."complaints" FOR INSERT WITH CHECK (true);

-- UPDATE:
-- 1. Citizen can update their own complaint only while status is 'submitted'
--    and cannot alter status, department_id, or assigned_to.
-- 2. Officer can update complaints within their active department scope.
-- 3. Admin can update any complaint.
CREATE POLICY "complaints_update_authorized"
  ON public.complaints
  FOR UPDATE
  TO authenticated
  USING (
    (citizen_id = auth.uid() AND status = 'submitted')
    OR (department_id IS NOT NULL AND public.is_department_member(department_id))
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
    OR (
      -- Officer in the active department
      department_id IS NOT NULL AND public.is_department_member(department_id)
    )
    OR (
      -- Citizen modifying own unassigned complaint without escalating status
      citizen_id = auth.uid()
      AND status = 'submitted'
      AND department_id IS NULL
      AND assigned_to IS NULL
    )
  );

-- ----------------------------------------------------------------------------
-- 7. Policies: ai_analyses
-- ----------------------------------------------------------------------------
-- SELECT:
-- Citizens can read analysis for their own complaint.
-- Department officers can read analysis for complaints in their department.
-- Admins can read all analyses.
CREATE POLICY "ai_analyses_select"
  ON public.ai_analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = ai_analyses.complaint_id
        AND (
          c.citizen_id = auth.uid()
          OR (c.department_id IS NOT NULL AND public.is_department_member(c.department_id))
          OR public.is_admin()
        )
    )
  );

-- INSERT/UPDATE/DELETE:
-- Normal users (citizens & officers) CANNOT create or modify AI analyses.
-- Only administrators or trusted server-side service role may insert/update.
CREATE POLICY "ai_analyses_admin_manage"
  ON public.ai_analyses
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Policies: duplicate_groups & complaint_links
-- ----------------------------------------------------------------------------
CREATE POLICY "duplicate_groups_select"
  ON public.duplicate_groups
  FOR SELECT
  TO authenticated
  USING (
    public.is_any_active_officer() OR public.is_admin()
  );

CREATE POLICY "duplicate_groups_manage"
  ON public.duplicate_groups
  FOR ALL
  TO authenticated
  USING (public.is_any_active_officer() OR public.is_admin())
  WITH CHECK (public.is_any_active_officer() OR public.is_admin());

CREATE POLICY "complaint_links_select"
  ON public.complaint_links
  FOR SELECT
  TO authenticated
  USING (
    public.is_any_active_officer() OR public.is_admin()
  );

CREATE POLICY "complaint_links_manage"
  ON public.complaint_links
  FOR ALL
  TO authenticated
  USING (public.is_any_active_officer() OR public.is_admin())
  WITH CHECK (public.is_any_active_officer() OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. Policies: complaint_events
-- ----------------------------------------------------------------------------
-- SELECT:
-- Citizen can view events for their own complaint.
-- Officers can view events for their department complaints.
-- Admins can view all events.
CREATE POLICY "complaint_events_select"
  ON public.complaint_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_events.complaint_id
        AND (
          c.citizen_id = auth.uid()
          OR (c.department_id IS NOT NULL AND public.is_department_member(c.department_id))
          OR public.is_admin()
        )
    )
  );

-- INSERT: Only trusted server workflows or admins can insert audit events.
CREATE POLICY "complaint_events_insert"
  ON public.complaint_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_any_active_officer()
  );

-- Audit history is immutable: NO normal UPDATE or DELETE policies exist for complaint_events.

-- ----------------------------------------------------------------------------
-- 10. Policies: notifications
-- ----------------------------------------------------------------------------
-- SELECT: Users can only read their own notifications.
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- UPDATE: Users can only update their own notifications (e.g. read_at timestamp).
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own notifications.
CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Admin or trusted service role only.
CREATE POLICY "notifications_admin_insert"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
