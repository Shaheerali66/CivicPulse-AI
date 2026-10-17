# CivicPulse AI

## PRD-01 — Frontend & Citizen Experience

**NYLP AI Hackathon 2026 | Product Requirements Document**
**Version 3.0 — Consolidated Implementation Specification**

| Document control | Details |
|---|---|
| Project | CivicPulse AI |
| Hackathon | NYLP AI Hackathon 2026 |
| Document owner | Frontend Engineer / Citizen Experience Lead |
| Priority | Critical |
| Version | 3.0 — Consolidated Implementation Specification |
| Target demo location | Hyderabad, Sindh, Pakistan |

---

## 1. Product overview

CivicPulse AI is an AI-powered civic complaint management platform that enables citizens to report local civic issues through an AI-assisted or manual reporting experience. The platform helps organize complaints, generate concise summaries, suggest relevant departments, identify possible duplicates, and provide transparent complaint tracking.

This PRD defines the complete frontend and citizen-facing experience, including:

- Public landing page.
- Authentication and account states.
- AI-assisted complaint submission.
- Manual complaint submission.
- Optional image upload and location sharing.
- Complaint tracking.
- Citizen complaint history.
- Citizen-safe status updates.
- Form validation and error handling.
- Accessibility and responsive design.
- Frontend integration with authentication, database, and AI services.
- Security requirements for citizen-facing screens.
- Frontend feature tickets.
- Testing, release criteria, and handoff requirements.

The frontend must be professional, accessible, maintainable, and reliable. It must not look like a generic, quickly assembled AI-generated template.

### 1.1 Product goal

Help citizens report civic issues with minimal friction and provide a clear, trustworthy way to track each report.

### 1.2 Primary user

A citizen who wants to report an issue such as:

- Damaged roads or potholes.
- Broken footpaths.
- Garbage accumulation.
- Missed waste collection.
- Water leakage.
- Blocked drains.
- Broken streetlights.
- Potential electrical hazards.
- Other civic service issues.

### 1.3 Product limitations

- Hyderabad, Sindh is the target demonstration location.
- Department names and category mappings are configurable demo data until independently verified.
- The application must not claim official government integration without an authorized, working integration.
- A tracking ID confirms that the complaint was recorded by CivicPulse AI, not that a government department received or accepted it.
- AI-generated classifications and summaries are suggestions and may require human review.
- Do not collect CNIC or other highly sensitive identity information by default.

---

## 2. Frontend goals and non-goals

### 2.1 Goals

1. Make complaint submission straightforward on mobile and desktop.
2. Offer AI-assisted and manual reporting paths.
3. Keep AI assistance optional and communicate its limitations.
4. Generate a unique tracking ID after the server confirms successful complaint creation.
5. Show citizens only their own complaint records or information explicitly intended for public tracking.
6. Provide clear progress and status information.
7. Make errors understandable and recoverable.
8. Maintain a consistent design system.
9. Ensure all visible actions have real functionality.
10. Integrate safely with the backend, authentication, AI, and database modules.

### 2.2 Non-goals

The frontend team is not responsible for independently implementing:

- AI model training or provider infrastructure.
- Database migrations and RLS policy design.
- Department authorization logic.
- Duplicate similarity algorithms.
- Priority scoring calculations.
- Official government integrations.
- External email delivery infrastructure.
- Real-time messaging infrastructure unless explicitly added to scope.

The frontend must integrate with these capabilities through agreed APIs and display their actual results accurately.

---

## 3. Required technology stack

Use the project's agreed stack.

| Area | Technology |
|---|---|
| Application | Next.js App Router |
| Language | TypeScript with strict type checking |
| Styling | Tailwind CSS |
| UI components | shadcn/ui where appropriate |
| Icons | Lucide React |
| Forms | React Hook Form |
| Validation | Zod |
| Backend API | Next.js Route Handlers |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Private images | Supabase Storage |
| Maps | Leaflet with OpenStreetMap, if implemented |
| Deployment | Vercel, unless otherwise approved |
| Tests | Project-approved unit and browser-testing tools |

### Engineering requirements

- Use reusable components rather than copying large sections of UI code.
- Avoid `any` unless justified and documented.
- Keep API response types in shared, agreed type definitions.
- Use server components by default where appropriate; use client components for interactive behavior.
- Keep private provider keys and service-role credentials on the server.
- Do not call privileged database operations directly from the browser.
- Do not use a client-side role value as proof of authorization.
- Do not add new dependencies without a clear implementation need.
- Follow the existing repository structure instead of creating a competing architecture.

### Code comment language

All code comments written by the team must use **Roman English/Roman Urdu in Latin characters**, never Urdu script. Examples:

```ts
// Is form mein complaint submit karne se pehle input validate hota hai.
// Agar API fail ho to user ko clear error message dikhana hai.
// User ki private complaint ko kisi doosray account mein expose nahi karna.
```

Technical identifiers, function names, variable names, API fields, schemas, and documentation should remain in conventional English.

---

## 4. Mandatory product design standards

These rules apply to every citizen-facing page and component.

### 4.1 No vibe-coded design

