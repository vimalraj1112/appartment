# SuperLink Community — A1.1 Architecture Package

Status: AWAITING APPROVAL
Tagline: "Smart Living. Safer Communities. One Connected Platform."

---

## 1. Architecture Overview

### 1.1 Repository (npm workspaces monorepo)

```
superlink/
├── apps/
│   ├── api/                  Express + TypeScript (strict)
│   └── web/                  React + TypeScript (strict) + Vite
├── packages/
│   └── shared/               Zod schemas, DTO types, RBAC matrix, enums, constants
├── docs/
│   ├── ARCHITECTURE.md       (this file)
│   ├── DECISIONS.md          one line per architectural decision
│   ├── PROGRESS.md           phase status
│   └── ASSETS.md             placeholder image briefs (Phase 13)
├── docker-compose.yml        postgres:16, redis:7
├── .env.example
├── package.json              scripts: dev, lint, typecheck, test, build
└── tsconfig.base.json
```

### 1.2 Backend layering

```
routes  →  middleware (auth → rbac → validate → tenant-context)
        →  controllers (thin: parse + call service + envelope)
        →  services (business logic, audit writes, events)
        →  repositories (Prisma, ONLY place raw queries live)
        →  PostgreSQL (Prisma)   Redis (cache/rate-limit/queues)
Background: BullMQ workers (bills, reminders, reports, announcements, email)
Realtime:   Socket.IO (authenticated handshake, rooms: community:{id}, user:{id})
```

Cross-cutting services behind interfaces (mocks live in `apps/api/src/mocks/`):
- `StorageAdapter` — S3/Cloudinary (prod), local disk (dev)
- `EmailProvider` — mock (dev logs link), SMTP/SES (prod)
- `PaymentProvider` — Razorpay adapter + Mock adapter
- `PushProvider` / `WhatsAppProvider` — interface + mock (v1)
- `LLMProvider` — real adapter (env-configured) + deterministic mock (tests)

### 1.3 Runtime topology (v1)

- Single API process hosts HTTP + Socket.IO + BullMQ workers (separate worker entrypoint kept ready for scale-out).
- Redis: cache, rate limiting, BullMQ, Socket.IO adapter.
- Web: Vite dev server proxying `/api` → API; static build in production.

---

## 2. Prisma Schema Outline

Conventions: UUID PKs (`dbgenerated("gen_random_uuid()")`), `createdAt`/`updatedAt` on every table,
`deletedAt` for soft-deletable entities, `communityId` non-null + indexed on every tenant-owned table,
composite indexes on `(communityId, status)`, `(communityId, createdAt)`, FKs with explicit `OnDelete`.

### Phase 1 — core
| Model | Key fields |
|---|---|
| Community | name, slug (unique), address, city, state, timezone, status `ACTIVE\|SUSPENDED`, settings→CommunitySetting |
| CommunitySetting | communityId (unique), logoUrl, currency, lateFeeConfig JSON, onboardingStep |
| User | communityId? (null = platform admin), role `SUPER_ADMIN\|COMMUNITY_ADMIN\|SECURITY\|RESIDENT\|STAFF`, email (unique), phone, passwordHash, firstName, lastName, avatarUrl, status `ACTIVE\|INVITED\|DISABLED`, emailVerifiedAt, lastLoginAt |
| Session | userId, refreshTokenHash (unique), userAgent, ip, expiresAt, revokedAt |
| AuditLog | communityId?, userId, action, resource, resourceId, meta JSON, ip, createdAt (no update, no delete) |
| SubscriptionPlan | name, code, priceMonthlyInr, flatLimit, features JSON, status |
| Subscription | communityId (unique), planId, status `ACTIVE\|TRIAL\|PAST_DUE\|CANCELLED`, periodStart, periodEnd, providerMeta JSON |

