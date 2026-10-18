-- ============================================================================
-- CivicPulse AI — Database Seed Configuration
-- Source of Truth: PRD-02 v2.0 (Section 3.2 & 6.2)
--
-- WARNING: DEMO DATA ONLY - FOR HACKATHON EVALUATION AND LOCAL DEVELOPMENT.
-- NEVER SEED REAL CITIZEN DATA OR COMMIT REAL CREDENTIALS.
-- All comments use Roman English or Roman Urdu.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Demo Departments
-- These are demonstration configuration labels matching PRD-03 routing table.
-- They must not be represented as verified official government departments.
-- ----------------------------------------------------------------------------
INSERT INTO public.departments (id, name, slug, description, is_active)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Roads & Works',
    'roads-works',
    'Demo department for road repairs, potholes, footpath maintenance, and public civil works.',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Sanitation',
    'sanitation',
    'Demo department for solid waste management, litter cleanup, and garbage collection.',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Water & Sewerage',
    'water-sewerage',
    'Demo department for clean water supply leaks, pipeline bursts, and blocked sewerage drains.',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'Electrical & Streetlights',
    'electrical-streetlights',
    'Demo department for non-functioning streetlights, exposed wiring, and electrical hazards.',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'Municipal Services / Human Review',
    'municipal-services',
    'Demo department for general municipal queries, ambiguous reports, and human review triage.',
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();