Do not create a generic AI-template appearance with repetitive cards, unnecessary gradients, excessive rounded containers, decorative elements without purpose, or random components that do not support a user task. Every section must have a clear purpose.

The interface should feel like a thoughtfully designed civic service: trustworthy, calm, functional, and easy to navigate.

### 4.2 Color system

- Use solid colors only.
- Do not use gradient backgrounds, gradient text, or gradient buttons.
- Define a small set of design tokens for primary, secondary, background, border, text, success, warning, and error colors.
- Keep color use consistent across all routes.
- Maintain readable contrast.
- Do not communicate status or errors through color alone.

The final palette should be selected once and reused across the application rather than invented separately for each page.

### 4.3 Icons

- Use Lucide React or another approved icon library.
- Do not use emojis as navigation, status, action, or feature icons.
- Use consistent icon sizing and stroke weight.
- Icon-only buttons must have accessible labels.
- Do not mix multiple unrelated icon styles.

### 4.4 Typography and layout

- Establish a clear hierarchy for page titles, section headings, body text, labels, and supporting text.
- Use consistent spacing and alignment.
- Avoid excessively small text.
- Keep forms readable on mobile screens.
- Use consistent button sizes and interaction states.
- Prefer functional whitespace over decorative panels.

### 4.5 Interaction design

Every interactive element must have:

- A clear purpose.
- An accessible name.
- A visible hover/focus state where appropriate.
- A loading state when a request is running.
- A truthful success or error response.
- Disabled behavior when the action cannot currently be performed.

No dead buttons, fake loading animations, nonfunctional tabs, or placeholder links may be presented as completed functionality.

---

## 5. Information architecture and routes

Implement the following routes, adapting naming to the existing repository.

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page and primary call to action |
| `/report` | Public or authenticated, per agreed policy | Start complaint submission |
| `/report/ai` | Same policy as reporting | AI-assisted complaint form |
| `/report/manual` | Same policy as reporting | Manual complaint form |
| `/auth/sign-in` | Public | Sign in |
| `/auth/sign-up` | Public | Account creation |
| `/auth/forgot-password` | Public | Password recovery |
| `/auth/callback` | Public callback endpoint | Handle supported authentication callbacks |
| `/track` | Public or authenticated | Enter a tracking ID or select an owned complaint |
| `/my-complaints` | Authenticated | View own complaint history |
| `/my-complaints/[id]` | Authenticated owner | View own complaint details |
| `/contact` | Public | Contact form and verified contact information |
| `/privacy` | Public | Privacy notice |
| `/terms` | Public | Terms and usage limitations |
| `/unauthorized` | Public | Explain restricted access when needed |

Do not create multiple routes for the same purpose without a clear reason. If the team chooses a combined `/report` page with a mode selector, separate routes may be unnecessary.

The frontend must not duplicate officer or admin dashboards owned by another team member unless the integration plan explicitly assigns them to this engineer.

---

## 6. Global navigation and shared layout

### 6.1 Header

The header should provide:

- CivicPulse AI wordmark or approved logo.
- Home navigation.
- Report an issue.
- Track complaint.
- Contact.
- Sign in or account menu depending on authentication state.

On mobile, use an accessible navigation menu with a clear open/close control.

### 6.2 Footer

Include:

- Product name and short description.
- Main navigation links.
- Privacy notice.
- Terms.
- Contact link.
- A concise demo limitation notice where appropriate.

Do not invent government affiliations, official seals, phone numbers, email addresses, or department addresses.

### 6.3 Shared layout components

Create reusable components for:

- Header.
- Footer.
- Primary and secondary buttons.
- Form fields.
- Form error messages.
- Status labels.
- Priority labels where citizen-facing.
- Loading indicators.
- Empty states.
- Error panels.
- Confirmation dialogs.
- Toast or inline notifications.
- Image preview.
- Tracking ID display.
- Authentication guards for protected pages.

Avoid building separate versions of the same component for every route.

---

## 7. Landing page

### 7.1 Purpose

Explain what CivicPulse AI does and direct citizens toward reporting or tracking a complaint.

### 7.2 Required content

**Hero section**

- Clear heading explaining the civic complaint service.
- Short description of how it works.
- Primary action: "Report an Issue".
- Secondary action: "Track a Complaint".

**How it works**

Present a concise sequence:

1. Describe the civic issue.
2. Review AI suggestions or submit manually.
3. Receive a tracking ID.
4. Follow status updates.

**Supported issue categories**

Show supported categories in a readable layout, with proper icons and labels. Avoid implying that the categories represent every possible civic service.

**Transparency section**

Explain that:

- AI suggestions may need human review.
- Citizens can use manual reporting.
- Location and photos are optional unless a specific feature requires them.
- A tracking ID represents a record in CivicPulse AI.
- Government forwarding is available only if an authorized integration has been implemented.

**Footer and contact**

Include only verified contact information and working navigation.

### 7.3 Acceptance criteria

- Both main calls to action navigate to working routes.
- The page explains the product accurately.
- No fake complaint counts, impact statistics, or testimonials appear.
- No unverified official affiliations are shown.
- Layout is responsive.
- Text is readable at mobile widths.
- Links and buttons work using keyboard and touch.

