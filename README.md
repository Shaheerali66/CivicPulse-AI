# CivicPulse-AI
### Hyderabad Municipal Civic Grievance & Redressal Platform

> **AI-powered municipal triage, automated agency routing, real-time tracking, and operational officer dashboard.**

🔗 **Live Demo Deployment:** [https://civic-pulse-ai-pi.vercel.app](https://civic-pulse-ai-pi.vercel.app)

---

## 📌 Section 1: Problem Statement

Municipal governance in urban centers like **Hyderabad, Sindh** faces significant operational bottlenecks:
- **Manual Triage Delays:** Complaints filed by citizens sit in physical registers or unmoderated inboxes for days before being read by department staff.
- **Inter-Agency Miscoordination:** Issues spanning overlapping jurisdictions—such as **Hyderabad Municipal Corporation (HMC)**, **Hyderabad Water & Sewerage Corporation (HWASA)**, **Hyderabad Electric Supply Company (HESCO)**, and **Provincial Works & Services Department (PWD Sindh)**—often get bounced back and forth with no clear ownership.
- **Duplicate & High-Volume Redundancy:** A single water pipeline rupture or fallen transmission cable yields dozens of repetitive complaints, overwhelming operators.
- **Lack of Public Transparency:** Citizens lack visibility into complaint resolution, with no reliable status tracking or accountability after filing.

---

## 💡 Section 2: Proposed Solution

**CivicPulse-AI** is an end-to-end municipal grievance intake, automated triage, and operational dispatch engine designed specifically for urban Sindh:

1. **Public AI Intake Portal:**
   - Multi-modal complaint filing via structured manual forms or free-form natural language text, voice dictation, and photographic evidence upload.
2. **Automated AI Triage & Routing:**
   - Evaluates complaints via Google Gemini AI to determine precise municipal department jurisdiction, category, urgency, safety risk tags, and sentiment.
3. **Officer Operations Dashboard (`/dashboard`):**
   - Centralized real-time operational command center for municipal officers to inspect queues, review AI recommendations, claim complaints, dispatch field crews, and mark resolutions.
4. **Transparent Citizen Tracking (`/track`):**
   - Real-time tracking portal allowing any citizen to view dynamic lifecycle progression (`Submitted` → `Needs Review` → `In Progress` → `Resolved`) using their unique tracking ID (e.g., `CP-20261019-EBYS`).
5. **System Administration & Agency Management (`/admin`):**
   - Department directory management, active complaint volume counters, staff role assignment, and municipal analytics.

---

## 🛠️ Section 3: Tech Stack

- **Frontend & Web Framework:** [Next.js](https://nextjs.org/) (App Router, React 19, Server & Client Components)
- **Styling & UI Components:** [Tailwind CSS](https://tailwindcss.com/), Lucide Icons, Glassmorphic Modern Civic Theme
- **Database & Backend:** [Supabase](https://supabase.com/) (PostgreSQL 15), Serverless API Routes, Row Level Security (RLS) policies
- **AI Models & Orchestration:** [Google Gemini API](https://ai.google.dev/) (Gemini 1.5 / 2.0 Flash via Google Antigravity & AI Studio)
- **Deployment & Hosting:** [Vercel](https://vercel.com/) (Continuous Deployment from GitHub `main` branch)

---

## 🤖 Section 4: AI Methodology & Model/API Usage

CivicPulse-AI leverages Google Gemini to automate complex urban triage:

```
[Citizen Input: Text / Audio / Image]
                 │
                 ▼
  ┌───────────────────────────────┐
  │      Google Gemini AI         │
  │  (Zero-Shot Structured JSON)  │
  └──────────────┬────────────────┘
                 │
  ┌──────────────┴─────────────────────────┐
  ▼                                        ▼
Department Routing               Urgency & Hazard Scoring
• HMC (Sanitation & Encroachment)• Priority: Critical / High / Med / Low
• HWASA (Sewage & Water Supply)  • Safety Hazard Flags (e.g. Live Wire)
• HESCO (Power Outage / Sparks)  • Confidence & Duplicate Indexing
• PWD Sindh (Roads & Bridges)
```

1. **Automated Department Classification:**
   - The prompt instructs Gemini to classify inputs into exact municipal departments: `hmc-hyderabad`, `hwasa-hyderabad`, `hesco-hyderabad`, `pwd-sindh`, or `tmc-hyderabad`.
2. **Priority & Urgency Scoring:**
   - Complaints with life-safety risks (e.g., severed electric wire submerged in rainwater) are automatically promoted to **Critical/High** priority with safety hazard badges.
3. **Structured Response Guarantees:**
   - Responses are strictly validated into schema models containing `department_id`, `category`, `priority`, `summary`, and `suggested_action`.

---

## 💻 Section 5: Local Setup & Installation Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.17+ or v20+)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- Supabase Project & Credentials
- Google Gemini API Key

### Step-by-Step Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Shaheerali66/CivicPulse-AI.git
   cd CivicPulse-AI
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

   # Google Gemini AI Configuration
   GEMINI_API_KEY=your-google-gemini-api-key

   # Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run Database Migrations & Seeds:**
   Execute migrations located in `supabase/migrations/` in your Supabase SQL editor to create the `complaints`, `departments`, `profiles`, and `audit_logs` tables.

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Validate Production Build:**
   ```bash
   npm run build
   ```

---

## 📸 Section 6: Screenshots & Demo

| Feature | Preview Link / Placeholder |
| :--- | :--- |
| **Public AI Intake Page** | [Intake Portal View](https://civic-pulse-ai-pi.vercel.app/report) |
| **Officer Operations Dashboard** | [Officer Operations View](https://civic-pulse-ai-pi.vercel.app/dashboard) |
| **Real-Time Complaint Tracking** | [Public Tracking View](https://civic-pulse-ai-pi.vercel.app/track) |
| **System Administration** | [Admin Departments View](https://civic-pulse-ai-pi.vercel.app/admin) |

---

## 👥 Section 7: Team Members & Contributions

| Member | Role & Key Contributions |
| :--- | :--- |
| **Member 1** | **Frontend Development**<br>• Designed UI/UX layout, landing page, and responsive navigational framework.<br>• Implemented citizen grievance filing forms (manual & AI assistant modes). |
| **Member 2** | **Dataset & Database Security**<br>• Architected Supabase PostgreSQL schema, relational tables, and foreign constraints.<br>• Authored Row Level Security (RLS) policies and seed data for municipal departments. |
| **Member 3** | **AI Integration**<br>• Integrated Google Gemini AI API for natural language extraction and parsing.<br>• Designed zero-shot prompt engineering for department classification, urgency scoring, and safety hazard detection. |
| **Member 4** | **Dashboard Integration**<br>• Built Officer Operations Dashboard with live queue triage, status updates, and detail modals.<br>• Created administrative department views, real-time metrics sync, and session handling. |
| **Member 5** | **Testing & Quality Assurance**<br>• Conducted end-to-end user workflow testing across submission, triage, and tracking.<br>• Performed API payload testing, error-handling validation, and production cross-browser verification. |

---

## 📜 License
Developed for the National Youth Leadership Program (NYLP) Hackathon. Distributed under the MIT License.
