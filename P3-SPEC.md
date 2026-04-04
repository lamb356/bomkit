BOMKit Dashboard: Saved BOM Intelligence for
KiCad
SPEC.md — P3 v1.0 | April 2026
Product: BOMKit Dashboard — persistent BOM workspace with JLC assembly cost
intelligence Builder: Carson (lamb356) Stack: TypeScript, Next.js 14, Neon PostgreSQL,
Stripe, Vercel Repo: lamb356/bomkit (bomkit-dashboard/ directory) Ship Date: MVP in 3
weeks Execution: Hermes Agent (WSL2) → Claude Code delegation (Windows)
0. Pre-Build: Fix BOMKit Fab Code Quality
Before building P3, fix the code smell flagged by Reddit users.
TASK 0: Clean Up Import Fallback Pattern
Problem: Every module in bomkit-fab uses this pattern:
try:
    from ..bom_exporter import BOMLine, export_bom
except ImportError:
    from bom_exporter import BOMLine, export_bom
This is fragile, confusing to readers, and looks amateur. It exists because KiCad loads
plugins with different Python path contexts than pytest.
Fix: Restructure as a proper Python package with a single import strategy.
bomkit-fab/
├── bomkit_fab/              # Proper package (underscore, not hyphen)
│   ├── __init__.py          # Package marker + version
│   ├── plugin.py            # KiCad ActionPlugin entry point
│   ├── bom_exporter.py
│   ├── cpl_exporter.py
│   ├── field_resolver.py
│   ├── sexp_parser.py
│   ├── board_adapter.py
│   ├── rotations.py

│   ├── jlcpcb_classifier.py
│   ├── cost_estimator.py
│   └── ui/
│       ├── __init__.py
│       ├── main_dialog.py
│       └── parts_table.py
├── tests/                   # Tests OUTSIDE the package
│   ├── conftest.py          # Add package root to sys.path
│   ├── test_field_resolver.py
│   ├── test_bom_exporter.py
│   ├── test_cpl_exporter.py
│   ├── test_rotations.py
│   ├── test_sexp_parser.py
│   └── fixtures/
│       └── test_board.kicad_pcb
├── rotations.csv
├── metadata.json
└── __init__.py              # KiCad plugin loader
Plugin loader (bomkit-fab/__init__.py):
import sys
import os
# Ensure the package is importable regardless of KiCad's cwd
plugin_dir = os.path.dirname(os.path.abspath(__file__))
if plugin_dir not in sys.path:
    sys.path.insert(0, plugin_dir)
from bomkit_fab.plugin import BOMKitFab
Test conftest.py:
import sys
import os
# Add bomkit-fab/ to path so `import bomkit_fab` works in tests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
All internal imports become clean:
# Inside any bomkit_fab module:
from bomkit_fab.bom_exporter import BOMLine, export_bom
from bomkit_fab.field_resolver import resolve_lcsc
from bomkit_fab.ui.parts_table import PartsTable

No try/except. No relative imports. No fallbacks. One path.
Completion criteria:
All try/except ImportError patterns removed
All imports use from bomkit_fab.module import X
pytest tests/ passes (all 32+ tests)
KiCad integration test passes via Windows delegation
Git commit + push with message: “refactor: clean package structure, remove import
fallbacks”
Reply to Reddit commenter: “Good catch — cleaned it up. Single import path now, no
more try/except shims.”
1. Strategic Context
1.1 What We’re Building
A web app where KiCad users upload BOMs, fix/annotate rows once, save their decisions
across revisions, and instantly see JLCPCB assembly cost implications. Not a pricing
aggregator. A persistent BOM workspace with JLC intelligence.
1.2 The One-Sentence Pitch
“Octopart for KiCad with memory and JLC fee math.”
1.3 Why This Is Worth $15/mo
Octopart BOM tool is free but has no persistence — BOMs expire in 48 hours. PartsBox has
persistence but costs €49/mo. The gap is saved BOM decisions at $15/mo with JLCPCB
assembly cost awareness.
What users pay for is NOT live pricing. What users pay for is:
Saved row cleanup decisions across revisions
Locked sourcing choices that survive BOM updates
JLC Basic/Extended/Preferred Extended cost impact visibility
Not redoing the same MPN resolution work every time they revise