---

## 8. Authentication and account states

Authentication implementation must use the agreed Supabase Auth configuration.

### 8.1 Sign-up

Support the project's approved authentication method, such as email and password. Requirements:

- Validate required fields.
- Validate email format.
- Apply the configured password requirements.
- Show loading while the request is processing.
- Show a truthful result based on the Supabase response.
- Handle email verification if enabled.
- Avoid creating a duplicate local profile from an untrusted client-supplied user ID.
- Do not expose whether another person's account exists unnecessarily.

### 8.2 Sign-in

- Validate the form.
- Provide understandable invalid-credential and network-error messages.
- Prevent repeated accidental submissions while processing.
- Use secure session handling supported by the selected Supabase/Next.js integration.
- Redirect only to approved internal destinations.
- Do not permit arbitrary external redirect URLs from query parameters.

### 8.3 Password recovery

- Provide a real recovery flow if supported by the configured provider.
- Show a confirmation that accurately reflects the provider response.
- Do not display a fake "password reset sent" state when the request failed.
- Avoid revealing account existence through different responses where possible.

### 8.4 Authentication states

The interface must handle:

- Loading session.
- Signed out.
- Signed in.
- Session expired.
- Authentication provider error.
- Email verification pending, if enabled.
- Unauthorized access.
- Sign-out in progress.

### 8.5 Protected routes

The frontend may hide links and redirect users for convenience, but the backend must enforce access control. For `/my-complaints` and `/my-complaints/[id]`:

- Require an authenticated session.
- Query only records authorized for the current user.
- Handle expired sessions.
- Never trust a complaint ID in the URL as proof of ownership.
- Avoid displaying private cached content after the user signs out or switches accounts.

---

## 9. Complaint submission experience

### 9.1 Reporting modes

Offer two clear paths:

**AI-assisted reporting.** The citizen provides a description and optionally a photo. The backend analyzes the available information and returns a suggested category, summary, severity, and possibly a department suggestion.

**Manual reporting.** The citizen describes the issue and selects a category without requiring AI classification.

Both modes must create complaints through the same agreed backend workflow and produce a tracking ID after successful persistence. Manual reporting must remain available if the AI provider is unavailable.

### 9.2 Form fields

| Field | Requirement |
|---|---|
| Complaint description | Required |
| Reporting mode | Required |
| Category | Required for manual mode; suggested for AI mode |
| Photo | Optional |
| Location description | Optional |
| Latitude/longitude | Optional, with explicit permission |
| Contact information | Only when required by the approved workflow |
| Additional details | Optional, if included in the agreed schema |

Do not collect CNIC by default. Do not force location permission just to open the form or submit a complaint. A citizen must be able to report an issue without enabling geolocation unless the product owner explicitly establishes a necessary requirement.

### 9.3 Description validation

- Trim leading and trailing whitespace.
- Reject empty or whitespace-only descriptions.
- Apply the server-agreed minimum and maximum length.
- Show the remaining character count if useful.
- Preserve meaningful line breaks where appropriate.
- Do not remove information through aggressive client-side sanitization.
- Repeat all critical validation on the server.

The client-side validation schema must align with the backend schema. Do not invent separate limits in the frontend.

### 9.4 Submission behavior

When the user submits:

1. Validate the form.
2. Prevent accidental repeated submission.
3. Upload an optional photo through the approved private-storage workflow, if selected.
4. Submit the complaint payload to the backend.
5. Wait for the server's confirmed response.
6. Display the returned tracking ID.
7. Provide a clear next action to track the complaint.
8. Handle any partial failure according to the API contract.

Never generate a fake tracking ID in the browser. If the complaint is persisted but AI analysis fails, show the real tracking ID and communicate that analysis needs retry or review. Do not tell the citizen the complaint was lost.

### 9.5 Double-submit and retry protection

- Disable the submit action while a request is in progress.
- Use server-supported idempotency or another agreed strategy where appropriate.
- If a network request times out, avoid blindly creating a second complaint.
- Provide a safe recovery path, such as checking the server result or asking the user to retry under a documented policy.
- Keep form data available where practical if a recoverable error occurs.

### 9.6 Submission confirmation

The confirmation page should show:

- Confirmation that CivicPulse AI recorded the complaint.
- Tracking ID.
- Short summary or category, where available.
- Current status returned by the backend.
- Link to the complaint tracking view.
- Explanation of what happens next.
- A note that official government forwarding is not implied unless a verified integration is active.

---

## 10. AI-assisted reporting interface

### 10.1 User flow

1. User opens AI-assisted reporting.
2. User describes the civic issue.
3. User optionally adds a photo or location.
4. User submits the report.
5. The backend creates or identifies the complaint record.
6. AI analysis is initiated according to the agreed API contract.
7. The frontend displays the actual processing state.
8. The user receives a tracking ID once complaint persistence is confirmed.
9. When analysis completes, the interface shows the supported result and any required review notice.

### 10.2 AI result display

Show, when available:

- Suggested category.
- Concise AI-generated summary.
- Suggested department.
- A short explanation.
- A review-needed indicator where relevant.

