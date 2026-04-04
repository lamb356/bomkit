# BOMKit: KiCad BOM Sourcing & Supply Chain Suite

## SPEC.md — v1.0 | April 2026

Product: BOMKit — three-product suite for KiCad BOM sourcing, fab export, and supply chain intelligence
Builder: Carson (lamb356)
Stack: Python (KiCad plugin), TypeScript/Next.js (web dashboard), SQLite (local state)
Target: KiCad 10 (shipped March 2026), backward-compatible with KiCad 8/9
License: Open-source core (MIT), freemium SaaS layer
Ship Date: MVP in 3 weeks (Product 2 first → Product 3 → Product 1)

-----

## 1. Strategic Context

### 1.1 The Problem

KiCad has an estimated 25,000–100,000 professional users who save $3,500–$7,500/year by not using Altium. These users currently have no reliable, API-based BOM sourcing workflow. The status quo is a 10+ step manual process: export CSV → browse distributor websites → copy-paste part numbers → install third-party plugin → generate BOM/CPL → manually rename column headers → upload to JLCPCB → fix rotation errors → re-generate → re-upload → order.

### 1.2 Why Three Products, Not One

KiCad’s plugin surface is PCB-editor-only (pcbnew Python bindings via SWIG). There is no schematic editor scripting API. Forcing everything through pcbnew creates a broken UX for design-time sourcing. The three natural product boundaries are:

| Product | What It Does | Where It Runs | KiCad Hook |
|---------|---------------|---------------|------------|
| BOMKit Fab (P2) | BOM/CPL export, rotation correction, JLCPCB validation, assembly cost warnings | KiCad pcbnew plugin | pcbnew.ActionPlugin |
| BOMKit Dashboard (P3) | Live multi-distributor pricing, lifecycle monitoring, BOM health scoring, alternate ranking | External web app | Ingests kicad-cli sch export bom output or XML netlist |
| BOMKit Parts (P1) | Curated parts library with approved MPNs, alternates, and parametric data | KiCad Eeschema | HTTP library (.kicad_httplib) or database library |

### 1.3 Build Order Rationale

Product 2 (Fab) FIRST — smallest scope, clearest pain point, fastest path to users.

Product 3 (Dashboard) SECOND — where the revenue lives.

Product 1 (Parts) THIRD — most ambitious, requires building an HTTP library server.

Important positioning note:
- BOMKit Fab should be framed as the first wedge, not the whole vision.
- The long-term product value is not just better final export, but moving sourcing and manufacturability feedback earlier in the workflow.
- Fab export is the initial trust-building entry point; the broader BOMKit opportunity is process-aware design-to-order support.

### 1.4 Competitive Position

| Tool | Strength | Fatal Flaw |
|------|----------|------------|
| KiCost (599★) | Multi-distributor pricing | Web scraping breaks constantly |
| kicad-jlcpcb-tools (1,800★) | JLCPCB part assignment + BOM/CPL | JLCPCB-only; wrong-parts bug risk |
| PartsBox (€49+/mo) | Best UX, HTTP lib integration | Price barrier; inventory-focused |
| InteractiveHtmlBom (4,300★) | Assembly visualization | No pricing, no sourcing |

BOMKit’s wedge: Free, open-source, API-based, multi-distributor, with JLCPCB as the primary workflow.

-----

## 2. Product 2: BOMKit Fab (KiCad Plugin)

### 2.1 Scope — What It Does

A KiCad pcbnew ActionPlugin that generates manufacturer-ready BOM and CPL files with zero manual column renaming, automatic rotation correction, and assembly cost estimation.

### 2.2 Scope — What It Does NOT Do

- No live API calls to distributors (that’s Product 3)
- No schematic editing or symbol assignment
- No inventory management
- No ERP/MRP integration
- No full early-stage process guidance yet — that is part of the broader BOMKit roadmap beyond the initial Fab wedge

### 2.3 Core Features (MVP — Week 1-2)

#### F1: One-Click JLCPCB BOM + CPL Export

Input: Current PCB board loaded in pcbnew
Output: Two files in project directory:

- {project}_BOM_JLCPCB.csv — columns: Comment, Designator, Footprint, LCSC Part Number
- {project}_CPL_JLCPCB.csv — columns: Designator, Mid X, Mid Y, Layer, Rotation

Field Resolution Logic (priority order):