1.4 What NOT To Build (Per ChatGPT Review)
DO NOT build for MVP:
Multi-distributor pricing aggregation (legal risk, API complexity)
Nexar/Octopart integration (100-part free cap, opaque paid pricing)
Health scoring composite (not why someone pays $15)
Automated alternate part suggestions (support nightmare)
Multi-EDA format parsing (KiCad only)
Team features or collaboration
BYOK API key management
SSE/WebSocket real-time updates
Redis queues or background workers
Historical pricing charts
Enterprise compliance (RoHS/REACH)
1.5 Competitive Position (Corrected)
Tool What It Does Why We Win
Octopart BOMFree, good matching, no
persistence We persist decisions
PartsBox Full workflow, €49/mo cliff We’re $15/mo for the 80%
OEMSecretsFree BOM save/refresh We have JLC intelligence + KiCad-
native flow
KiCost Spreadsheet pricing via
scraping We’re web-based, reliable, persistent
Fabrication
Toolkit KiCad PCM plugin for JLCWe’re the workflow AFTER export
Key insight from ChatGPT: “If the product on day one is just ‘upload BOM, see current
prices,’ it is too close to free tools. If the product is ‘upload KiCad BOM, keep your row
cleanup and sourcing choices across revisions, and instantly see JLC fee penalties,’ then
$15/mo is plausible.”

2. Core Features (MVP Only)
F1: BOM Import (Two Paths Only)
Accept exactly two formats on day one:
Path 1: BOMKit Fab export CSV
Columns: Comment, Designator, Footprint, LCSC Part Number
This is the primary funnel from Product 2
Auto-detected by column headers
Path 2: KiCad Symbol Fields Table CSV
Exported from Schematic Editor → Tools → Edit Symbol Fields → Export
Or from kicad-cli sch export bom --format csv
Variable columns — use field alias normalization from bomkit-fab
Parser requirements:
Auto-detect delimiter (comma → semicolon → tab)
Skip metadata rows before header
Case-insensitive column matching with alias map
Handle Unicode values (µF, Ω, ±)
Handle quoted designator groups (“C1,C2,C3”)
Graceful degradation when MPN is missing (most hobbyist BOMs)
Reuse field_resolver.py alias lists from bomkit-fab — port to TypeScript or call as shared
constants.
F2: Canonical BOM Schema (Persistent)
This is what gets saved. Users pay for this.
// Project — top-level container
interface Project {
  id: string;
  userId: string;
  name: string;                  // "Motor Controller v2"

  createdAt: Date;
  updatedAt: Date;
}
// BOMRevision — snapshot of a BOM at a point in time
interface BOMRevision {
  id: string;
  projectId: string;
  version: number;               // Auto-increment: 1, 2, 3...
  importedAt: Date;
  sourceFormat: 'bomkit-fab' | 'kicad-csv';
  sourceFilename: string;
  notes: string | null;          // User annotation for this revision
}
// BOMRow — one line item in a revision
interface BOMRow {
  id: string;
  revisionId: string;
  designators: string[];         // ["C1", "C2", "C3"]
  quantity: number;
  value: string;                 // "100nF"
  footprint: string;             // "C_0402_1005Metric"
  mpn: string | null;            // User-resolved or imported
  manufacturer: string | null;
  lcscPart: string | null;       // "C1525"
  status: 'resolved' | 'unresolved' | 'dnp' | 'excluded';
  jlcTier: 'basic' | 'preferred_extended' | 'extended' | 'not_found' | 'unknown';
  jlcLoadingFee: number;         // $0 or $3
  userNotes: string | null;      // User annotation per row
  lockedChoice: LockedChoice | null;
}
// LockedChoice — user's saved sourcing decision
interface LockedChoice {
  id: string;
  rowId: string;
  source: string;                // "LCSC", "Digi-Key", "Manual", etc.
  sku: string | null;            // Distributor SKU
  unitPrice: number | null;      // User-entered or fetched
  currency: string;              // "USD"
  lockedAt: Date;
  notes: string | null;          // "Confirmed with supplier 2026-04-01"
}
// LocalOffer — manual price entry (always legal to persist)
interface LocalOffer {

What is persisted (always legal):
BOMs, revisions, rows
User edits and resolved MPN mappings
Manual/local offers and attachments
Locked sourcing decisions
JLC classification snapshots and fee calculations
Timestamps and refresh status
User notes and annotations
What is NOT persisted:
Raw distributor API responses
Searchable cross-user pricing history
Normalized price/inventory/spec tables from third parties
F3: Dense BOM Table
The table IS the product. Must be fast, dense, and scannable.
Columns (default view):
RefQtyValueFootprintMPNLCSC#JLC
TierFeeStatusActions
Column behavior:
All columns sortable by click
Filter bar: text search across all columns
  id: string;
  rowId: string;
  source: string;                // Free text: "Digi-Key quote #12345"
  unitPrice: number;
  currency: string;
  moq: number | null;
  leadTimeDays: number | null;
  enteredAt: Date;
  notes: string | null;
}

