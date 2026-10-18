# CivicPulse AI — Privacy, Data Retention & Public Visibility Policy
**Document Reference:** PRD-02 Section 13 & 14  
**Version:** 1.0 (Hackathon Release Candidate)  
**Status:** Approved Specification  

---

## 1. Principles of Data Minimization (PRD-02 Section 13.1)

CivicPulse AI collects strictly the minimal data required to record, route, and resolve civic complaints:

1. **No CNIC or National ID:** CNIC, passport, or identity card numbers are **NOT collected**.
2. **Optional Contact Details:** Phone number is optional on registration. Email is used strictly for authentication and account security.
3. **Optional Precise Coordinates:** Citizens may submit complaints without precise GPS coordinates by providing an approximate text location (e.g., "Main Boulevard, Qasimabad").
4. **Evidence Purpose Justification:** Photos and locations are used exclusively for field inspection by authorized department officers.

---

## 2. Public vs. Private Data Visibility Boundary (PRD-02 Section 13.2)

CivicPulse AI maintains a strict boundary between public civic reporting and private personal data:

| Field | Public Tracking View | Authenticated Citizen | Department Officer | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| **Tracking ID** | Yes | Yes | Yes | Yes |
| **Sanitized Category** | Yes | Yes | Yes | Yes |
| **General Location Label** | Yes | Yes | Yes | Yes |
| **Status & Public Timestamps** | Yes | Yes | Yes | Yes |
| **Citizen Contact Info (Email/Phone)** | **NO** | Own profile only | **NO** | Audit only |
| **Precise GPS Coordinates** | **NO** | Yes (own) | Yes (authorized dept) | Yes |
| **Uploaded Photo Evidence** | **NO** | Yes (signed URL) | Yes (signed URL) | Yes |
| **Internal Officer Notes** | **NO** | **NO** | Yes (authorized dept) | Yes |
| **Raw AI Chain-of-Thought** | **NO** | **NO** | **NO** (never stored) | **NO** |

---

## 3. Third-Party AI Processing Notice (Google Gemini)

- **Provider:** Google Generative AI (Gemini 1.5 Pro).
- **Data Transmitted:** Complaint title, sanitized complaint description, and optional photo attachment.
- **Data NOT Transmitted:** Citizen name, citizen ID, email address, phone number, authentication credentials.
- **Retention Disclaimer:** Free-tier Google AI Studio API requests may be processed under Google's standard developer terms. For municipal production deployment, an enterprise Vertex AI agreement with Zero-Data-Retention (ZDR) must be active before claiming strict zero-retention.

---

## 4. Data Retention Lifecycle

| Data Type | Retention Period | Post-Period Action |
| :--- | :--- | :--- |
| **Active Complaints** | Duration of complaint lifecycle | Maintained until resolved/closed |
| **Resolved/Closed Complaints** | 3 years from closure | Moved to cold archival storage |
| **Uploaded Photos** | 1 year after complaint resolution | Securely deleted from `complaint-photos` bucket |
| **Audit Logs (`complaint_events`)** | 5 years | Retained for municipal oversight and compliance |
| **In-App Notifications** | 90 days | Automatic cleanup of read notifications |

---

## 5. Citizen Erasure & Anonymization Requests

If a citizen requests account deletion under applicable privacy regulations:
1. The user's `profiles` record is anonymized or removed via Supabase Auth deletion.
2. Associated complaints are **NOT deleted** (to preserve municipal work history and accountability); instead, foreign key `citizen_id` is set to `NULL` (`ON DELETE SET NULL`), rendering the historical complaint completely anonymous.