Label generated information clearly as an AI suggestion until confirmed by an authorized human or the approved workflow. Do not expose hidden chain-of-thought or private model deliberation. A short, user-safe explanation is sufficient.

### 10.3 Confidence and uncertainty

If the backend returns confidence or review status:

- Display confidence only if the product owner approves it for the citizen interface.
- Do not present the confidence score as a guarantee of correctness.
- Explain when information needs human review.
- Do not imply that a high-confidence result proves a report is factually correct.
- Do not let the frontend independently decide whether a safety issue can be ignored.

The frontend must follow the backend's review decision rather than recomputing confidence rules.

### 10.4 AI failure states

Handle:

- AI provider timeout.
- Invalid analysis result.
- Provider rate limit.
- Missing or inaccessible image.
- Low-confidence result.
- Human review required.
- Network failure.
- Complaint saved but analysis incomplete.

If AI fails, preserve the complaint and offer the supported fallback. Do not create a fake successful classification.

---

## 11. Manual reporting interface

The manual form must support citizens who do not want to use AI or who cannot access AI assistance.

### Required behavior

- Show the category selector.
- Use human-readable labels mapped to stable category IDs.
- Allow an optional description, subject to the agreed minimum requirement.
- Allow optional image upload if implemented.
- Allow optional location information.
- Submit through the same validated backend workflow.
- Display a tracking ID only after persistence is confirmed.

### Supported categories

| Category ID | User-facing label |
|---|---|
| `road_damage` | Road damage or pothole |
| `footpath_damage` | Broken footpath or sidewalk |
| `garbage` | Garbage or illegal dumping |
| `waste_collection` | Missed waste collection |
| `water_leakage` | Water leakage |
| `blocked_drain` | Blocked drain or standing water |
| `streetlight` | Broken streetlight |
| `electrical_hazard` | Electrical hazard |
| `other` | Other civic issue |
| `unknown` | Not sure |

If the citizen selects "Not sure," map it to the agreed unknown category or other configured behavior. Do not send a new category ID that the backend does not recognize.

---

## 12. Photo upload and preview

Photo upload is optional. Requirements:

- Define supported file types and maximum file size with the backend owner.
- Validate type and size on the client for usability.
- Enforce authoritative validation on the server.
- Provide image preview before submission.
- Allow the user to remove or replace the selected image.
- Compress large images when appropriate without damaging important visual evidence.
- Show upload progress if the storage workflow provides real progress information.
- Handle upload failure separately from complaint submission failure.
- Avoid exposing public storage URLs for private complaint images.
- Use authorized access or short-lived signed URLs where appropriate.
- Do not claim an image was saved until storage confirms it.
- Clean up abandoned uploads according to the agreed backend policy.

### Error states

Support:

- Unsupported file type.
- File too large.
- Upload failure.
- Network interruption.
- Image preview failure.
- Unauthorized storage access.

If image upload fails, explain whether the user can continue without the image or must retry, based on the actual workflow.

---

## 13. Optional location sharing

Location sharing must be transparent and optional unless a separately approved requirement establishes otherwise. Requirements:

- Explain why location is useful before requesting permission.
- Request browser geolocation only after a user action.
- Never request geolocation merely on page load.
- Handle permission denied, unavailable location, timeout, and invalid coordinates.
- Provide a manual location-description field.
- Allow the user to remove coordinates before submission.
- Do not fabricate coordinates.
- Do not treat the user's device location as proof of where the reported issue exists.
- Display location precision honestly.

### Location states

- Not provided.
- Permission requested.
- Location obtained.
- Permission denied.
- Location unavailable.
- Manual location description entered.

The complaint must still be submit-able without coordinates unless the backend contract explicitly requires them.

---

## 14. Complaint tracking

### 14.1 Purpose

Citizens need to know whether CivicPulse AI recorded the complaint and what its current status is.

### 14.2 Tracking methods

Support one or both of the following, according to the approved backend design:

- Signed-in citizen selects a complaint from their own history.
- Citizen enters a tracking ID and passes the required verification mechanism.

A tracking ID alone must not grant access to private contact details, internal notes, private images, or other sensitive data. If public tracking by ID is enabled, define a safe response that exposes only the approved citizen-facing fields. Apply rate limiting and appropriate enumeration protection.

### 14.3 Tracking details

Show:

- Tracking ID.
- Current status.
- Submission date.
- Citizen-safe complaint summary.
- Category, if available.
- Citizen-safe status history.
- Relevant next steps.
- Human-review notice when appropriate.

Do not show internal officer notes, other citizens' information, hidden model reasoning, private administrative data, or unapproved contact details.

### 14.4 Status labels

Map backend status IDs to clear labels.

| Internal status | Display label |
|---|---|
| `submitted` | Submitted |
| `analyzing` | Being analyzed |
| `needs_review` | Needs review |
| `assigned` | Assigned |
| `in_progress` | In progress |
| `resolved` | Resolved |
| `closed` | Closed |
| `rejected` | Rejected |

The interface must not invent additional backend statuses.

### 14.5 Status history

Where the backend provides event history:

