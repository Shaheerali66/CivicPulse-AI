# CivicPulse AI — PRD-02: Database, Authentication & Security

> Converted from the supplied PDF. Content is kept in original page order; page separators are included for traceability. PDF text extraction may not preserve every visual layout detail exactly (for example, complex tables or diagrams).

<!-- PDF page 1 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                               Page 1

CivicPulse AI
PRD-02 — Database, Authentication & Security
NYLP AI Hackathon 2026 | Product Requirements Document
Version 2.0 — Consolidated Implementation Specification

  Document control                 Details

  Project                          CivicPulse AI

  Event                            NYLP AI Hackathon 2026

  Version                          2.0 — Consolidated Implementation Specification

  Status                           Ready for implementation

  Priority                         Critical

  Primary owners                   Backend, Database, Authentication & Security Team

  Related PRDs                     PRD-01 Frontend & Citizen Experience; PRD-03 AI, Routing, Duplicate Detection & Priority;
                                   PRD-04 Dashboards, Integration & Deployment

1. Product overview

CivicPulse AI is an AI-powered civic complaint management platform designed to help citizens report municipal
issues, track complaint progress, and help authorized staff review, assign, and resolve reports.
PRD-02 defines the secure data and access foundation of the platform. It specifies the database schema,
authentication, role-based permissions, Row Level Security (RLS), private file storage, API authorization, audit
history, privacy controls, and security testing.

All frontend and backend modules must use the same database model and permission rules.

1.1 Core principles
   Security must be enforced on the server and database, not only in the UI.
   Citizens may access only the complaints and information they are authorized to see.
   Officers may access complaints within their authorized department scope.
   Administrators may manage system configuration according to explicit permissions.
   AI output is advisory and must not bypass authorization or human-review requirements.
   Private complaint photos and personal information must not be publicly accessible.
   Sensitive actions must produce an auditable record.
   The system must not claim that a complaint was officially forwarded to a government authority unless an
    authorized integration actually exists.
   The hackathon deployment must be treated as a demo system unless production authorization, operational
    controls, and official integrations are verified.

2. Objectives and non-goals

2.1 Objectives
1   Create a reliable relational database for complaints, users, departments, AI analyses, duplicate relationships,
    and status events.
2   Implement secure citizen, officer, and administrator authentication.
3   Enforce role and department permissions across database queries, APIs, and file storage.

---

<!-- PDF page 2 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                                    Page 2

4   Protect private information, credentials, and uploaded evidence.
5   Maintain an audit trail for complaint status and assignment changes.
6   Provide predictable API contracts for the frontend, AI service, and dashboards.
7   Prevent unauthorized access, insecure direct object references, privilege escalation, and cross-department
    data leakage.
8   Document backup and recovery procedures and verify the capabilities of the selected hosting plan.

2.2 Non-goals
This PRD does not authorize the team to:

   Collect CNIC or other national identity documents by default.
   Make complaint records or uploaded photos publicly accessible.
   Allow citizens to change their role or grant themselves officer permissions.
   Let AI-generated content directly grant access or approve privileged actions.
   Delete complaints automatically because they appear to be duplicates.
   Claim official government integration without a working and authorized integration.
   Promise a specific recovery time, backup frequency, or retention period until the relevant hosting capabilities
    and operational policies are confirmed.

3. Technology stack

Use the following stack unless the team documents and approves a necessary change.

  Layer                                          Technology

  Web application                                Next.js App Router

  Programming language                           TypeScript with strict mode

  UI                                             React, Tailwind CSS, shadcn/ui

  Authentication                                 Supabase Auth

  Relational database                            Supabase PostgreSQL

  Database authorization                         PostgreSQL Row Level Security

  File storage                                   Private Supabase Storage bucket

  Input validation                               Zod

  Forms                                          React Hook Form with Zod

  Backend endpoints                              Next.js Route Handlers

  Server-side database access                    Supabase server client; privileged client only where necessary

  Testing                                        Unit, integration, authorization, and end-to-end tests

  Deployment                                     Vercel and Supabase, or an approved equivalent

3.1 Engineering standards
   Use TypeScript strict mode.
   Use reusable, clearly named modules rather than one large component or route handler.
   Separate browser-safe code from server-only code.
   Keep authorization logic centralized and testable.
   Validate all untrusted input on the server.
   Use database migrations for schema changes.

---

<!-- PDF page 3 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                                Page 3

   Do not edit production schema manually without a recorded migration.
   Do not use hardcoded mock permissions in real application flows.
   Do not show success messages until the underlying operation has actually succeeded.
   Do not leave dead buttons, unfinished authorization checks, fake data in production flows, or placeholder
    security logic.
   Review AI-generated code before merging it.

  Code-comment language rule: All comments written by the team must use Roman English or Roman Urdu
  written with Latin characters. Do not write team-authored comments in Urdu script.

Example:

  // Is function mein user ki department permission verify hoti hai.

4. User roles and access model

CivicPulse AI uses three primary roles.

4.1 Citizen
A citizen can:

   Register and sign in.
   Submit a complaint.
   View their own complaints.
   View permitted complaint status and public-facing updates.
   Upload evidence to a complaint they are authorized to create or manage.
   Request deletion or removal of personal information through the documented support process, where
    applicable.

A citizen cannot:

   Access another citizen's private complaint details.
   View internal staff notes or confidential AI processing details.
   Assign a complaint to a department or officer.
   Change their own role.
   Modify audit history, AI analysis records, or another user's complaint.

4.2 Department officer
An officer can:

   View complaints assigned to their authorized department.
   Review AI-generated classifications and recommendations.
   Update permitted workflow statuses.
   Record assignments and resolution notes.
   View evidence attached to complaints they are authorized to access.
   Review duplicate candidates and related complaint records within their permitted scope.

An officer cannot:

   Access unrelated departments' private records by changing a URL or API parameter.
   Add themselves to another department.
   Grant themselves administrator privileges.
   Modify security policies or audit events.
   Delete complaint history to conceal a change.

---

<!-- PDF page 4 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                            Page 4