### Phase 2 — structure
Building (communityId, name, towerCode, floorsCount) → Floor (buildingId, label, number) → Flat (floorId, code "A-302", type, status `OCCUPIED\|VACANT\|BLOCKED`, ownerUserId?, tenantUserId?)
- FlatOccupant (flatId, userId, relation `OWNER\|TENANT`, movedInAt, movedOutAt)
- FamilyMember (flatId, name, relation, phone, age, isStaff)
- ResidentDocument (userId, flatId, type, fileKey, mimeType, sizeBytes)
- Invitation (communityId, email/phone, role, flatId?, tokenHash, expiresAt, acceptedAt)

### Phase 4 — visitors/security
Visitor, VisitorPass (code, qrToken, type `SINGLE_USE\|TIME_WINDOW`, validFrom/To, status `ACTIVE\|USED\|EXPIRED\|CANCELLED`), VisitorEntry (direction `IN\|OUT`, guardUserId, method `QR\|WALK_IN`), VisitorPhoto, Delivery (category, company, personName, phone, flatId, status), DeliveryEntry, WatchlistEntry (type `PERSON\|VEHICLE`, reason, flaggedBy)

### Phase 5 — complaints/staff
Complaint (flatId, raisedById, categoryId, title, description, priority `LOW\|MEDIUM\|HIGH\|URGENT`, status `OPEN\|ASSIGNED\|IN_PROGRESS\|RESOLVED\|CLOSED`, assignedToId?, location, rating), ComplaintCategory, ComplaintComment, ComplaintAttachment, StaffProfile (userId, trade, availability), StaffAssignment, StaffEntry (IN/OUT), DomesticStaff (flatId, name, phone, photo, idInfo, workType, status)

### Phase 6 — billing
MaintenanceConfig (communityId, flatType, baseInr, waterInr, parkingInr, lateFeeInr, graceDays), MaintenanceBill (flatId, period "2026-10", totalInr, status `PENDING\|PARTIAL\|PAID\|OVERDUE`, dueDate, generatedAt — UNIQUE(flatId, period)), MaintenanceBillItem (label, amountInr), Payment (billId, amountInr, provider, providerRef, status `PENDING\|PROCESSING\|SUCCESS\|FAILED\|REFUNDED`, idempotencyKey UNIQUE), PaymentReceipt (receiptNo, fileKey), Expense, ExpenseCategory

### Phase 7 — amenities/parking/vehicles
Amenity (name, icon, hours JSON, slotMinutes, capacity, feeInr, rules), AmenitySlot (optional materialized slots), AmenityBooking (amenityId, date, slotStart, flatId, userId, status `BOOKED\|CANCELLED\|WAITLISTED` — UNIQUE(amenityId, date, slotStart, flatId) + partial unique for BOOKED status), AmenityWaitlist (position), Vehicle (userId, flatId, regNumber UNIQUE per community, type `CAR\|BIKE\|EV\|BICYCLE`, brand, model, color, isGuest, guestExpiresAt), ParkingSlot (code, zone, status `AVAILABLE\|OCCUPIED\|RESERVED\|MAINTENANCE`), ParkingAssignment, ParkingVisitor

### Phase 8 — communication
Announcement (type `GENERAL\|URGENT\|MAINTENANCE\|EVENT\|EMERGENCY`, title, body, attachments, publishAt, status, pinnedUntil), AnnouncementAck (announcementId, userId), Notification (userId, type, title, body, data JSON, readAt), NotificationPreference (userId, channel × type), CommunityPost (userId, body, images, status `VISIBLE\|HIDDEN\|REMOVED`, reportedCount), CommunityComment, CommunityReaction (userId+postId, emoji — UNIQUE), PostReport

### Phase 9 — emergency
EmergencyAlert (flatId, userId, category `MEDICAL\|FIRE\|SECURITY\|ELECTRICAL\|WATER\|OTHER`, status `TRIGGERED\|ACKNOWLEDGED\|RESOLVED`, acknowledgedBy, resolvedBy, note) — indexed on (communityId, status)

