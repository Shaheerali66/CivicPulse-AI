# CivicPulse AI — Backup, Recovery & Disaster Readiness Guide
**Document Reference:** PRD-02 Section 15 & SEC-10  
**Version:** 1.0 (Hackathon Release Candidate)  
**Classification:** Internal Operational Security  

---

## 1. Executive Summary & Platform Assessment

CivicPulse AI relies on Supabase PostgreSQL for relational complaint, user, and audit data, and Supabase Storage (private S3-compatible object store) for uploaded complaint photos.

| Component | Architecture | Default Frequency | Retention | Restoration Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Relational Database** | Supabase PostgreSQL | Daily automated snapshot (Pro tier) / Manual logical dump (Free/Demo) | 7 days (Free: manual only, Pro: 7 days, Team: 30-day PITR) | Supabase Dashboard Restore or `psql` restore of logical dump |
| **Private File Storage** | Supabase Storage (`complaint-photos`) | AWS S3 99.999999999% durability underlying | Permanent until deleted or complaint archived | Bucket replication / manual S3 sync script |

> **IMPORTANT DISCLAIMER (PRD-02 Section 15.2):**  
> For the hackathon demonstration, automated Point-in-Time Recovery (PITR) is not guaranteed on free-tier test projects without an upgraded enterprise plan. Do not advertise sub-minute RPO/RTO until verified on dedicated production infrastructure.

---

## 2. Recovery Objectives

- **Target RPO (Recovery Point Objective):** 24 hours (daily backup) on standard tier; up to 5 minutes if PITR is active.
- **Target RTO (Recovery Time Objective):** 2 hours for full database restoration and schema verification in staging.

---

## 3. Database Restoration Procedure (Step-by-Step)

### Step 1: Secure the Environment
1. Identify the incident or corruption trigger.
2. If credentials or service keys were compromised, rotate `SUPABASE_SERVICE_ROLE_KEY` and database passwords immediately.
3. Pause write operations on the active Next.js deployment if data corruption is ongoing.

### Step 2: Retrieve Backup Artifact
- **Option A (Supabase Dashboard):** Navigate to *Project Settings > Database > Backups*. Select the desired snapshot timestamp and initiate restore.
- **Option B (Logical pg_dump):** If restoring from a secured offline dump:
  ```bash
  # Restore schema and data into a clean staging database
  psql -h db.[PROJECT_REF].supabase.co -U postgres -d postgres -f civicpulse_backup_YYYYMMDD.sql
  ```

### Step 3: Run Post-Restore Verification
1. Verify database migrations status:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
2. Verify Row Level Security is active on all 8 tables:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   -- Every row must have rowsecurity = true
   ```
3. Check complaint and tracking ID counts:
   ```sql
   SELECT count(*) FROM public.complaints;
   SELECT count(*) FROM public.complaint_events;
   ```

---

## 4. Storage & File Reference Synchronization (SEC-25)

Because database records and Supabase Storage objects reside in distinct storage subsystems, a database restore may reference photos that were created after the backup snapshot, or vice-versa.

### Detection Script for Missing Evidence
Run a reconciliation query to detect dangling file references:
```sql
SELECT id, tracking_id, photo_path 
FROM public.complaints 
WHERE photo_path IS NOT NULL;
```
If a photo object is missing from the `complaint-photos` bucket:
1. `getSignedPhotoUrl()` gracefully returns `null` and logs a warning: `[CivicPulse Storage] Failed to create signed URL`.
2. The UI displays an advisory: *"Evidence photo unavailable or pending archival retrieval"*, preventing unhandled exceptions or 500 errors.

---

## 5. Rehearsal & Verification Checklist

- [x] Schema migration files (`001`, `002`, `003`) execute cleanly on blank database.
- [x] Seed configuration loads demo departments without conflict.
- [x] RLS policies prevent cross-tenant leakage following schema reload.
- [x] Storage paths follow `private/complaints/{id}/{uuid}.{ext}` structure.
- [x] No secrets or credentials committed to repository or backup dumps.