4.3 Administrator
An administrator can perform explicitly authorized administrative actions, such as:

   Manage department configuration.
   Manage department membership and role assignments.
   Review system-level queues and analytics.
   Correct permitted configuration errors.
   Investigate security and operational issues.

Administrator access must still be authenticated, validated, and audited. Do not treat possession of an
administrator UI URL as proof of permission.

4.4 Permission matrix

 Action                                Citizen                          Officer                           Admin

 Create complaint                      Yes                              If explicitly supported           If explicitly supported

 View own complaint                    Yes                              If also authorized                Yes, under admin policy

 View all department                   No                               Authorized department             Yes, under admin policy
 complaints                                                             only

 Change complaint status               No, except permitted             Authorized scope                  Yes, under admin policy
                                       citizen actions

 Assign officer                        No                               Only if granted                   Yes

 Manage department                     No                               No, unless explicitly             Yes
 membership                                                             delegated

 View internal notes                   No                               Authorized scope                  Yes, under admin policy

 Change own role                       No                               No                                Not through self-service

 View audit history                    Own permitted public             Authorized operational            Authorized administrative
                                       events only                      history                           history

The permission matrix must be implemented in shared authorization utilities and database policies. Frontend
visibility is supplementary and is not a security boundary.

5. Database architecture

Use normalized relational tables with UUID primary keys, foreign keys, explicit constraints, and indexes for
common access patterns. All timestamps should use timestamptz and be stored in UTC. The UI may format
them into the user's local timezone.

5.1 profiles
Stores application-specific user information linked to the authenticated Supabase user.

Suggested fields:

   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
   display_name TEXT
   role TEXT NOT NULL DEFAULT 'citizen'
   phone TEXT NULL
   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

Rules:

   The profile ID must match the authenticated user's ID.

---

<!-- PDF page 5 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                Page 5

  New users must not be able to set their own role to officer or admin.
  Profile onboarding must assign citizen by default.
  Privileged role changes must go through a server-authorized administrative workflow.
  Phone numbers are optional unless a documented product requirement makes them necessary.

5.2 departments
Stores the application's department configuration.

Suggested fields:

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name TEXT NOT NULL
  slug TEXT NOT NULL UNIQUE
  description TEXT NULL
  is_active BOOLEAN NOT NULL DEFAULT true
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

Rules:

  Initial demo department names may include: Roads & Works, Sanitation, Water & Sewerage, Electrical &
   Streetlights, Municipal Services.
  These are demo configuration labels. The team must not represent them as verified official Hyderabad
   government departments or authoritative jurisdiction mappings without verification.

5.3 department_members
Defines which users belong to which departments.
Suggested fields:

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  department_id UUID NOT NULL REFERENCES departments(id)
  user_id UUID NOT NULL REFERENCES profiles(id)
  membership_role TEXT NOT NULL DEFAULT 'officer'
  is_active BOOLEAN NOT NULL DEFAULT true
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  created_by UUID NULL REFERENCES profiles(id)
  Unique constraint on (department_id, user_id)

Rules:

  A user must not be able to insert their own membership.
  Only an authorized administrator or explicitly delegated role can create or revoke membership.
  Deactivating a membership must immediately affect subsequent authorization checks.
  Officers may belong to multiple departments only if the application explicitly supports that model.

5.4 complaints
Stores the canonical complaint record.

Suggested fields:

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  tracking_id TEXT NOT NULL UNIQUE
  citizen_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL
  title TEXT NOT NULL
  description TEXT NOT NULL

---

<!-- PDF page 6 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                              Page 6

  category TEXT NOT NULL DEFAULT 'unknown'
  status TEXT NOT NULL DEFAULT 'submitted'
  priority TEXT NOT NULL DEFAULT 'medium'
  submission_method TEXT NOT NULL
  department_id UUID NULL REFERENCES departments(id)
  assigned_to UUID NULL REFERENCES profiles(id)
  latitude DOUBLE PRECISION NULL
  longitude DOUBLE PRECISION NULL
  location_label TEXT NULL
  photo_path TEXT NULL
  is_public BOOLEAN NOT NULL DEFAULT false
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  resolved_at TIMESTAMPTZ NULL
  closed_at TIMESTAMPTZ NULL

Required constraints and validation:

  title must have a reasonable minimum and maximum length.
  description must have a reasonable maximum length.
  latitude must be between -90 and 90.
  longitude must be between -180 and 180.
  submission_method must be ai or manual.
  Category, status, and priority values must belong to approved enumerations.
  A citizen must not be able to submit a complaint under another user's ID.
  Assignment to an officer must validate the officer's active department membership.
  The tracking ID must be unique, non-sequential or sufficiently unguessable, and not reveal personal data.
  Location must remain optional.
  Public visibility must never expose personal details, private notes, or private photo paths.

Recommended status values: submitted, analyzing, needs_review, assigned, in_progress, resolved,
closed, rejected.

Recommended priority values: low, medium, high, critical.
Recommended category values: road_damage, footpath_damage, garbage, waste_collection,
water_leakage, blocked_drain, streetlight, electrical_hazard, other, unknown.

5.5 ai_analyses
Stores the structured result of AI processing.

Suggested fields:

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE
  model_name TEXT NULL
  category TEXT NOT NULL
  summary TEXT NOT NULL
  severity TEXT NOT NULL
  confidence NUMERIC NOT NULL
  suggested_department_category TEXT NULL
  safety_concern BOOLEAN NOT NULL DEFAULT false
  needs_human_review BOOLEAN NOT NULL DEFAULT true
  reasoning_summary TEXT NULL

---

<!-- PDF page 7 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                  Page 7

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  created_by UUID NULL REFERENCES profiles(id)

Rules:

  confidence must be between 0 and 1.
  Store only the short, user-safe explanation needed for the workflow.
  Do not store or expose hidden chain-of-thought.
  AI results must not be treated as authorization decisions.
  Citizens must not be able to create or modify trusted analysis records directly.
  Low-confidence or safety-sensitive results must be routed for human review.
  Preserve relevant analysis history when a complaint is re-analyzed, rather than silently overwriting all prior
   records.