### Phase 11 — AI
AiConversation (userId, title), AiMessage (conversationId, role `USER\|ASSISTANT\|TOOL`, content, toolName?, toolArgs?, toolResult?, tokens), AiToolCall log (userId, communityId, tool, ok, ms)

### Phase 13 — marketing
DemoLead (name, email, phone, communityName, flats, message, status)

### Utility
Document (polymorphic: ownerType, ownerId, fileKey, mimeType), ServiceRequest + Vendor (Phase 8/10 as scheduled)

---

## 3. RBAC Matrix (source of truth: `packages/shared/src/rbac.ts`)

Roles: `SUPER_ADMIN (SA)` · `COMMUNITY_ADMIN (CA)` · `SECURITY (SG)` · `RESIDENT (RS)` · `STAFF (ST)`

| Capability | SA | CA | SG | RS | ST |
|---|---|---|---|---|---|
| Create/suspend communities, manage plans | ✔ | ✘ | ✘ | ✘ | ✘ |
| Platform analytics / audit viewer | ✔ | ✘ | ✘ | ✘ | ✘ |
| Manage buildings/floors/flats | ✘ | ✔ | ✘ | ✘ | ✘ |
| Manage residents / invitations | ✘ | ✔ | ✘ | ✘ | ✘ |
| View community reports & analytics | ✘ | ✔ | ✘ | ✘ | ✘ |
| Configure maintenance & bills | ✘ | ✔ | ✘ | ✘ | ✘ |
| View any bill / manual payment / expenses | ✘ | ✔ | ✘ | ✘ | ✘ |
| Manage amenities config, vendors, announcements | ✘ | ✔ | ✘ | ✘ | ✘ |
| Moderate community feed | ✘ | ✔ | ✘ | ✘ | ✘ |
| Create visitor pass | ✘ | ✔ | ✘ | ✔ (own flat) | ✘ |
| Approve/reject visitor & delivery | ✘ | ✔ | ✘ | ✔ (own flat) | ✘ |
| Scan QR / entry / exit / walk-in register | ✘ | ✔ | ✔ | ✘ | ✘ |
| Deliveries, watchlist, vehicle search | ✘ | ✔ | ✔ | ✘ | ✘ |
| View emergency alerts / trigger | ✔ | ✔ | ✔ | ✔ | ✘ |
| Raise complaint | ✘ | ✔ | ✘ | ✔ | ✘ |
| Assign complaint / manage workflow | ✘ | ✔ | ✘ | ✘ | ✘ |
| Update assigned complaint only | ✘ | ✔ | ✘ | ✘ | ✔ |
| View own bills / pay | ✘ | ✘ | ✘ | ✔ | ✘ |
| Book amenities / register own vehicle | ✘ | ✔ | ✘ | ✔ | ✘ |
| Community feed post/comment/react | ✘ | ✔ | ✘ | ✔ | ✘ |
| View announcements | ✔ | ✔ | ✔ | ✔ | ✔ |
| AI tools: community statistics | ✔ | ✔ | ✘ | ✘ | ✘ |
| AI tools: own bills/visitors/bookings | ✘ | ✘ | ✘ | ✔ | ✘ |
| AI tools: help content only | ✘ | ✘ | ✔ | ✘ | ✔ |

Hard rules:
- SECURITY is blocked from every `/payments`, `/maintenance`, `/expenses`, `/reports` route — enforced by matrix + asserted by generated tests.
- RESIDENT data access is always scoped to `own flatId` / `own userId`.
- STAFF sees only complaints where `assignedToId = session.userId`.
- The matrix file generates the test matrix; a test iterates (role × route) and asserts expected 200/403.

---

## 4. Tenant-Isolation Design