1. LCSC or LCSC Part Number or LCSC_Part field on footprint
2. lcsc (case-insensitive match)
3. If none found → flag component as unresolved in UI

MPN aliases: mpn, pn, p#, part_num, manf#, mfg#, mfr#, part_number, manufacturer_part, mfr_part, mfg_part_number, manf_pn
LCSC aliases: lcsc, lcsc_part, lcsc_part_number, jlcpcb_part, jlc

Designator Grouping Rules:

- Group by identical (Value + Footprint + LCSC Part Number)
- Comma-separate designators within groups
- Maximum 200 designators per line
- Each reference designator appears exactly once across entire BOM

CPL Generation:

- Coordinates in mm, relative to board origin
- Layer: Top or Bottom
- Y-axis: ensure positive values (warn if board origin produces negatives)

#### F2: Rotation Correction Database

Built-in database loaded from rotations.csv in plugin directory.
User can override with rotations_custom.csv in project directory.
Mirror bottom components by negating rotation for bottom-side components per JLCPCB convention.

#### F3: Assembly Cost Estimation

Classify each component by JLCPCB assembly tier:

- Parse downloaded JLCPCB parts database CSV
- Or use cached classification from previous session (SQLite in plugin data dir)
- Display per-component: Basic / Extended / Preferred Extended / Not Found

Show total assembly cost estimate with loading-fee breakdown.

#### F4: Unresolved Parts Dashboard

wxPython dialog showing all components in a sortable/filterable table with Ref, Value, Footprint, LCSC#, Status, and assembly state.

Respect KiCad 10 attributes:

- EXCLUDE_FROM_BOM → skip entirely
- DNP → show but mark as excluded from assembly
- EXCLUDE_FROM_BOARD → skip entirely

### 2.4 Architecture

bomkit-fab/
├── __init__.py
├── plugin.py
├── bom_exporter.py
├── cpl_exporter.py
├── field_resolver.py
├── rotations.py
├── rotations.csv
├── jlcpcb_classifier.py
├── cost_estimator.py
├── ui/
│   ├── main_dialog.py
│   └── parts_table.py
├── metadata.json
└── icon.png

### 2.5 KiCad Integration Details

Plugin Registration:

```python
import os
import pcbnew

class BOMKitFab(pcbnew.ActionPlugin):
    def defaults(self):
        self.name = "BOMKit Fab"
        self.category = "Manufacturing"
        self.description = "Generate JLCPCB-ready BOM + CPL with rotation correction"
        self.show_toolbar_button = True
        self.icon_file_name = os.path.join(os.path.dirname(__file__), "icon.png")
```

### 2.6 PCM Distribution

metadata.json should follow PCM v2 and identify the plugin as com.github.lamb356.bomkit-fab.

### 2.7 Test Plan

Test areas:
- BOM generation
- CPL generation
- Field resolution
- Cost estimation
- UI responsiveness and sorting

-----

## 3. Product 3: BOMKit Dashboard (Web App)

### 3.1 Scope

External web application that ingests KiCad BOM exports, applies multi-distributor sourcing rules, and displays live pricing, stock, lifecycle status, and BOM health scores.

### 3.2 Core Features (MVP — Week 2-3)

- BOM import via file upload, paste, or API
- Multi-distributor live pricing (LCSC, Digi-Key first)
- BOM health score
- Alternate part suggestions
- JLCPCB assembly optimizer
- earlier-stage process feedback so sourcing and manufacturability issues can be surfaced before final fab handoff

### 3.3 Architecture

bomkit-dashboard/
├── src/
│   ├── app/
│   ├── lib/
│   └── components/
├── prisma/schema.prisma
├── package.json
└── next.config.js

### 3.4 Data Model

Persist BOM project metadata, but never persist distributor pricing/stock data.

### 3.5 Monetization

- Free: 1 project, 50 components, LCSC only
- Pro: $29/mo
- Team: $49/mo + $15/seat

### 3.6 Deployment

- Vercel
- PostgreSQL via Neon
- NextAuth
- Stripe billing

-----

## Roadmap Note from Early User Feedback

A useful piece of external feedback is that many sourcing and manufacturability mistakes are already baked in by the time a user reaches BOM/CPL export. That suggests the strongest long-term BOMKit position is not just export automation, but earlier process-aware intervention.