5.6 duplicate_groups
Stores groups of potentially related complaints.

Suggested fields:

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  label TEXT NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  created_by UUID NULL REFERENCES profiles(id)

5.7 complaint_links
Stores relationships between complaints and duplicate groups, or related complaint records, depending on the final
implementation. Recommended initial structure:
Suggested fields:

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE
  related_complaint_id UUID NULL REFERENCES complaints(id) ON DELETE CASCADE
  duplicate_group_id UUID NULL REFERENCES duplicate_groups(id) ON DELETE CASCADE
  relationship_type TEXT NOT NULL
  similarity_score NUMERIC NULL
  review_status TEXT NOT NULL DEFAULT 'pending'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  reviewed_by UUID NULL REFERENCES profiles(id)
  reviewed_at TIMESTAMPTZ NULL

Rules:

  Use a database constraint to ensure that each row references a valid relationship structure. Add unique
   constraints to prevent duplicate relationship rows.
  A potential duplicate must not automatically delete or merge the original complaint.
  Similarity is evidence for review, not proof that two complaints are identical.
  Only authorized users or trusted server processes may create or approve duplicate relationships.
  Keep the original citizen's complaint and tracking ID intact.

5.8 complaint_events
Provides an audit-friendly event history for complaint changes.
Suggested fields:

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()

---

<!-- PDF page 8 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                  Page 8

  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE
  actor_id UUID NULL REFERENCES profiles(id)
  event_type TEXT NOT NULL
  previous_value JSONB NULL
  new_value JSONB NULL
  note TEXT NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()

Examples of events:

  Complaint submitted.
  AI analysis completed.
  Complaint sent to human review.
  Department assigned.
  Officer assigned.
  Status changed.
  Duplicate relationship reviewed.
  Resolution recorded.

Rules:

  Events must be written by trusted server logic or controlled database functions.
  Users must not be able to rewrite or delete event history.
  Do not store passwords, access tokens, secret keys, or unnecessary sensitive personal information in event
   payloads.
  Store safe, minimal before-and-after values.

5.9 notifications
Stores in-app notification records.
Suggested fields:

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  complaint_id UUID NULL REFERENCES complaints(id) ON DELETE CASCADE
  type TEXT NOT NULL
  title TEXT NOT NULL
  message TEXT NOT NULL
  read_at TIMESTAMPTZ NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()

Rules:

  Users may read and mark their own notifications as read.
  Users must not create notifications for other users.
  Notification creation must be triggered by trusted application logic.
  External email or SMS notifications are not considered implemented unless an actual provider integration is
   configured, tested, and documented.

6. Database constraints, indexes and migrations

6.1 Required indexes
Create indexes for common query patterns, including:

---

<!-- PDF page 9 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                     Page 9

   complaints(citizen_id, submitted_at DESC)
   complaints(department_id, status, submitted_at DESC)
   complaints(assigned_to, status)
   complaints(tracking_id)
   ai_analyses(complaint_id, created_at DESC)
   complaint_events(complaint_id, created_at DESC)
   notifications(user_id, created_at DESC)
   notifications(user_id, read_at)
   department_members(user_id, is_active)
   department_members(department_id, is_active)
   complaint_links(complaint_id)
   complaint_links(related_complaint_id)

Do not add redundant indexes without checking query plans and write overhead.

6.2 Migration rules
   Store schema changes in version-controlled SQL migration files.
   Apply migrations in development and staging before production.
   Make migrations repeatable only where doing so is safe and intentional.
   Document destructive migrations and require a rollback or recovery plan.
   Never commit real credentials, production user data, or private evidence into migrations or seed files.
   Seed only clearly labeled demo departments and non-sensitive demo records.

Suggested files:

   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_rls_policies.sql
   supabase/migrations/003_indexes_and_constraints.sql
   supabase/seed.sql

The team may combine migrations when the repository is new, but the final history must remain understandable
and reproducible.

7. Authentication and profile lifecycle

7.1 Registration and login
Use Supabase Auth for identity verification and session management. Required behavior:

   Registration and login use the configured supported authentication methods.
   Validate input and show understandable errors.
   Do not reveal whether an arbitrary email address belongs to an existing account where that would create an
    account-enumeration risk.
   Protect authenticated routes and APIs using verified server-side session information.
   Use secure session handling supported by the framework and Supabase integration.
   Do not store session tokens or passwords in application-managed local storage.
   Sign-out must invalidate or remove the active session using the supported authentication flow.
   Apply rate limits or abuse controls to sensitive authentication endpoints where supported.

7.2 Profile onboarding
After account creation:

1   Create or initialize the user's profiles record.
2   Assign the default role citizen.

---

<!-- PDF page 10 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                               Page 10

3   Validate profile values.
4   Handle duplicate profile creation safely.
5   Ensure that onboarding failures do not silently grant privileges.
6   Do not accept role or department membership from public registration payloads.

If using a database trigger, keep it minimal, secure, and tested. If using a server-side onboarding handler, make it
idempotent. Do not create circular dependencies between profile policies and profile-trigger functions.

7.3 Role changes
Role and membership changes must:

   Be performed through an authorized server-side workflow.
   Verify the acting user's current permissions.
   Validate the target user and requested role.
   Record an audit event.
   Prevent unauthorized self-promotion.
   Avoid accepting arbitrary role names from untrusted clients.

8. Row Level Security (RLS)

RLS must be enabled on every exposed table containing user, complaint, department, notification, or audit data.

   Important: Hiding a page, button, or navigation link is not access control. Database policies and server-side
   checks must enforce permissions independently.

8.1 Profiles policies
   Authenticated users can read and update only permitted profile fields on their own profile.
   Users cannot change their own role or administrative fields.
   Privileged profile reads require explicit policy justification.
   Admin access must be narrowly defined and audited.