1. **TenantContext** — after JWT verification, middleware stores `{ userId, communityId, role }` in `AsyncLocalStorage`. Never read from body/params/query.
2. **Scoped Prisma client** — `prisma.$extends`:
   - `query` hook on every tenant-owned model: `findMany/findFirst/update/delete/upsert` get `WHERE communityId = ctx.communityId` merged; `create` gets `communityId` forced from context; aggregates get filtered `where`.
   - Runs at the repository layer — controllers cannot obtain an unscoped client.
3. **Super Admin bypass** — `withPlatformClient(fn)` is the single audited escape hatch; every use writes an AuditLog entry with `action: "PLATFORM.ACCESS"`.
4. **Cross-tenant ID defense** — IDs arriving via params are looked up through scoped repositories; miss → `404` (not 403, to avoid existence leaks).
5. **Socket.IO** — handshake requires valid JWT; socket joins `community:{communityId}` and `user:{userId}` rooms from the token; every emit path re-runs the same service that REST uses (no direct DB writes from socket handlers).
6. **Tests** — repository-level suite proves Community A context cannot read/write Community B rows; extended in every phase; resident privacy (A can't read B's bills/visitors) and role-denial suites grow alongside.

---

## 5. API Conventions

- Base: `GET/POST/PUT/PATCH/DELETE /api/v1/<domain>`
- Success: `{ "success": true, "data": <payload>, "meta": { …pagination } }`
- Error: `{ "success": false, "error": { "code": "FORBIDDEN", "message": "Friendly text" } }`
- Codes: `UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, CONFLICT, RATE_LIMITED, PAYMENT_FAILED, INTERNAL`
- Validation: shared Zod schemas in `packages/shared`, applied by `validate(schema)` middleware; error → `VALIDATION_ERROR` with field details (never raw Zod output).
- Pagination: `?page=1&limit=20&sort=createdAt:desc&q=text` → `meta { page, limit, total, totalPages }` (limit capped at 100).
- Rate limits: global + stricter on `/auth` and QR verification.
- Security: Helmet, CORS allowlist, argon2 hashing, HTTP-only `refresh` cookie (SameSite=Lax, Secure in prod), access token 15 min in memory, refresh rotation with reuse detection, file uploads limited by size + MIME allowlist.

---

## 6. Frontend Route Map

```
PUBLIC (marketing + auth)
  /                      Landing page (Phase 13)        /login  /forgot-password  /reset-password
  /accept-invite/:token  Invitation acceptance

RESIDENT (mobile-first, bottom nav: Home · Visitors · Pay · More)
  /app                   Dashboard (Phase 3)
  /app/visitors          Passes, approvals, history     /app/visitors/new
  /app/complaints        List + /app/complaints/new + detail
  /app/payments          Bills, pay, history, receipts  /app/payments/:id
  /app/amenities         Calendar + bookings            /app/amenities/:id
  /app/vehicles          My vehicles / guest pre-auth
  /app/feed              Community feed
  /app/announcements     List + detail
  /app/notifications     List + preferences
  /app/profile           Family, documents, settings    /app/emergency (hold-to-trigger)

ADMIN (desktop-first sidebar: 21 items per spec §22)
  /admin                 Dashboard (cards + Recharts)
  /admin/onboarding      8-step wizard (Phase 2)
  /admin/residents  /admin/buildings  /admin/flats  /admin/visitors  /admin/security
  /admin/deliveries  /admin/complaints  /admin/maintenance  /admin/payments
  /admin/amenities  /admin/vehicles  /admin/parking  /admin/staff  /admin/announcements
  /admin/community       Feed moderation + announcements ack stats
  /admin/vendors  /admin/expenses  /admin/reports  /admin/ai  /admin/settings
  /admin/scorecard       Community health scorecard (Phase 10)

SECURITY (tablet-first, large touch targets)
  /guard                 Stats + big action buttons
  /guard/scan            QR camera + manual code fallback
  /guard/visitors        Register / entry / exit / expected
  /guard/deliveries  /guard/vehicles (search + watchlist)  /guard/emergency
  /guard/handover        Shift handover report (Phase 10)

PLATFORM (Super Admin)
  /platform              SaaS metrics   /platform/communities (+ detail)
  /platform/plans  /platform/subscriptions  /platform/leads  /platform/admins
  /platform/audit  /platform/settings
```