- Display events in chronological order.
- Use the server timestamp.
- Show a meaningful label and safe description.
- Avoid exposing internal event payloads.
- Handle missing event descriptions gracefully.

Do not fabricate progress milestones to make the tracking page look complete.

---

## 15. My Complaints page

### Purpose

Allow authenticated citizens to see and reopen their own complaint records.

### Required features

- List the citizen's authorized complaints.
- Show tracking ID, summary, status, category, and submission date.
- Support pagination when necessary.
- Provide a useful empty state.
- Link each record to its details page.
- Show meaningful loading and error states.
- Refresh status from the backend rather than relying indefinitely on stale client data.

### Empty state

Explain that no complaints have been submitted yet and provide a working "Report an Issue" action.

### Security

- Query only complaints belonging to the authenticated citizen, as enforced by the backend.
- Never trust a user ID supplied by the browser.
- Do not fetch every complaint and filter in client-side JavaScript.
- Clear private UI state on sign-out or account switch.
- Do not use a shared cache key that exposes one citizen's results to another.

---

## 16. Contact page and form

The contact page must contain real, approved contact details or clearly state that a direct support channel is not yet configured.

### Contact form fields

- Name, if needed.
- Email, if a response is expected.
- Subject.
- Message.
- Consent or privacy notice, if required.

Collect only the fields necessary for the contact workflow.

### Functional requirements

- Validate inputs on the client and server.
- Apply rate limits or anti-abuse controls on the backend.
- Use an actual configured delivery or persistence destination.
- Show confirmation only after the server confirms the message was accepted by the configured workflow.
- Handle service errors honestly.
- Avoid placing secrets in browser code.
- Do not show fake email delivery confirmation.
- Avoid exposing submitted messages to unauthorized users.

If no email or support backend is configured, the interface must disclose that limitation rather than pretending to send messages.

---

## 17. Privacy, security, and frontend access control

Security responsibilities are shared with PRD-02. The frontend must comply with the following rules.

### 17.1 Authentication and ownership

- Use the approved Supabase Auth integration.
- Use the authenticated session to establish identity.
- Never trust a client-supplied user ID to establish complaint ownership.
- Never treat hidden buttons as security controls.
- Backend APIs and RLS policies must enforce all private data access.
- Handle session expiry without exposing private cached content.

### 17.2 Data minimization

- Do not collect CNIC by default.
- Do not ask for contact details unless the approved workflow needs them.
- Do not send unnecessary personal information to the AI provider.
- Do not place private data in URLs, analytics events, or client logs.
- Do not include private complaint details in public error messages.

### 17.3 Rendering and validation

- Render citizen-provided text as text, not executable HTML.
- Avoid unsafe HTML rendering.
- Validate API responses before using them in complex UI flows.
- Treat AI-generated content as untrusted.
- Handle unexpected fields or malformed responses safely.
- Do not expose raw provider or database error messages.

### 17.4 Storage access

- Private images must not be made public to simplify the frontend.
- Use the approved authenticated storage access or signed URL workflow.
- Do not persist long-lived private image URLs in browser storage.
- Handle expired signed URLs gracefully.

### 17.5 Environment variables

The browser may use only explicitly approved public configuration, such as:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The following must remain server-only:

```
SUPABASE_SERVICE_ROLE_KEY=
AI_API_KEY=
AI_MODEL=
```

Do not import server-only modules into client components. Do not commit actual secrets to source control.

---

## 18. API contracts and frontend integration

The frontend must use the agreed backend APIs rather than writing directly to protected database tables.

| Endpoint | Frontend use |
|---|---|
| `POST /api/complaints` | Submit a new complaint |
| `GET /api/complaints` | Retrieve the current user's authorized complaints, with supported filters/pagination |
| `GET /api/complaints/[id]` | Retrieve an authorized complaint |
| `POST /api/complaints/[id]/analyze` | Start or retrieve analysis according to the agreed contract |
| `GET /api/departments` | Retrieve permitted department/category information |
| `GET /api/health` | Optional operational diagnostics; never expose secrets |

Officer assignment and status mutation APIs are primarily owned by the dashboard/integration work, but frontend code must respect their contracts if those features are linked into the citizen interface.

### 18.1 API response rules

- Use shared TypeScript types.
- Validate user input with Zod.
- Handle expected HTTP errors explicitly.
- Do not assume every response is successful JSON.
- Provide clear fallback behavior for network failure.
- Avoid repeated requests caused by unnecessary component re-renders.
- Use cancellation or equivalent protection when requests become obsolete.
- Do not display sensitive server error details.

### 18.2 Suggested error codes

Align these with the backend's final contract:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `RATE_LIMITED`
- `ANALYSIS_PENDING`
- `ANALYSIS_FAILED`
- `UPLOAD_FAILED`
- `INTERNAL_ERROR`

The UI must map technical codes to understandable user-facing messages.

### 18.3 Data contract ownership

Before implementation, agree on:

- Request field names.
- Response field names.
- Category IDs.
- Status IDs.
- Error response format.
- Authentication behavior.
- Pagination format.
- Upload flow.
- AI processing state.
- Tracking authorization policy.

Do not create competing API schemas in separate frontend modules.