8.2 Complaints policies
   A citizen may read their own complaints.
   A citizen may create a complaint only with their authenticated user ID or the documented
    anonymous-submission model.
   A citizen cannot set arbitrary department assignments, priority overrides, internal notes, or privileged statuses.
   Officers may read complaints within their active department membership.
   Admin access must be explicitly defined.
   Updates must validate both the existing row and the requested new values.
   A tracking ID alone is not authorization to access private complaint details.

For anonymous submission, use a separate, deliberately designed access mechanism. Do not create a policy that
grants access to a complaint merely because the caller knows its UUID or tracking ID.

8.3 Department policies
   Users may read department data necessary for the public reporting experience.
   Department membership is readable only to the appropriate user or privileged roles.
   Only authorized administrators can create, edit, deactivate, or delete department configuration.
   Membership changes require a separate, explicit policy.

8.4 AI analysis policies

---

<!-- PDF page 11 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                              Page 11

   Citizens must not insert, edit, or delete trusted AI analysis records directly.
   Authorized officers may read analysis for complaints in their department.
   Admins may access system-level analysis records according to policy.
   AI analysis writes should be performed by trusted server-side logic.

8.5 Audit event policies
   Citizens may receive only the public-facing status history intended for them.
   Officers may read relevant operational events within their authorized department.
   Only trusted backend logic may create audit records.
   No normal application role may edit or delete existing audit events.

8.6 Notifications policies
   Users can read and update the read state of their own notifications.
   Users cannot enumerate notifications belonging to another user.
   Creation must be restricted to trusted backend logic or a controlled database function.

8.7 Avoiding RLS recursion and privilege escalation
Policies must be designed to avoid recursive queries that re-enter the same protected table in a way that causes
recursion or unintended behavior. Recommended practices:

   Keep policy predicates simple.
   Use carefully reviewed helper functions only when necessary.
   If a SECURITY DEFINER function is required, set a safe fixed search_path, fully qualify referenced objects,
    restrict execute permissions, and review its privileges.
   Do not grant broad privileges merely to make a failing policy work.
   Do not rely on a service-role client as a shortcut around an incorrectly designed RLS policy.
   Test policies using authenticated users with different roles and department memberships.

8.8 RLS verification requirements
Test at least:

   Citizen A cannot read Citizen B's complaint.
   Citizen A cannot update Citizen B's complaint.
   Citizen cannot promote themselves to officer or admin.
   Officer A cannot access an unauthorized department's complaint.
   Deactivated department membership no longer grants access.
   Citizen cannot edit AI analysis records.
   Citizen cannot create or delete audit events.
   User A cannot read or alter User B's notifications.
   Anonymous requests cannot read private complaint records.
   Requests with a guessed UUID or tracking ID cannot bypass authorization.

9. Server-side authorization and API security

Every protected API must authenticate the caller, verify permissions, validate the request, and enforce access rules
on the server.

9.1 Required request sequence
For a protected operation:

1   Identify the caller using a verified session or validated authentication token.

---

<!-- PDF page 12 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                             Page 12

2   Reject unauthenticated requests when authentication is required.
3   Validate the body, query parameters, route parameters, and content type.
4   Load the target resource using an access-controlled query or perform an explicit authorization check.
5   Verify role, department membership, ownership, and allowed state transition.
6   Perform the operation inside an appropriate database transaction or atomic workflow where necessary.
7   Write an audit event for sensitive changes.
8   Trigger notifications only after the relevant operation succeeds.
9   Return a minimal response with no secrets or unauthorized fields.

9.2 Server-only secrets
Required environment variables:

   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   AI_API_KEY
   AI_MODEL

Rules:

   Only variables intentionally prefixed with NEXT_PUBLIC_ may be exposed to browser code.
   SUPABASE_SERVICE_ROLE_KEY must remain server-only.
   AI_API_KEY must remain server-only.
   Never commit real keys to Git.
   Never return keys in API responses, browser logs, error messages, or analytics.
   Never import a privileged server client into a client component.
   Use a dedicated server-only module for privileged database access.
   Use the least-privileged access method that supports the operation.
   If a key is exposed, revoke or rotate it and investigate possible misuse.

Create .env.example with variable names and safe placeholders only.

9.3 Input validation
Use Zod or an equivalent schema validator for every write endpoint. Validation must cover:

   Required fields.
   Field types and length limits.
   UUID format.
   Allowed enum values.
   Coordinate ranges.
   File type and size.
   Status transition permissions.
   Assignment and department consistency.
   Pagination bounds.
   Safe handling of optional fields and null values.

Reject unexpected privileged fields instead of silently trusting them.

9.4 API error handling
Return consistent, minimal error responses. Recommended conventions:

  Status               Meaning

  400                  Malformed request or validation failure

---

<!-- PDF page 13 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                              Page 13

 Status               Meaning

 401                  Unauthenticated request

 403                  Authenticated caller lacks permission

 404                  Resource not found or intentionally concealed to prevent disclosure

 409                  State conflict or uniqueness conflict

 413                  Payload or file too large

 415                  Unsupported media type

 429                  Rate limit exceeded

 500                  Unexpected server error

Do not return stack traces, database credentials, raw SQL errors, internal tokens, or sensitive data in production
responses.

10. API contracts

The following endpoints form the initial integration contract. The backend team may refine response shapes, but
must document changes and keep all PRDs aligned.

10.1 POST /api/complaints
Purpose: Create a complaint.

Requirements:

   Validate authenticated identity or the deliberately designed anonymous-submission flow.
   Derive citizen_id from the verified session when authenticated.
   Never trust a client-supplied citizen_id.
   Validate text, location, and photo references.
   Enforce file ownership and storage-path validation.
   Create the complaint and initial audit event.
   Trigger AI processing as a separate controlled operation or background workflow.
   Return the tracking ID and permitted complaint summary.

10.2 GET /api/complaints
Purpose: List complaints visible to the current user.

Requirements:

   Citizens receive only their permitted complaint records.
   Officers receive only authorized department records.
   Admins receive records according to administrative policy.
   Validate pagination, filtering, sorting, and requested fields.
   Apply authorization before returning results.
   Avoid unbounded queries.

10.3 GET /api/complaints/[id]
Purpose: Retrieve a complaint.

