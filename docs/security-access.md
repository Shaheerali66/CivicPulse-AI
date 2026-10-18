# CivicPulse AI — Security Architecture & Access Control
**Document Reference:** PRD-02 Section 4, 7, 8, 9, 11  
**Version:** 2.0 (Consolidated Implementation Specification)  
**Status:** Approved Reference Architecture  

---

## 1. Role-Based Access Control (RBAC) Matrix

| Capability | Citizen | Department Officer | Administrator |
| :--- | :---: | :---: | :---: |
| **Self-Registration & Login** | Yes | Yes | Yes |
| **Submit Complaints** | Yes | Yes | Yes |
| **View Own Complaints** | Yes | Yes | Yes |
| **View Department Complaints Queue** | No | Active department only | Yes (all departments) |
| **Update Complaint Status** | No (cannot transition) | Active department only | Yes (full lifecycle) |
| **Assign Department & Officers** | No | In-department assignment | Yes (any department) |
| **View Internal Notes** | No (strictly stripped) | Active department only | Yes |
| **Modify User Roles** | No (self-escalation blocked) | No | Yes (audited) |
| **Manage Department Memberships** | No | No | Yes (audited) |
| **Trigger AI Analysis** | Own complaint (throttled) | Active department | Yes |
| **Upload Photo Evidence** | Own submitted complaints | Active department | Yes |
| **Read Photo Evidence** | Own complaints (signed URL) | Active department | Yes |
| **Access Audit Events** | Public-facing status only | Operational history | Full audit history |
| **View In-App Notifications** | Own notifications only | Own notifications only | Own notifications only |

---

## 2. Row Level Security (RLS) Policy Specifications

PostgreSQL RLS is enabled on all 9 application tables:

### 1. `public.profiles`
- **SELECT:** `id = auth.uid() OR is_admin() OR is_any_active_officer()`
- **INSERT:** `id = auth.uid() AND role = 'citizen'`
- **UPDATE:** User can update `display_name` and `phone`, but `role` cannot be altered unless `is_admin()`.

### 2. `public.departments`
- **SELECT:** `is_active = true OR is_admin()`
- **INSERT/UPDATE/DELETE:** `is_admin()` only.

### 3. `public.department_members`
- **SELECT:** `user_id = auth.uid() OR is_department_member(department_id) OR is_admin()`
- **INSERT/UPDATE/DELETE:** `is_admin()` only.

### 4. `public.complaints`
- **SELECT:** `citizen_id = auth.uid() OR (department_id IS NOT NULL AND is_department_member(department_id)) OR is_admin()`
- **INSERT:** `citizen_id = auth.uid() AND status = 'submitted' AND department_id IS NULL AND assigned_to IS NULL`
- **UPDATE:** Citizen can edit non-assigned complaints in `submitted` status; officers can edit within active department scope; admins unrestricted.

### 5. `public.ai_analyses`
- **SELECT:** Allowed if caller can view the parent complaint.
- **INSERT/UPDATE/DELETE:** Admin or trusted server-side service role only. **Citizens CANNOT insert or edit trusted AI records.**

### 6. `public.complaint_events`
- **SELECT:** Allowed if caller can view the parent complaint.
- **INSERT:** Trusted server-side logic only.
- **UPDATE/DELETE:** **NO POLICIES DEFINED** — Audit history is completely immutable.

### 7. `public.notifications`
- **SELECT/UPDATE/DELETE:** `user_id = auth.uid()`
- **INSERT:** Trusted service role / admin only.

---

## 3. Storage Security (Private Bucket `complaint-photos`)

1. **Bucket Configuration:** `public = false`. Direct HTTP object URLs return `403 Forbidden`.
2. **Access Mechanism:** Short-lived signed download URLs generated via `@/lib/storage/complaint-storage`.
3. **URL Expiration:** Maximum 300 seconds (5 minutes).
4. **Path Sanitization:** `private/complaints/{complaintId}/{randomUUID}.{ext}` ensures zero path traversal and no exposure of original filenames.

---

## 4. Secret Management & Key Rotation Procedure

### Environment Secret Segregation
- **Browser-Safe (`NEXT_PUBLIC_`):**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Server-Only (Protected by `import "server-only"`):**
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `AI_API_KEY`
  - `AI_MODEL`

### Key Compromise Response Protocol
1. Revoke the compromised API key or service role key in the Supabase or Google Cloud console immediately.
2. Generate a new secret and update deployment environment variables (Vercel / production host).
3. Invalidate active user sessions if session tokens were suspected of compromise.
4. Review `complaint_events` for unauthorized administrative role escalations during the exposure window.