---

## 19. Frontend architecture and folder structure

Use the existing repository structure if it already provides equivalent organization. Suggested structure:

```
src/
  app/
    page.tsx
    report/
      page.tsx
      ai/page.tsx
      manual/page.tsx
    auth/
      sign-in/page.tsx
      sign-up/page.tsx
      forgot-password/page.tsx
      callback/route.ts
    track/page.tsx
    my-complaints/
      page.tsx
      [id]/page.tsx
    contact/page.tsx
    privacy/page.tsx
    terms/page.tsx
  components/
    layout/
      site-header.tsx
      site-footer.tsx
      mobile-navigation.tsx
    forms/
      complaint-form.tsx
      category-select.tsx
      image-upload.tsx
      location-field.tsx
    complaints/
      complaint-card.tsx
      complaint-status.tsx
      complaint-timeline.tsx
      tracking-id.tsx
    ui/
      loading-state.tsx
      error-state.tsx
      empty-state.tsx
      confirmation-dialog.tsx
  lib/
    api/
      client.ts
      complaints.ts
    auth/session.ts
    validation/
      complaint.ts
      auth.ts
      contact.ts
  types/
    complaint.ts
    api.ts
tests/
  complaint-form.test.ts
  tracking.test.ts
  auth-flow.test.ts
```

These are suggested paths, not permission to duplicate files already present.

### Architecture rules

- Keep business logic outside large page components.
- Use shared validation schemas where appropriate.
- Avoid unnecessary global state.
- Keep form state local unless multiple components genuinely need it.
- Keep data-fetching behavior predictable.
- Do not create a custom abstraction for every one-line operation.
- Add error boundaries where they provide meaningful recovery.
- Use consistent naming conventions.
- Keep components focused and testable.

---

## 20. Feature ticket list

The following tickets are the frontend implementation backlog. Each ticket must be assigned to an owner and tracked in the team's project workflow.

### EPIC A — Application shell and design system

**FE-01: Establish shared design tokens**

- Define solid-color palette.
- Define typography and spacing scales.
- Define consistent border, radius, and focus styles.
- Prohibit gradients.
- **Acceptance:** all shared components use the same tokens.

**FE-02: Build responsive site header and footer**

- Implement desktop navigation.
- Implement accessible mobile navigation.
- Add verified links and footer information.
- **Acceptance:** all navigation links work on mobile and desktop.

**FE-03: Create shared feedback components**

- Loading state.
- Empty state.
- Error state.
- Inline validation message.
- Confirmation dialog.
- **Acceptance:** shared feedback components are reused consistently.

### EPIC B — Public pages

**FE-04: Implement landing page**

- Explain the service.
- Add report and tracking actions.
- Show supported categories and process.
- **Acceptance:** no fabricated statistics or unverified official claims.

**FE-05: Implement contact, privacy, and terms pages**

- Add approved contact workflow.
- Add actual privacy and usage disclosures.
- **Acceptance:** forms and links work; no invented contact information.

### EPIC C — Authentication

**FE-06: Implement sign-up**

- Connect to the approved auth provider.
- Validate input.
- Handle verification and failure states.
- **Acceptance:** real authentication response is displayed.

**FE-07: Implement sign-in and sign-out**

- Maintain the approved session.
- Handle invalid credentials and expiry.
- **Acceptance:** private pages require a valid session.

**FE-08: Implement password recovery**

- Connect to the configured recovery flow.
- Handle provider responses accurately.
- **Acceptance:** no fake confirmation state.

### EPIC D — Complaint submission

**FE-09: Build the shared complaint form**

- Add description validation.
- Add mode selection and category controls.
- Reuse shared form components.
- **Acceptance:** client validation matches the backend contract.

**FE-10: Implement AI-assisted reporting**

- Submit complaint through the API.
- Display real analysis states.
- Handle review-required and failure outcomes.
- **Acceptance:** AI failure does not erase a persisted complaint.

**FE-11: Implement manual reporting**

- Add category selection.
- Support optional image and location.
- **Acceptance:** submission does not require AI availability.

**FE-12: Implement private image upload**

- Add type and size validation.
- Add preview, remove, and retry behavior.
- **Acceptance:** private images are never made public for convenience.

**FE-13: Implement optional location input**

- Request permission only after user action.
- Support manual location descriptions.
- **Acceptance:** users can submit without geolocation when permitted by the backend contract.

**FE-14: Implement submission confirmation**

- Display real tracking ID.
- Show current persisted status.
- Add tracking action.
- **Acceptance:** no client-generated fake IDs or premature success.

### EPIC E — Tracking and citizen history

**FE-15: Build tracking page**

- Implement the approved tracking authorization flow.
- Show citizen-safe fields.
- **Acceptance:** tracking ID does not expose private information by itself.

**FE-16: Build citizen complaint history**

- Fetch authorized records.
- Add loading, empty, and error states.
- **Acceptance:** results are scoped to the signed-in citizen.

**FE-17: Build complaint detail and timeline**

- Display status, summary, category, and approved events.
- Handle missing data.
- **Acceptance:** no fabricated milestones or internal notes.

### EPIC F — Quality and integration