Roadmap implication:
- keep BOMKit Fab as the first shipping wedge
- use it to earn trust around export correctness and assembly handoff
- then move earlier in the workflow with:
  - BOM health and sourcing risk visibility
  - alternate-part readiness
  - approved parts / library workflows
  - earlier manufacturability warnings before final fab export

This feedback should influence product messaging and prioritization, but it does not invalidate the current build order. It strengthens the rationale for treating Fab as the entry point into a broader design-to-order system.

-----

## 4. Product 1: BOMKit Parts (HTTP Library Server)

### 4.1 Scope

A local or hosted HTTP server that KiCad’s Eeschema consumes as a .kicad_httplib parts source.

### 4.2 How KiCad HTTP Libraries Work

The server must implement:
- GET /categories
- GET /parts?category_id=X
- GET /parts/{id}

### 4.3 Core Features (Post-MVP — Week 4+)

- Curated passives library
- User-defined approved parts list
- Sync with Dashboard
- Parametric search in Symbol Chooser

### 4.4 Architecture

bomkit-parts/
├── server.py
├── categories.py
├── parts_db.py
├── kicad_httplib.py
├── curated/
└── bomkit.kicad_httplib

### 4.5 Important Constraints

- Read-only from KiCad today
- No seamless one-click replacement in schematic
- Local-first option supported

-----

## 5. Cross-Product Technical Details

### 5.1 Distributor API Integration Reference

Target distributors include LCSC, Digi-Key, Mouser, Arrow, JLCPCB Parts, and Nexar/Octopart with per-distributor auth/rate-limit handling.

### 5.2 Legal/Data-Rights Constraints (NON-NEGOTIABLE)

1. No persistent caching of distributor pricing/stock data.
2. Source attribution required.
3. No aggregation into a public API.
4. Users provide their own API keys.

### 5.3 KiCad Version Compatibility

Target KiCad 10 first, maintain backward compatibility with KiCad 8/9 where practical.

### 5.4 KiCad 10 Design Variants Support

BOMKit Fab must eventually support variant-specific BOM export and DNP behavior.

-----

## 6. Hermes Agent Autonomous Execution Plan

### 6.1 Environment

Working directory: /mnt/c/Users/burba/bomkit/
GitHub: lamb356/bomkit
KiCad plugin dir: /mnt/c/Users/burba/AppData/Roaming/kicad/10.0/3rdparty/plugins/

### 6.2 Pre-Flight Checklist

1. Create repo directory and git init
2. Copy this SPEC.md into project root
3. Ensure Claude Code is accessible
4. Ensure gh auth status works

### 6.3 Autonomous Task Queue

Task flow:
- TASK 0: WSL2 Environment Setup
- TASK 1: Project Scaffolding
- TASK 2: S-Expression Parser + Board Adapter
- TASK 3: Field Resolver Module
- TASK 4: Rotation Database
- TASK 5: BOM Exporter
- TASK 6: CPL Exporter
- TASK 7: JLCPCB Classifier
- TASK 8: wxPython UI Dialog
- TASK 9: Plugin Entry Point
- TASK 10: README and Documentation
- TASK 11: Git Commit and Push
- TASK 12: Integration Test with Sample Board

If a task fails after one retry, write BLOCKED.md and continue to the next non-dependent task.

### 6.4 Hermes Skills File

After completion, save a reusable BOMKit development skill containing repo path, products, and constraints.

### 6.5 Hermes Cron (Post-Build)

Potential future automations:
- Daily JLCPCB parts DB refresh checks
- Weekly GitHub issue triage
- On-demand BOM health checks via Telegram

-----

## 7. Go-to-Market

- Ship BOMKit Fab first
- Post to KiCad forum, Reddit, GitHub, YouTube channels
- Submit to KiCad PCM
- Follow with Dashboard MVP, then Parts server

Success metrics include installs, signups, and MRR targets over 12 weeks.

-----

## 8. Risk Register

Key risks:
- LCSC API approval delays
- Digi-Key OAuth complexity
- KiCad pcbnew API breakage
- Existing tools being good enough
- Distributor terms changes
- Low paid conversion

Each risk should have a mitigation plan.

-----

## 9. Hermes Execution Command

Hermes can execute the build by reading this SPEC.md and running the autonomous task queue sequentially inside /mnt/c/Users/burba/bomkit.
