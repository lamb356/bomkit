# Draft KiCad forum post

Title:
BOMKit Dashboard — persistent BOM workspace for KiCad BOM revisions

Body:
I’m extending BOMKit beyond just export.

BOMKit Fab handles the manufacturing handoff side inside KiCad by exporting JLC-ready BOM/CPL files.

BOMKit Dashboard is the companion web app for what happens after export:
- import BOMKit Fab CSVs or KiCad Symbol Fields CSVs
- keep cleanup decisions and sourcing choices across revisions
- attach notes and manual/local offers
- lock decisions you want preserved
- see JLC Basic / Preferred Extended / Extended fee impact

Live app:
https://bomkit-dashboard.vercel.app

The motivation is simple: BOM cleanup work is repetitive, and most tools don’t preserve that project-specific knowledge in a lightweight way.

Pricing plan for the MVP:
- Free: 1 project, up to 50 rows, no export
- Solo: $15/mo
- Pro: $29/mo

Current status:
- MVP code implemented
- local tests/build passing
- live at https://bomkit-dashboard.vercel.app

Repo:
https://github.com/lamb356/bomkit

If this sounds useful, I’d especially love feedback on:
- whether preserving row cleanup across revisions is a real pain point for you
- whether JLC loading-fee visibility is useful early enough to matter
- what the minimum useful revision-diff workflow should show