**FE-18: Integrate shared API contracts**

- Use agreed TypeScript types.
- Handle errors and pagination.
- **Acceptance:** no conflicting field names or status identifiers.

**FE-19: Implement accessibility improvements**

- Keyboard navigation.
- Focus indicators.
- Accessible form labels.
- Screen-reader labels for icon-only actions.
- **Acceptance:** primary journeys can be completed with keyboard navigation.

**FE-20: Complete frontend QA**

- Test responsive layouts.
- Test authentication and complaint flows.
- Check links, buttons, console errors, and network failures.
- **Acceptance:** release checklist is completed and results recorded.

---

## 21. Frontend testing strategy

### 21.1 Unit tests

Test:

- Category label mapping.
- Status label mapping.
- Description validation.
- Contact form validation.
- Error-code-to-message mapping.
- Tracking ID display.
- Image file type and size validation.
- Location permission state handling.

### 21.2 Component tests

Test:

- Complaint form required fields.
- Invalid input messages.
- Loading and disabled submit states.
- Image preview and removal.
- Status badges.
- Complaint cards.
- Empty and error states.
- Accessible dialog behavior.

### 21.3 Integration tests

Test:

- Complaint submission success.
- Complaint submission validation failure.
- AI analysis timeout after complaint persistence.
- Image upload failure.
- Authentication expiry.
- Unauthorized complaint detail request.
- Tracking request for an unknown ID.
- Network interruption during submission.
- Contact form backend failure.
- Citizen history loading and pagination.

### 21.4 End-to-end tests

Automate the most important workflows where practical:

1. Citizen signs in.
2. Citizen submits a manual complaint.
3. The application receives a tracking ID.
4. Citizen opens the complaint tracking page.
5. Citizen sees the actual persisted status.
6. Citizen signs out.
7. Private complaint details are no longer accessible through the authenticated route.

Repeat the core complaint submission path for AI-assisted reporting and verify the real error state when AI is unavailable.

### 21.5 Browser and device tests

Test:

- Mobile viewport.
- Tablet viewport.
- Desktop viewport.
- Chrome.
- Safari.
- iOS Safari where available.

Check form controls, navigation, image preview, dialog behavior, long descriptions, tracking IDs, and status timelines. Do not claim support for a browser or device that has not been tested.

---

## 22. Performance and reliability requirements

- Optimize images and avoid oversized frontend bundles.
- Use appropriate image sizes and formats.
- Avoid unnecessary client-side JavaScript.
- Avoid fetching the same data repeatedly.
- Use pagination for complaint history.
- Avoid loading private images before access is authorized.
- Provide feedback for slow requests.
- Prevent duplicate submissions.
- Preserve entered information when a recoverable error occurs.
- Use appropriate caching for public content only.
- Do not cache private complaint data across users.
- Avoid rendering large complaint histories in a single page.

### Core Web Vitals targets

Use these targets when sufficient field data is available:

- LCP: at or below 2.5 seconds.
- INP: at or below 200 milliseconds.
- CLS: at or below 0.1.

These targets refer to the 75th percentile of field data. A single local test or lab run does not prove that the application meets them. Record actual measurements and any known performance limitations.

---

## 23. UX writing and content rules

Use clear, respectful language.

### Good examples

- "Your complaint has been recorded."
- "Your tracking ID is shown below."
- "AI analysis is still processing."
- "We could not complete the analysis. Your complaint is still saved."
- "This report needs additional review."
- "Location was not added. You can still continue."
- "You do not have permission to view this complaint."

### Avoid

- "Your complaint has been officially sent to the government" unless confirmed by a real integration.
- "The issue will be resolved within 24 hours" unless an authorized service commitment supports it.
- "AI verified the issue" when AI only analyzed a description or image.
- "Your email has been sent" when no delivery system confirms it.
- "Everything is secure" as an unsupported blanket guarantee.
- Technical stack traces or raw database errors in citizen-facing messages.

All UI copy must be checked for spelling, grammar, consistency, and understandable wording.

---

## 24. Final QA and release checklist

Complete this checklist before declaring the frontend ready.

### Functionality

- [ ] Landing page actions work.
- [ ] Navigation links work.
- [ ] Authentication works against the configured provider.
- [ ] Password recovery works if enabled.
- [ ] AI-assisted complaint submission works.
- [ ] Manual complaint submission works.
- [ ] Complaint validation works.
- [ ] Optional image upload works or reports its actual limitation.
- [ ] Optional location handling works.
- [ ] Tracking ID is returned from the server.
- [ ] Complaint tracking displays the correct record.
- [ ] Citizen history shows only authorized records.
- [ ] Contact form works against a real configured destination.
- [ ] Loading, empty, error, and success states are accurate.
- [ ] No fake buttons, fake data, or fake success messages remain.

### Design and accessibility

- [ ] Solid colors only; no gradients.
- [ ] Proper UI icon library used instead of emoji icons.
- [ ] Layout and spacing are consistent.
- [ ] Mobile navigation works.
- [ ] Forms are usable on mobile.
- [ ] Keyboard navigation works for primary journeys.
- [ ] Focus indicators are visible.
- [ ] Icon-only controls have accessible names.
- [ ] Text contrast is sufficient.
- [ ] Status is not communicated by color alone.
- [ ] Reduced-motion preferences are respected where applicable.