Requirements:

   Verify ownership or role-based access.
   Return only fields permitted for that caller.

---

<!-- PDF page 14 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                             Page 14

   Do not expose private notes, internal metadata, or signed file URLs to unauthorized callers.
   Do not treat a UUID or tracking ID as an authorization token.

10.4 POST /api/complaints/[id]/analyze
Purpose: Run or request AI analysis.

Requirements:

   Authenticate the caller or invoke through a trusted server workflow.
   Prevent citizens from supplying trusted AI results.
   Enforce rate and cost controls.
   Store validated output.
   Mark uncertain results for human review.
   Write an audit event for the processing action.
   Avoid returning internal provider secrets or hidden reasoning.

10.5 POST /api/complaints/[id]/assign
Purpose: Assign a complaint to an authorized department or officer.

Requirements:

   Require the appropriate officer or admin permission.
   Validate that the target department exists and is active.
   Validate that the assigned officer has active membership in the target department.
   Reject inconsistent department and officer combinations.
   Record the previous and new assignment in the audit history.

10.6 PATCH /api/complaints/[id]/status
Purpose: Change a complaint's status.

Requirements:

   Authenticate the caller.
   Validate the requested status.
   Enforce allowed state transitions and caller permissions.
   Update resolution and closure timestamps when applicable.
   Record the status transition in complaint_events.
   Trigger any configured notifications after success.
   Reject unauthorized transitions even if the frontend exposes the relevant control.

10.7 GET /api/departments
Purpose: Return department data needed by the application.

Requirements:

   Return only fields appropriate for the requesting role.
   Avoid exposing staff personal information.
   Exclude inactive departments from public selection unless there is a documented reason to show them.

10.8 GET /api/health
Purpose: Report deployment health.

Requirements:

   Return minimal health information.
   Do not expose environment variables, database credentials, internal host details, or stack traces.

---

<!-- PDF page 15 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                              Page 15

   Separate basic application availability from deeper dependency diagnostics.
   Restrict sensitive diagnostics where necessary.

11. File uploads and private storage

Complaint photos may contain faces, house numbers, license plates, or other identifying details. Treat uploaded
files as private evidence.

11.1 Storage rules
   Use a private bucket, such as complaint-photos.
   Do not enable public bucket access.
   Validate MIME type, file extension, and actual file contents where feasible.
   Enforce a documented maximum file size.
   Generate unpredictable object paths.
   Do not trust a user-supplied path to determine file ownership.
   Prevent directory traversal and unsafe path manipulation.
   Limit accepted image formats to those the application supports.
   Strip image metadata when feasible and appropriate.
   Avoid storing original filenames if they may contain personal information.
   Do not embed photos as public URLs in complaint records.

11.2 Access control
   Citizens may upload only to a complaint they are authorized to create or manage.
   Citizens may read their own private complaint photos.
   Officers may read evidence only for complaints within their authorized scope.
   Administrators may access evidence according to documented policy.
   File access must be enforced through Storage policies or a server-controlled, short-lived signed URL.
   Signed URLs must not be logged, stored as permanent public links, or shared beyond their intended purpose.

11.3 Upload workflow
1   Validate the caller and intended complaint.
2   Validate the file's type and size.
3   Generate a safe storage path on the server or through a constrained upload workflow.
4   Upload to the private bucket.
5   Verify the upload result.
6   Save the authorized object path to the complaint.
7   Clean up orphaned files if the database operation fails.
8   Ensure that unauthorized users cannot access the object directly.

11.4 File deletion and retention
Define how files are removed when a complaint is deleted, a retention period expires, or a valid removal request is
approved. Because database backups may not include Storage objects, document and verify file backup and
recovery capabilities separately.

12. Audit logging and status history

Audit history is required for operational accountability and security investigations.

12.1 Events to record

---

<!-- PDF page 16 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                              Page 16

At minimum, record:

   Complaint creation.
   Department and officer assignment.
   Status changes.
   Resolution and closure.
   AI analysis initiation and completion where relevant.
   Human review decisions.
   Duplicate relationship decisions.
   Administrative role and department membership changes.
   Relevant security-sensitive failures, subject to safe logging policy.

12.2 Audit event rules
   Events must be generated by trusted server-side logic.
   Normal users cannot edit or delete event records.
   Use UTC timestamps.
   Keep the actor ID where available.
   Record concise before-and-after values for sensitive state changes.
   Never log passwords, raw authentication tokens, service-role keys, or unnecessary private content.
   Avoid putting full complaint descriptions or photo contents into generic application logs.

12.3 Citizen-facing history
The frontend may show a filtered status history, such as:

   Complaint submitted.
   Complaint assigned.
   Work in progress.
   Resolution recorded.
   Complaint closed.

Do not expose internal officer notes, internal security events, or private staff discussions through citizen-facing
history.

13. Privacy and data minimization

13.1 Minimum required information
Collect only information necessary for the reporting and tracking workflow.

   Do not require CNIC by default.
   Make phone number optional unless a verified product requirement requires it.
   Make precise location optional.
   Explain why a photo or location is requested.
   Avoid collecting unrelated demographic or sensitive information.
   Do not include private user details in public complaint views or analytics.

13.2 Data visibility
Before showing complaint information publicly, explicitly define which fields may be public. Potentially public fields,
if enabled by product policy:

   Sanitized complaint category.
   Generalized location.
   Public-facing summary.

---

<!-- PDF page 17 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                             Page 17

   Current status.
   Non-identifying timestamps.

Fields that must remain private by default:

   Citizen contact information.
   Precise residential coordinates where disclosure creates risk.
   Private photo paths.
   Internal notes.
   Authentication identifiers.
   Internal analysis metadata.
   Staff-only assignment discussions.

13.3 Privacy notices
The application must explain:

   What information is collected.
   Why it is collected.
   Who can access it.
   Whether an AI provider processes submitted text or images.
   How long information is retained, once the policy is defined.
   How users can request help with their information.

Do not claim that AI-provider processing is zero-retention or that data is never used by a provider unless the
selected provider's actual configuration and terms confirm it.