Status filter buttons: All / Resolved / Unresolved / DNP
JLC tier filter: All / Basic / Extended / Not Found
Ref column: expandable to show individual designators
MPN column: editable inline (click to edit)
LCSC# column: editable inline, click to open LCSC product page
JLC Tier: color-coded badge (green=Basic, yellow=Pref.Ext, orange=Extended, red=Not
Found)
Fee column: $0 or $3, red highlight on $3
Actions: lock choice, add local offer, add note
Summary bar (always visible above table):
Project: Motor Controller v2 | Rev 3 | 47 parts
Resolved: 42 | Unresolved: 3 | DNP: 2
JLC Fees: 3 extended × $3 = $9.00 | Basic: 38 | Not Found: 6
Tech stack:
TanStack Table v8 (full control over custom cell renderers)
@tanstack/react-virtual for row virtualization (100+ row BOMs)
shadcn/ui components
Tailwind CSS
F4: JLC Assembly Cost Intelligence
This is the differentiator. Reuse classification logic from bomkit-fab.
Data source: lrks/jlcpcb-economic-parts GitHub repo (weekly-updated CSV of
Basic/Preferred Extended parts). Download and cache locally in Neon as a reference table.
This is JLCPCB’s own published classification — legal to store.
Alternative live source: jlcsearch.tscircuit.com — free REST API, no auth, no TOS
issues. Use for real-time LCSC part lookup and stock checks.
Per-row display:
JLC tier badge
Loading fee ($0 or $3)