### Security and privacy

- [ ] Protected routes require authentication.
- [ ] Backend authorization is not replaced by frontend checks.
- [ ] Citizens cannot access another citizen's private records.
- [ ] Tracking does not expose sensitive data.
- [ ] Private images remain private.
- [ ] No server secrets appear in browser bundles.
- [ ] User-generated content is rendered safely.
- [ ] Error messages do not expose sensitive details.
- [ ] Private data is not stored unnecessarily in URLs or browser storage.

### Code quality and deployment

- [ ] TypeScript checks pass.
- [ ] Lint checks pass.
- [ ] Relevant automated tests pass.
- [ ] Production build succeeds.
- [ ] No unresolved critical console errors remain.
- [ ] Failed network requests have been investigated.
- [ ] Images are optimized.
- [ ] Chrome and Safari have been tested.
- [ ] Mobile behavior has been tested.
- [ ] HTTPS certificate is valid on the deployed domain.
- [ ] Deployment URL and routes work.
- [ ] Team-written code comments use Roman English/Roman Urdu in Latin characters.
- [ ] Known limitations and actual test results are documented.

Do not mark a checklist item as complete unless it has been verified.

---

## 25. Seven-day implementation plan

| Day | Focus | Deliverables |
|---|---|---|
| Day 1 | Setup and design system | Review repository and shared API contracts. Set up routes and common layouts. Define solid-color design tokens and typography. Build header, footer, and feedback components. |
| Day 2 | Public pages and authentication | Implement landing page. Implement sign-in and sign-up. Implement password recovery if enabled. Test session states and protected routes. |
| Day 3 | Complaint submission | Implement shared form and validation. Implement AI-assisted and manual paths. Connect the complaint creation API. Add real submission confirmation. |
| Day 4 | Images and location | Implement private image upload. Implement image preview and removal. Add optional geolocation and manual location entry. Test upload and permission failures. |
| Day 5 | Tracking and history | Implement tracking. Implement citizen complaint history. Add complaint details and status timeline. Verify ownership and privacy behavior. |
| Day 6 | Integration and accessibility | Align frontend types with backend responses. Test loading, empty, and error states. Test mobile and browser behavior. Fix accessibility and UI consistency issues. |
| Day 7 | QA and release | Run lint, type checks, tests, and production build. Test deployed routes and HTTPS. Verify forms and links. Review content and spelling. Record known limitations. Rehearse the citizen-facing demo. |

---

## 26. Definition of done

PRD-01 is complete only when:

1. The citizen-facing routes in scope are implemented.
2. The landing page accurately explains the service.
3. Authentication is integrated with the agreed provider.
4. AI-assisted and manual reporting paths work.
5. Input validation matches backend contracts.
6. Optional photo and location features handle failure safely.
7. A real tracking ID is displayed after complaint persistence.
8. Citizen tracking and history respect access rules.
9. Citizen-safe status history is displayed correctly.
10. Contact functionality is real or its unavailability is disclosed.
11. All visible controls have working behavior.
12. No fabricated data, fake success messages, or misleading official claims remain.
13. The UI follows the agreed solid-color design system with no gradients.
14. Proper UI icons are used instead of emoji icons.
15. Team-written code comments use Roman English/Roman Urdu in Latin characters.
16. Responsive behavior and accessibility have been tested.
17. Relevant automated tests, linting, type checks, and production build pass.
18. Chrome, Safari, and mobile testing have been completed to the extent available.
19. HTTPS and deployed routes have been verified.
20. Known issues, test results, and handoff notes are documented.

---

## 27. Release blockers

Do not release the frontend if:

- Complaint submission displays success before the server confirms persistence.
- The browser fabricates tracking IDs.
- AI failure causes a saved complaint to disappear from the user's view.
- Citizens can access another citizen's private complaint details.
- Private images are exposed publicly without authorization.
- A frontend-only role check is treated as sufficient security.
- Contact or notification flows pretend to work when no backend exists.
- UI claims official government delivery without a verified integration.
- Major buttons, routes, or forms are broken.
- Production build or required type checks fail.
- Critical mobile usability or security defects remain.
- The interface uses gradients or emoji icons contrary to the project design rules.
- Team-written code comments use Urdu script contrary to the agreed standard.

---

## 28. Final handoff

The frontend engineer must provide:

1. Completed citizen-facing pages and shared components.
2. Working AI-assisted and manual complaint submission flows.
3. Authentication and session-state handling.
4. Optional image and location features, if included in scope.
5. Citizen tracking and complaint history.
6. Shared frontend/API type definitions.
7. Automated tests and actual results.
8. Documentation of required public environment variables.
9. A list of unresolved issues and feature limitations.
10. A short citizen-journey demo script using synthetic complaint data.

> **Final principle:** CivicPulse AI must make reporting civic issues simple without misleading citizens about what the system has done. Every complaint submission, tracking result, AI suggestion, and status message must reflect real system behavior.
