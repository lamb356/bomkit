# BOMKit Dashboard launch draft — GitHub release

Title:
BOMKit Dashboard MVP — persistent BOM workspace for KiCad

Body:
BOMKit Dashboard is the new web companion to BOMKit Fab.

Live app:
https://bomkit-dashboard.vercel.app

What it does:
- import BOMKit Fab export CSVs and KiCad Symbol Fields CSVs
- keep row cleanup decisions, notes, local offers, and locked sourcing choices across revisions
- show JLC Basic / Preferred Extended / Extended tiering and loading-fee impact
- export cleaned dashboard CSVs and JLC-ready CSVs on paid tiers

Pricing:
- Free: 1 project, up to 50 rows, no export
- Solo: $15/mo
- Pro: $29/mo

Why this exists:
The point is not just live part lookup. The point is memory. Once you clean up a BOM and make sourcing decisions, you should not have to redo that work on every revision.

Status:
- local tests passing
- local production build passing
- live at https://bomkit-dashboard.vercel.app

Repo:
https://github.com/lamb356/bomkit