13.4 Retention and deletion
The team must document a retention policy before production use.

   Retain only information required for the stated purpose.
   Define deletion behavior for complaints, profiles, audit records, and photos.
   Consider legal and operational requirements before deleting records.
   Do not promise complete erasure from backups unless the backup lifecycle supports that promise.
   Avoid indefinite retention by default without a documented justification.

14. Rate limiting, abuse prevention and reliability

Implement controls appropriate to the hackathon deployment and the selected hosting platform. Required
considerations:

   Rate-limit authentication-sensitive and AI-triggering endpoints.
   Limit request body and file sizes.
   Bound list queries and pagination.
   Prevent repeated AI requests from causing uncontrolled costs.
   Prevent clients from submitting excessive duplicate requests.
   Use idempotency mechanisms where retries could create duplicate records or charges.
   Use safe timeouts and bounded retry logic for external services.
   Return clear errors without exposing internals.
   Monitor error rates and provider failures.

If a background job system is not implemented, document that AI processing is synchronous or manually triggered
rather than pretending a queue exists.

15. Backup, recovery and disaster readiness

---

<!-- PDF page 18 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                                  Page 18

Backups and recovery must be based on the actual capabilities of the chosen Supabase plan and any additional
infrastructure.

15.1 Required procedure
1   Identify which database backup and point-in-time recovery capabilities are included in the selected plan.
2   Confirm backup frequency, retention, restoration method, and access permissions.
3   Document whether Storage objects are backed up separately.
4   Define the database and file recovery procedure.
5   Record the responsible team member.
6   Perform a restore rehearsal in a staging environment where supported.
7   Verify the restored schema, representative complaint records, permissions, and file references.
8   Record the result and any limitations.

15.2 Recovery targets
Define recovery point objective (RPO) and recovery time objective (RTO) only after the actual platform capabilities
and operational arrangements have been confirmed. Do not advertise guaranteed recovery times based solely on
the existence of a backup feature.

15.3 Backup security
   Restrict access to backups.
   Do not commit database dumps or production evidence to the repository.
   Protect exported files with appropriate access controls and encryption where supported.
   Avoid using real citizen data in local development.
   Document secure disposal of temporary backup files.

16. Security threat model

The team must consider the following threats during implementation.

  Threat                                              Required mitigation

  Unauthorized complaint access                       Ownership checks, RLS, server authorization

  Role escalation                                     Protected role assignment and server-side checks

  Cross-department data leakage                       Active membership validation and department-scoped policies

  Public photo exposure                               Private Storage bucket and object-level access checks

  Forged complaint ownership                          Derive citizen ID from authenticated identity

  Forged AI analysis                                  Trusted server-side AI workflow

  Unauthorized status changes                         Explicit transition and role validation

  Audit history tampering                             Server-only event writes and restrictive permissions

  AI cost abuse                                       Rate limits, request bounds, and usage controls

  SQL injection                                       Parameterized database operations and validated inputs

  Cross-site scripting                                Output escaping and safe rendering of untrusted text

  CSRF/session misuse                                 Framework-appropriate session and request protections

  Secret leakage                                      Server-only environment variables and safe logs

  Duplicate abuse                                     Reviewable relationships; no automatic deletion

---

<!-- PDF page 19 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                                 Page 19

 Threat                                              Required mitigation

 Account enumeration                                 Safe authentication errors and abuse controls

 File upload abuse                                   File validation, size limits, private paths

 Backup exposure                                     Restricted access and documented handling

17. Security and integration test matrix

All tests must be executed against a controlled test environment. Record actual results rather than marking tests
passed by assumption.

 ID               Test                                                                   Expected result

 SEC-01           Citizen requests another user's complaint                              Access denied or safely concealed

 SEC-02           Citizen modifies another user's complaint                              Rejected

 SEC-03           Citizen submits a forged citizen_id                                    Ignored or rejected

 SEC-04           Citizen changes their role to admin                                    Rejected

 SEC-05           Officer accesses an unrelated department                               Denied

 SEC-06           Deactivated officer membership is used                                 Access denied

 SEC-07           Citizen inserts trusted AI analysis                                    Denied

 SEC-08           Citizen modifies an audit event                                        Denied

 SEC-09           Citizen reads another user's notification                              Denied

 SEC-10           Anonymous request reads a private complaint                            Denied

 SEC-11           Guessable UUID or tracking ID is used to retrieve a                    No unauthorized access
                  record

 SEC-12           Unauthorized user accesses a private photo                             Denied

 SEC-13           Unsupported or oversized file is uploaded                              Rejected

 SEC-14           Invalid category or status is submitted                                Rejected

 SEC-15           Officer assigns a user outside the target department                   Rejected

 SEC-16           Invalid status transition is requested                                 Rejected

 SEC-17           Malformed UUID or oversized request body is sent                       Rejected safely

 SEC-18           Repeated AI analysis requests are submitted                            Rate or cost controls apply

 SEC-19           Production error is triggered                                          No secrets or stack traces are returned

 SEC-20           Environment and source files are inspected for secrets                 No real secrets committed or exposed

 SEC-21           Database RLS is disabled or a policy is missing in                     Release verification detects the failure
                  staging

 SEC-22           Profile onboarding runs twice                                          No privilege escalation or duplicate-profile
                                                                                         failure

 SEC-23           Role or membership change is made                                      Authorized change is audited

 SEC-24           Backup restoration is rehearsed                                        Documented restoration and verification
                                                                                         results exist

---

<!-- PDF page 20 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                              Page 20

 ID               Test                                                                 Expected result

 SEC-25           Complaint database record is restored without its photo              Missing-file behavior is detected and
                                                                                       documented

 SEC-26           Concurrent status changes occur                                      Invalid or conflicting transitions are handled
                                                                                       safely

 SEC-27           Client attempts to provide internal notes or privileged              Unauthorized fields are rejected or ignored
                  fields                                                               safely

 SEC-28           Notifications are generated after a failed update                    No misleading success notification is created

