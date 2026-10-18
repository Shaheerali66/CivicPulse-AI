-- ============================================================================
-- CivicPulse AI — Database Seed Configuration
-- Real-world Municipal Dataset: Hyderabad, Sindh, Pakistan
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Hyderabad Municipal Departments
-- Official civic service departments for complaint routing in Hyderabad.
-- ----------------------------------------------------------------------------
INSERT INTO public.departments (name, slug, description, is_active)
VALUES
  (
    'Hyderabad Municipal Corporation (HMC)',
    'hmc-hyderabad',
    'Solid waste management, municipal sanitation, streetlights, local public parks, and neighborhood infrastructure.',
    true
  ),
  (
    'Hyderabad Water & Sewerage Corporation (HWASA)',
    'hwasa-hyderabad',
    'Potable water supply networks, main pipelines, sewer overflow containment, and blocked drainage clearing.',
    true
  ),
  (
    'Hyderabad Electric Supply Company (HESCO)',
    'hesco-hyderabad',
    'Grid electricity distribution, pole transformers, exposed live high-voltage wiring, and power safety hazards.',
    true
  ),
  (
    'Provincial Works & Services Department',
    'works-services-sindh',
    'Provincial highways, main arterial boulevards, major flyovers, bridges, and primary civic transport corridors.',
    true
  ),
  (
    'Town Municipal Corporation (Latifabad/Qasimabad)',
    'tmc-zonal',
    'Zonal sweeping, neighborhood drain desilting, local encroachment monitoring, and union committee civic works.',
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();