Guards: `RequireAuth` → `RequireRole([...])` (imported from shared RBAC) → lazy route groups per role. Unauthorized → friendly 403 screen, not a blank redirect.

---

## 7. Design Tokens (Tailwind preset, used everywhere)

| Token | Value |
|---|---|
| `navy` | `#0B1F3A` (primary dark, sidebar, marketing) |
| `teal` | `#0F9D8A` (primary accent, CTA, links) |
| `gold` | `#C9A24B` (sparingly: premium badges, hero accents) |
| `bg` | `#F7F8FA` · `surface` `#FFFFFF` |
| `text` | `#101828` · `muted` `#667085` |
| `danger` `#D92D20` · `success` `#12B76A` · `warning` `#F79009` |
| Radius | cards `16–24px`, buttons `10–12px`, inputs `10px` |
| Shadow | `soft` (0 1 2 rgba) / `card` (0 4 16 rgba 6%) / `lift` (hover) |
| Type | Inter (UI) + display serif (marketing H1 only), body ≥14px |
| Spacing | 4px grid; sections 64–128px; card padding 20–24px |

**Motion tokens** (`animations/variants.ts`):
`fadeInUp`, `stagger`, `scaleIn`, `blurIn`, `pageTransition`, `modalSpring`, `countUp`,
`hoverLift`, `pressScale`, `ctaSweep` (hero gradient), `iconMorph` (morphing icons),
`sharedLayout` (list→detail), `scrollProgress` (landing bar), `chartReveal`.
All respect `prefers-reduced-motion` via a global `useReducedMotion` toggle.

**UX contract per screen:** skeleton loader · designed empty state · friendly error · confirmation dialog on destructive actions · toasts · search/filter/sort/pagination on tables.

---

## 8. Implementation Roadmap

| # | Phase | Added feature ideas inside this phase |
|---|---|---|
| 1 | Foundation: monorepo, auth, RBAC, multi-tenancy, core schema | — |
| 2 | Community structure, residents, invitation, onboarding wizard | bulk flat creation |
| 3 | Resident dashboard + notifications + Socket.IO | flat bill/payment ledger, motion system baseline |
| 4 | Visitors, QR passes, security dashboard, deliveries | shareable QR link, expected-visitors widget, watchlist |
| 5 | Complaints workflow, staff, domestic staff | real-time assignment |
| 6 | Maintenance billing + payments | dunning sequence (1/5/10), auto late-fee w/ grace, UPI QR on invoice |
| 7 | Amenities, parking, vehicles | waitlist auto-promote, recurring bookings, guest vehicle pre-auth |
| 8 | Announcements, notification service, community feed | urgent-announcement pin/ack, preferences UI |
| 9 | Emergency system | hold-to-trigger, rate limit, live guard alert |
| 10 | Reports, analytics, charts | community health scorecard, guard shift handover report |
| 11 | AI assistant (tools-only) | weekly AI digest, voice input stub |
| 12 | Super Admin, subscriptions, platform dashboard | usage-based add-on pricing, dark mode toggle |
| 13 | Marketing landing page | scroll-progress, CTA sweep, PWA install, WhatsApp deeplink |
| 14 | Hardening, security audit, performance, deployment | full regression of all feature tests |

**Phase gate (every phase):** app runs → `lint` + `typecheck` clean → migrations apply on fresh DB → phase tests pass → report (works / deferred / assumptions) → wait for "continue".

**Testing stack:** Vitest + Supertest (API, RBAC matrix generated from shared file, tenant isolation), Vitest + Testing Library (frontend key flows).