17.1 Testing requirements
   Run unit tests for permission helpers and validation schemas.
   Run integration tests against a disposable test database.
   Test RLS using multiple users and department memberships.
   Test APIs as citizen, officer, admin, and unauthenticated caller.
   Include negative tests, not only successful workflows.
   Re-run relevant security tests after changing policies or schema.
   Record known limitations before release.

18. Implementation tickets and acceptance criteria

DB-01 — Initial database schema
Owner: Database/backend developer &nbsp;|&nbsp; Priority: Critical

Tasks:

   Create the required tables.
   Add foreign keys, uniqueness constraints, check constraints, and timestamps.
   Define consistent enum values.
   Add initial indexes.

Acceptance criteria:

   Migrations run successfully on a clean database.
   Invalid enum values and invalid coordinates are rejected.
   Foreign-key and uniqueness constraints work as expected.
   Schema changes are committed to version control.

SEC-01 — Authentication and profile onboarding
Owner: Authentication/backend developer &nbsp;|&nbsp; Priority: Critical
Tasks:

   Configure Supabase Auth.
   Implement profile initialization.
   Default new accounts to citizen.
   Prevent public role assignment.

Acceptance criteria:

   Registration and login work.
   Profile creation is safe to retry.
   A client cannot self-promote.

---

<!-- PDF page 21 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                            Page 21

   Invalid sessions are rejected.

SEC-02 — Row Level Security policies
Owner: Database/security developer &nbsp;|&nbsp; Priority: Critical

Tasks:

   Enable RLS on all relevant tables.
   Implement ownership and department-scoped policies.
   Protect AI analyses, audit events, memberships, and notifications.

Acceptance criteria:

   RLS is enabled on every exposed sensitive table.
   Cross-user and cross-department negative tests pass.
   No policy depends only on frontend visibility.
   No recursive policy failure or broad privilege workaround remains.

SEC-03 — Server authorization helpers
Owner: Backend developer &nbsp;|&nbsp; Priority: Critical
Tasks:

   Create shared authentication and permission helpers.
   Verify department membership.
   Validate status transitions and assignment permissions.
   Add safe error handling.

Acceptance criteria:

   All protected endpoints use the appropriate authorization helper.
   Unauthorized requests are rejected.
   No route trusts client-supplied role or ownership fields.

SEC-04 — Secure environment configuration
Owner: Backend/deployment developer &nbsp;|&nbsp; Priority: Critical

Tasks:

   Create .env.example.
   Separate browser and server clients.
   Isolate service-role access.
   Verify secret handling.

Acceptance criteria:

   No privileged key is bundled into browser code.
   Real secrets are absent from Git.
   Missing configuration fails safely.
   Secret rotation steps are documented.

SEC-05 — Private complaint photo storage
Owner: Backend/storage developer &nbsp;|&nbsp; Priority: Critical
Tasks:

   Configure a private bucket.
   Implement upload validation and access policies.
   Add safe path generation.

---

<!-- PDF page 22 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                              Page 22

   Handle orphaned uploads.

Acceptance criteria:

   Public access is disabled.
   Unauthorized users cannot read photos.
   Invalid and oversized files are rejected.
   Authorized users can access the intended files.

SEC-06 — Complaint event history
Owner: Backend developer &nbsp;|&nbsp; Priority: High
Tasks:

   Create the event table and controlled write workflow.
   Record complaint creation, assignment, and status transitions.
   Filter citizen-facing history.

Acceptance criteria:

   Relevant changes create audit records.
   Normal users cannot alter audit history.
   Public history excludes internal notes.

SEC-07 — API validation and error handling
Owner: Backend developer &nbsp;|&nbsp; Priority: Critical

Tasks:

   Add Zod schemas.
   Standardize status codes and error shapes.
   Bound request size and pagination.
   Reject unauthorized or unknown privileged fields.

Acceptance criteria:

   Invalid payloads fail safely.
   Error responses do not expose stack traces or secrets.
   All write endpoints validate input on the server.

SEC-08 — Notifications access control
Owner: Backend developer &nbsp;|&nbsp; Priority: High
Tasks:

   Implement in-app notification records.
   Restrict reads and updates to the owner.
   Trigger notifications after successful state changes.

Acceptance criteria:

   Users cannot read or modify another user's notifications.
   Failed operations do not generate misleading notifications.
   External notification providers are not claimed as integrated unless implemented.

SEC-09 — Security regression suite
Owner: QA/security developer &nbsp;|&nbsp; Priority: Critical

Tasks:

---

<!-- PDF page 23 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                            Page 23

   Implement the SEC test matrix.
   Add RLS and endpoint authorization tests.
   Include negative tests for all roles.

Acceptance criteria:

   Test results are recorded.
   Critical authorization tests pass.
   Known failures are documented and treated as release blockers where applicable.

SEC-10 — Backup and restore documentation
Owner: Database/deployment developer &nbsp;|&nbsp; Priority: High
Tasks:

   Verify actual platform backup capabilities.
   Document database and file recovery.
   Perform a staging restore rehearsal where supported.

Acceptance criteria:

   Backup and restore instructions exist.
   Database and Storage coverage are addressed separately.
   Any unverified recovery guarantee is clearly identified.

19. Required repository structure

Use a structure similar to the following and adapt it to the existing repository without duplicating responsibility
across files.

---

<!-- PDF page 24 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                        Page 24

  supabase/
    migrations/
      001_initial_schema.sql
      002_rls_policies.sql
      003_indexes_and_constraints.sql
    seed.sql

  src/
    lib/
      supabase/
        client.ts
        server.ts
        admin.ts
      auth/
        permissions.ts
      validation/
        complaint.ts
    types/
      database.ts

  tests/
    rls.test.ts
    api-authorization.test.ts
    validation.test.ts
    storage-security.test.ts

  docs/
    security-access.md
    backup-restore.md
    data-retention.md

  .env.example