Stock level (from jlcsearch, if LCSC# present)
“Basic alternative available” flag (if current part is Extended but a Basic equivalent
exists)
BOM-level summary:
Total unique extended parts × $3 = loading fees
Assembly cost estimate at different quantities (5, 10, 30, 50, 100 units)
“Switch to Basic” suggestions with estimated savings
F5: BOM Revision Tracking
When user uploads a new CSV for the same project:
Create new BOMRevision (auto-increment version)
Diff against previous revision: added rows, removed rows, changed values
Carry forward locked choices and manual offers where designator + value match
Show diff summary: “Rev 3 → Rev 4: 2 parts added, 1 removed, 3 values changed”
This is the core persistence value. Users don’t re-do work on every revision.
F6: One Live Source (Optional, Post-Week-1)
Use jlcsearch.tscircuit.com as the single live lookup:
Free, no auth required, no TOS restrictions documented
Returns: LCSC part number, MFR, package, description, stock, price
Endpoint: GET https://jlcsearch.tscircuit.com/components/list.json?search=
{mpn}&package={footprint}
This gives users one-click “check LCSC” without any API key setup. Not a multi-distributor
aggregator — just JLC/LCSC awareness, which is what BOMKit Fab users already care
about.
Display rules:
Source attribution: “Data from jlcsearch.tscircuit.com”
No persistent caching of prices — display only
Refresh button per row and bulk “Refresh All”

Show “last checked” timestamp
3. Architecture
3.1 Directory Structure
bomkit-dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing + BOM upload
│   │   ├── layout.tsx                  # Root layout
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Project list
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx            # BOM table view
│   │   │       └── settings/page.tsx   # Project settings
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── bom/
│   │   │   │   ├── import/route.ts     # BOM upload + parse
│   │   │   │   ├── [id]/route.ts       # BOM CRUD
│   │   │   │   └── [id]/rows/route.ts  # Row updates
│   │   │   ├── jlc/
│   │   │   │   ├── classify/route.ts   # JLC tier classification
│   │   │   │   └── lookup/route.ts     # jlcsearch proxy
│   │   │   ├── projects/route.ts       # Project CRUD
│   │   │   └── stripe/
│   │   │       ├── checkout/route.ts
│   │   │       └── webhook/route.ts
│   ├── lib/
│   │   ├── parsers/
│   │   │   ├── bomkit-csv.ts           # BOMKit Fab CSV parser
│   │   │   ├── kicad-csv.ts            # KiCad Symbol Fields CSV parser
│   │   │   ├── field-aliases.ts        # Shared alias map (ported from Python)
│   │   │   └── detect-format.ts        # Auto-detect import format
│   │   ├── jlc/
│   │   │   ├── classifier.ts           # Basic/Extended/Pref.Ext classification
│   │   │   ├── jlcsearch-client.ts     # jlcsearch.tscircuit.com API client
│   │   │   └── fee-calculator.ts       # Assembly cost calculations
│   │   ├── bom/
│   │   │   ├── diff.ts                 # Revision diff logic
│   │   │   ├── carry-forward.ts        # Carry locked choices across revisions
│   │   │   └── export.ts               # CSV/Excel export
│   │   └── db/

3.2 Database (Neon PostgreSQL via Drizzle ORM)
Reuse existing Neon + Drizzle setup from IntakeOS pattern.
3.3 Auth
NextAuth with GitHub OAuth (simplest for developer audience). Same pattern as IntakeOS.
3.4 Payments
Stripe Checkout + Customer Portal. Same pattern as IntakeOS.
Tier Price Limits
Free$0 1 project, 1 revision, 50 rows, no export
Solo $15/mo Unlimited projects/revisions/rows, CSV export, JLC lookup
Pro $29/mo Everything + share links + bulk operations + priority
3.5 Deployment
Vercel (existing account: team lamb356s-projects). Same deployment pattern as IntakeOS
and BillScan.
4. Hermes Autonomous Task Queue
│   │       └── schema.ts               # Drizzle ORM schema
│   ├── components/
│   │   ├── BOMTable.tsx                # Main table (TanStack Table)
│   │   ├── BOMSummary.tsx              # Summary bar
│   │   ├── ImportDialog.tsx            # Upload + format detection
│   │   ├── RowEditor.tsx               # Inline MPN/LCSC edit
│   │   ├── JLCBadge.tsx                # Tier badge component
│   │   ├── LocalOfferForm.tsx          # Manual offer entry
│   │   ├── RevisionDiff.tsx            # Diff view between revisions
│   │   └── ProjectCard.tsx             # Project list card
├── prisma/
│   └── schema.prisma                   # Database schema
├── package.json
├── next.config.js
├── tailwind.config.ts
└── .env.local                          # Neon, Stripe, NextAuth keys

Environment
Working directory:  /mnt/c/Users/burba/bomkit/bomkit-dashboard/
GitHub:             lamb356/bomkit (existing repo, new subdirectory)
Hermes config:      ~/.hermes/config.yaml
Model:              anthropic/claude-sonnet-4
Delegation:         claude '<task>' --print --permission-mode bypassPermissions
Windows tools:      Via windows-escape-hatch skill for KiCad testing
Pre-Flight (Carson does once)
1. Verify ~/.hermes/.env has: GH_TOKEN
2. Verify claude /login is authenticated in WSL2
3. Verify repo is current: cd /mnt/c/Users/burba/bomkit && git pull
TASK 0: Fix BOMKit Fab Import Pattern (P2 Code Quality)
Action: Restructure bomkit-fab as described in Section 0 of this spec. Key changes:
Rename inner package to bomkit_fab/ (underscore)
Move tests to tests/ outside package
Add conftest.py with sys.path setup
Remove ALL try/except ImportError patterns
All imports become from bomkit_fab.X import Y
Plugin loader in outer __init__.py adds package dir to sys.path
Completion criteria:
Zero try/except ImportError in any Python file
pytest tests/ passes (all existing tests)
KiCad integration test passes (delegate to Claude Code on Windows)
Committed and pushed
TASK 1: Next.js Project Scaffold

Action: Initialize bomkit-dashboard as a Next.js 14 app with App Router.
Create directory structure per Section 3.1. Create .env.local template with placeholder
keys.
Completion criteria: npm run dev starts without errors. Directory structure matches spec.
TASK 2: Database Schema
Action: Create Drizzle schema matching Section 2 F2 data model.
Tables: users, projects, bom_revisions, bom_rows, locked_choices, local_offers,
jlc_parts_cache (for the Basic/Extended reference data).
Include proper indexes: bom_rows.revisionId, bom_rows.lcscPart, projects.userId.
Completion criteria: npx drizzle-kit generate produces valid migration. npx drizzle-
kit push succeeds against Neon.
TASK 3: BOM Parsers
Action: Implement bomkit-csv.ts, kicad-csv.ts, field-aliases.ts, detect-format.ts.
Port the field alias map from bomkit-fab’s Python field_resolver.py to TypeScript. Same
20+ aliases for MPN, LCSC, manufacturer.
detect-format.ts: Read first 5 lines, check for BOMKit Fab headers (Comment,
Designator, Footprint, LCSC Part Number) vs KiCad CSV headers (Reference, Value,
Footprint, plus custom fields).
Both parsers output ParsedBOMRow[] with normalized fields.
cd /mnt/c/Users/burba/bomkit
npx create-next-app@latest bomkit-dashboard --typescript --tailwind --eslint --app --use-npm
cd bomkit-dashboard
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
npm install next-auth @auth/drizzle-adapter
npm install stripe @stripe/stripe-js
npm install @tanstack/react-table @tanstack/react-virtual
npm install lucide-react
npm install -D @types/node

Test with fixture files:
Copy a BOMKit Fab export from bomkit-fab/tests/fixtures/
Create a sample KiCad Symbol Fields CSV
Completion criteria: npm test passes parser tests for both formats. Edge cases: Unicode
values, semicolon delimiters, missing MPNs, quoted designators.
TASK 4: JLC Classification Engine
Action: Implement classifier.ts, fee-calculator.ts.
Download lrks/jlcpcb-economic-parts CSV → parse → seed jlc_parts_cache table in
Neon. Write a script to refresh this weekly.
classifier.ts: Given an LCSC part number, look up in local cache. Return basic |
preferred_extended | extended | not_found.
fee-calculator.ts: Given array of classified rows, calculate total loading fees per quantity
tier (5, 10, 30, 50, 100 units). Basic and Preferred Extended = $0. Extended = $3 per unique
part type.
Completion criteria: Tests pass for classification lookup and fee calculation. Known Basic
parts return ‘basic’ , known Extended return ‘extended’ .
TASK 5: JLC Search Client
Action: Implement jlcsearch-client.ts — wrapper around jlcsearch.tscircuit.com.
interface JLCSearchResult {
  lcsc: string;
  mfr: string;
  package: string;
  description: string;
  stock: number;
  price: number;
  source: 'jlcsearch.tscircuit.com'; // Always attribute
}
async function searchParts(query: string, packageFilter?: string): Promise<JLCSearchResult[]>
async function getPartByLCSC(lcscNumber: string): Promise<JLCSearchResult | null>

No auth needed. No caching of results in DB. Display-only with timestamps.
Completion criteria: Live API call returns real data for known parts (e.g., C1525 = 100nF
capacitor).
TASK 6: API Routes
Action: Implement all API routes per Section 3.1.
POST /api/bom/import — accept CSV upload, detect format, parse, create project +
revision + rows, classify JLC tiers, return project ID
GET /api/bom/[id] — return full BOM with rows, choices, offers
PATCH /api/bom/[id]/rows — update row fields (MPN, LCSC, notes, lock choice)
GET /api/jlc/classify?lcsc=C1525 — return JLC tier for a part
GET /api/jlc/lookup?query=100nF&package=0402 — proxy to jlcsearch
GET/POST /api/projects — CRUD
Auth middleware on all routes via NextAuth session.
Completion criteria: API routes work via curl/Postman. Import a BOMKit Fab CSV, get back
a project with classified rows.
TASK 7: BOM Table Component
Action: Build BOMTable.tsx — the core UI.
TanStack Table with:
Columns per Section 2 F3
Sortable headers
Text filter bar
Status filter buttons (All / Resolved / Unresolved / DNP)
JLC tier filter
Inline editing for MPN and LCSC columns
Color-coded JLC tier badges

Row virtualization for performance
BOMSummary.tsx — summary bar above table showing resolved/unresolved counts and JLC
fee totals.
Completion criteria: Table renders 100+ rows smoothly. Sorting, filtering, and inline editing
work. JLC badges show correct colors.
TASK 8: Import Flow UI
Action: Build ImportDialog.tsx and the landing page.
Drag-and-drop or file picker for CSV upload
Show format detection result (“Detected: BOMKit Fab export”)
Show parse preview (first 5 rows)
“Import” button → creates project → redirects to BOM table
Error handling for malformed files
Landing page: simple hero + upload area + “Sign in with GitHub” for new users.
Completion criteria: Full flow works: upload CSV → see preview → import → view in table.
TASK 9: Local Offers + Locked Choices
Action: Build LocalOfferForm.tsx and lock/unlock UI.
Click “Add Offer” on any row → modal with: source (free text), unit price, currency, MOQ,
lead time, notes
Click “Lock” → saves current best choice as the locked selection
Locked rows show a lock icon and don’t change on BOM re-import
Carry forward logic: when new revision imported, match locked rows by (designator +
value) and preserve choices
Completion criteria: Can add manual offer, lock a choice, import new revision, and see
locked choices carried forward.
TASK 10: Revision Diff

Action: Build RevisionDiff.tsx and diff logic.
When new revision imported for existing project, compute diff:
Added rows (in new, not in old)
Removed rows (in old, not in new)
Changed rows (same designator, different value/footprint/MPN)
Show diff as a compact summary + expandable detail
Carry forward locked choices for unchanged rows
Completion criteria: Import two revisions of same project. Diff shows correct
added/removed/changed.
TASK 11: Stripe Integration
Action: Set up Stripe billing.
Create products/prices in Stripe dashboard: Free, Solo ($15/mo), Pro ($29/mo)
Implement checkout flow and webhook handler
Gate features by tier: free = 1 project / 50 rows / no export, Solo = unlimited, Pro = share
links
Customer portal for subscription management
Reuse the exact Stripe pattern from IntakeOS.
Completion criteria: Can upgrade from free to Solo, see billing in Stripe dashboard,
features properly gated.
TASK 12: CSV Export
Action: Add export functionality.
Export current BOM as CSV with all columns including locked choices and JLC tiers
Export as JLCPCB-ready BOM (same format as BOMKit Fab output)
Gated behind Solo tier
Completion criteria: Exported CSV opens correctly in Excel and can be uploaded to
JLCPCB.

TASK 13: Deploy + README
Action: Deploy to Vercel, update README.
cd /mnt/c/Users/burba/bomkit/bomkit-dashboard
npx vercel --prod
Update root README.md to include Dashboard section with:
What it does
Link to live app
Pricing tiers
How it connects to BOMKit Fab
Add onboarding hint in BOMKit Fab’s export success dialog: “View in BOMKit Dashboard →”
Completion criteria: App is live on Vercel. README updated. Git pushed.
TASK 14: Launch
Action: Run product-launch skill.
GitHub release with Dashboard announcement
Draft posts for r/KiCad and KiCad forum (reference existing BOMKit Fab thread)
Dry-run first, then post after review
Completion criteria: Posts drafted in .hermes/launches/bomkit-dashboard/.
5. Risks
Risk LikelihoodImpactMitigation
jlcsearch.tscircuit.com
goes down or adds authLow High
Build with graceful fallback — JLC
classification works offline from
cached CSV
Users don’t convert from
free to Solo Medium Medium
Free tier is deliberately constrained (1
project, no export). Value is obvious

within first upload.
JLC parts database
format changes Low MediumCached locally, refreshed weekly.
Format changes caught by CI
Neon cold start latency
on first load Medium Low Use connection pooling, keep alive
Users want Digi-
Key/Mouser pricing
immediately
High MediumRoadmap item, not MVP. JLC focus is
the differentiator.
Someone builds this
faster Low High BOMKit Fab funnel is the moat —
users already in ecosystem
6. Success Metrics
Week 1: Dashboard deployed, import flow working
Week 2: 50+ BOMKit Fab users try Dashboard
Week 3: Stripe live, first upgrade attempt
Week 4: 5+ Solo subscribers ($75+ MRR)
Week 8: 20+ Solo subscribers ($300+ MRR)
Week 12: 50+ subscribers ($750+ MRR)
7. What Changes After MVP
Based on user feedback (monitored via forum-monitor skill):
1. Add Digi-Key direct API — only after verifying display approval requirements
2. Add Mouser API — simpler auth, good complement to LCSC
3. Basic alternate suggestions — for passives only (same value + package, different
manufacturer)
4. Simple health warnings — missing MPN, no stock, EOL lifecycle
5. Team sharing — read-only share links first, then multi-user

6. BOMKit Fab integration — direct upload from plugin to Dashboard via API key