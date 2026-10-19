-- ============================================================================
-- CivicPulse AI — Database Schema Migration 004: Public Complaint Submissions
-- Allows anonymous/public complaints submission while maintaining RLS
-- ============================================================================

DROP POLICY IF EXISTS "complaints_insert_citizen" ON "public"."complaints";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."complaints";

CREATE POLICY "Enable insert for all users" ON "public"."complaints" FOR INSERT WITH CHECK (true);
