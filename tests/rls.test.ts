/**
 * tests/rls.test.ts
 *
 * PRD-02 :: Row Level Security (RLS) Policy Verification.
 * Inspects migration definitions to ensure RLS is enabled across all exposed tables,
 * helper functions use fixed search_path, and policy definitions prevent recursion.
 * All comments use Roman English or Roman Urdu.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("PRD-02 :: Database Migrations & RLS Integrity", () => {
  const migrationsDir = path.resolve(__dirname, "../supabase/migrations");
  const schemaSql = fs.readFileSync(path.join(migrationsDir, "001_initial_schema.sql"), "utf-8");
  const rlsSql = fs.readFileSync(path.join(migrationsDir, "002_rls_policies.sql"), "utf-8");
  const indexSql = fs.readFileSync(path.join(migrationsDir, "003_indexes_and_constraints.sql"), "utf-8");

  describe("Schema Definition (001_initial_schema.sql)", () => {
    it("creates all 8 required tables and audit logs", () => {
      const requiredTables = [
        "profiles",
        "departments",
        "department_members",
        "complaints",
        "ai_analyses",
        "duplicate_groups",
        "complaint_links",
        "complaint_events",
        "notifications",
      ];

      for (const table of requiredTables) {
        expect(schemaSql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, "i"));
      }
    });

    it("enforces tracking_id unique constraint and timestamptz UTC handling", () => {
      expect(schemaSql).toContain("tracking_id TEXT NOT NULL UNIQUE");
      expect(schemaSql).toContain("TIMESTAMPTZ NOT NULL DEFAULT now()");
    });

    it("includes safe onboarding trigger on auth.users with citizen default", () => {
      expect(schemaSql).toContain("CREATE OR REPLACE FUNCTION public.handle_new_user()");
      expect(schemaSql).toContain("'citizen'");
      expect(schemaSql).toContain("ON CONFLICT (id) DO NOTHING");
    });
  });

  describe("Row Level Security Policies (002_rls_policies.sql)", () => {
    it("SEC-21: enables RLS on all sensitive application tables", () => {
      const tablesWithRls = [
        "profiles",
        "departments",
        "department_members",
        "complaints",
        "ai_analyses",
        "duplicate_groups",
        "complaint_links",
        "complaint_events",
        "notifications",
      ];

      for (const table of tablesWithRls) {
        expect(rlsSql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      }
    });

    it("implements helper functions with SECURITY DEFINER and fixed search_path to prevent escalation", () => {
      expect(rlsSql).toContain("FUNCTION public.get_current_user_role()");
      expect(rlsSql).toContain("SECURITY DEFINER");
      expect(rlsSql).toContain("SET search_path = public, auth");

      expect(rlsSql).toContain("FUNCTION public.is_admin()");
      expect(rlsSql).toContain("FUNCTION public.is_department_member(dept_id UUID)");
    });

    it("enforces strict policy on complaint_events ensuring ordinary users cannot modify audit history", () => {
      expect(rlsSql).toContain('CREATE POLICY "complaint_events_select"');
      // No UPDATE or DELETE policy is defined for complaint_events!
      expect(rlsSql).not.toContain('CREATE POLICY "complaint_events_update"');
      expect(rlsSql).not.toContain('CREATE POLICY "complaint_events_delete"');
    });

    it("restricts ai_analyses inserts to admin and trusted server roles", () => {
      expect(rlsSql).toContain('CREATE POLICY "ai_analyses_admin_manage"');
      // Ordinary authenticated users cannot insert into ai_analyses
      expect(rlsSql).not.toContain('CREATE POLICY "ai_analyses_insert_citizen"');
    });
  });

  describe("Indexes & Performance (003_indexes_and_constraints.sql)", () => {
    it("contains all required query indexes specified in PRD-02 Section 6.1", () => {
      const requiredIndexes = [
        "idx_complaints_citizen_history",
        "idx_complaints_dept_status_date",
        "idx_complaints_assigned_status",
        "idx_complaints_tracking_id",
        "idx_ai_analyses_complaint_history",
        "idx_complaint_events_timeline",
        "idx_notifications_user_history",
        "idx_dept_members_user_active",
        "idx_dept_members_dept_active",
        "idx_complaint_links_source",
      ];

      for (const idx of requiredIndexes) {
        expect(indexSql).toContain(idx);
      }
    });
  });
});
