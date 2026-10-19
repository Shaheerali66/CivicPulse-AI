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

-- ----------------------------------------------------------------------------
-- 2. Sample Complaints for Hyderabad Citizen Portal & Officer Dashboard
-- ----------------------------------------------------------------------------
INSERT INTO public.complaints (
  tracking_id, title, description, category, status, priority,
  submission_method, department_id, location_label, latitude, longitude,
  is_public, submitted_at, updated_at
)
VALUES
  (
    'CP-20261019-00TE',
    'Major Sewer Overflow & Road Erosion',
    'Severely blocked main sewer line spilling untreated waste water across the thoroughfare, eroding asphalt and posing an urgent public health hazard.',
    'water_leakage',
    'in_progress',
    'critical',
    'ai',
    (SELECT id FROM public.departments WHERE slug = 'hwasa-hyderabad' LIMIT 1),
    'Autobahn Road, Unit 7 Latifabad, Hyderabad',
    25.3789,
    68.3512,
    true,
    now() - INTERVAL '1 day',
    now()
  ),
  (
    'CP-20261018-AVQ3',
    'Streetlight Circuit Fault & Boulevard Blackout',
    'Series of 14 municipal sodium/LED streetlights non-functional along central boulevard corridor, creating severe night-time road safety hazards.',
    'streetlight',
    'assigned',
    'medium',
    'ai',
    (SELECT id FROM public.departments WHERE slug = 'hmc-hyderabad' LIMIT 1),
    'Thandi Sarak near Hyderabad Gymkhana, Hyderabad',
    25.3985,
    68.3687,
    true,
    now() - INTERVAL '2 days',
    now()
  ),
  (
    'CP-20261018-FVA9',
    'Unattended Solid Waste & Commercial Garbage Dump',
    'Heavy overflow of commercial market solid waste blocking the pedestrian walkway and attracting stray animals near central market entrance.',
    'garbage',
    'submitted',
    'medium',
    'ai',
    (SELECT id FROM public.departments WHERE slug = 'hmc-hyderabad' LIMIT 1),
    'Market Tower Road, City Hyderabad',
    25.3948,
    68.3719,
    true,
    now() - INTERVAL '3 days',
    now()
  ),
  (
    'CP-20261018-8FJ2',
    'Deep Pothole Cluster & Dangerous Crater',
    'Multiple connected deep potholes on main arterial route causing vehicle suspension failure and acute commuter safety issues.',
    'road_damage',
    'resolved',
    'high',
    'ai',
    (SELECT id FROM public.departments WHERE slug = 'works-services-sindh' LIMIT 1),
    'Qasimabad Main Boulevard, Sector A, Hyderabad',
    25.4012,
    68.3421,
    true,
    now() - INTERVAL '4 days',
    now()
  )
ON CONFLICT (tracking_id) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  updated_at = now();