File ownership rules

 File                                    Responsibility

 client.ts                               Browser-safe Supabase client

 server.ts                               Authenticated server-side Supabase access

 admin.ts                                Privileged server-only client; never imported into client components

 permissions.ts                          Shared, testable role and resource authorization rules

 complaint.ts                            Request validation schemas

 database.ts                             Generated or maintained database types

 rls.test.ts                             Database policy tests

 security-access.md                      Roles, permissions, policies, and operational security notes

 backup-restore.md                       Verified backup and recovery procedure

 data-retention.md                       Retention and deletion policy

Avoid maintaining multiple competing sources of truth for roles, categories, statuses, or permission rules.

20. Seven-day implementation plan

---

<!-- PDF page 25 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                                 Page 25

 Day             Focus                             Activities and deliverable

 Day 1           Schema and architecture           Confirm all fields, enums, foreign keys, and relationships. Create initial
                                                   migrations. Set up development and test environments. Agree on API
                                                   response shapes with the other PRD owners. Deliverable: Reproducible
                                                   schema and agreed contracts.

 Day 2           Authentication and                Configure Supabase Auth. Implement profile onboarding. Set default citizen
                 profiles                          role. Implement protected session helpers. Deliverable: Registration, login,
                                                   and safe profile creation.

 Day 3           RLS and authorization             Add table-specific policies. Implement department membership checks. Test
                                                   citizen ownership and officer scope. Fix policy recursion or privilege issues.
                                                   Deliverable: Verified role and ownership boundaries.

 Day 4           APIs and validation               Implement complaint and department endpoints. Add server-side Zod
                                                   validation. Add status-transition and assignment checks. Standardize safe
                                                   errors. Deliverable: Protected backend API foundation.

 Day 5           Storage and audit history         Configure private photo storage. Implement upload access rules. Record
                                                   complaint events. Implement secure in-app notification access. Deliverable:
                                                   Private evidence handling and traceable state changes.

 Day 6           Security testing                  Execute the SEC matrix. Test cross-user and cross-department requests.
                                                   Verify secret handling. Review rate limits and error leakage. Deliverable:
                                                   Recorded security test results and fixed critical defects.

 Day 7           Release preparation               Verify migrations and deployment environment. Review backup and recovery
                                                   documentation. Run integration tests with PRD-01, PRD-03, and PRD-04.
                                                   Document unresolved limitations. Deliverable: Security-reviewed release
                                                   candidate.

21. Cross-PRD integration requirements

PRD-01 — Frontend & Citizen Experience
   The frontend must use authenticated sessions and the agreed API contracts.
   Frontend route protection must not replace server authorization.
   The UI must never expose service-role or AI-provider keys.
   Citizen tracking must not bypass complaint ownership checks.
   Private photos must be loaded through authorized access.

PRD-03 — AI, Routing, Duplicate Detection & Priority
   AI processing must run through a trusted server-side workflow.
   AI output must be validated before storage.
   AI results cannot change permissions or directly authorize assignments.
   Duplicate candidates must preserve original complaint records.
   Safety-sensitive cases must follow the documented human-review process.
   AI failures must not silently overwrite valid complaint data.

PRD-04 — Dashboards, Integration & Deployment
   Dashboards must query only authorized data.
   Department views must respect active membership.
   Environment variables must be configured in the deployment environment.
   Health endpoints must not reveal secrets.
   Deployment must use reviewed migrations and verified RLS policies.

---

<!-- PDF page 26 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                                   Page 26

   Backup, recovery, and release claims must reflect tested capabilities.

22. Definition of done

PRD-02 is complete when:

 [ ]     Required database tables and constraints are implemented.
 [ ]     Schema migrations run on a clean environment.
 [ ]     Supabase Auth and profile onboarding work.
 [ ]     Default role assignment is secure.
 [ ]     RLS is enabled and tested for all relevant tables.
 [ ]     Citizens cannot access another user's private complaint data.
 [ ]     Officers cannot access unauthorized departments.
 [ ]     Administrative operations require explicit authorization.
 [ ]     All protected APIs validate input and authorization on the server.
 [ ]     Privileged secrets remain server-only.
 [ ]     Complaint photos are stored privately.
 [ ]     Audit history is protected from ordinary user modification.
 [ ]     Notification access is owner-scoped.
 [ ]     Rate and cost controls exist for sensitive endpoints where required.
 [ ]     The security regression suite has recorded results.
 [ ]     Backup and recovery capabilities are documented accurately.
 [ ]     The privacy and retention policy is documented.
 [ ]     No critical security issue remains open.
 [ ]     All team-authored code comments use Roman English/Roman Urdu with Latin characters.
 [ ]     Type checking, linting, and relevant tests have been run and results recorded.

23. Release blockers

Do not release the application if any of the following applies:

1   A citizen can read or modify another citizen's private complaint.
2   An officer can access an unauthorized department.
3   A user can grant themselves officer or administrator permissions.
4   A service-role key or AI API key is exposed to browser code.
5   Complaint photos are publicly accessible without authorization.
6   Critical tables are missing RLS or have unsafe policies.
7   Protected APIs trust client-supplied ownership or role values.
8   Users can tamper with audit history.
9   Critical authorization tests fail.
10  A known critical vulnerability remains unresolved.
11  The deployed schema differs from the reviewed migration history.
12  The team makes unverified claims about backups, data deletion, or official integrations.

24. Final handoff requirements

The backend/security owner must provide:

1   A committed and reproducible database migration history.

---

<!-- PDF page 27 -->

CivicPulse AI | PRD-02 v2.0 | Internal project document                                                                                 Page 27

2   A documented schema and table relationship overview.
3   A role and permission matrix.
4   Verified RLS policies and test results.
5   Authentication and profile onboarding implementation.
6   Protected API endpoints with input validation.
7   Private Storage policies and upload validation.
8   Audit history and notification access controls.
9   A safe .env.example without real credentials.
10  Security regression test results.
11  Backup and restore documentation reflecting verified platform capabilities.
12  A list of unresolved limitations and known issues.
13  Integration notes for the frontend, AI, dashboard, and deployment owners.

   Final implementation rule: Security must be enforced in the database and backend, not merely represented
   by frontend controls. Any feature that has not been implemented and tested must be marked as pending rather
   than described as complete.
