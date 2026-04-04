# Draft Reddit post for r/KiCad

Title:
I built BOMKit Dashboard — a persistent BOM workspace for KiCad with JLC fee visibility

Body:
I’ve been working on BOMKit as a KiCad-focused sourcing/manufacturing workflow.

The first piece was BOMKit Fab, a plugin that exports JLC-ready BOM/CPL files from KiCad.

This next piece is BOMKit Dashboard:
- import BOMKit Fab CSVs or KiCad Symbol Fields CSVs
- keep row cleanup and sourcing choices across revisions
- add notes / local offers / locked choices
- see JLC Basic / Extended loading-fee impact without redoing the same cleanup work each time

The core idea is that BOM work shouldn’t be disposable.
If you clean up a BOM once, that knowledge should survive the next revision.

Current status:
- MVP app implemented
- tests/build passing locally
- production deploy is the last infrastructure step still being cleaned up

Repo:
https://github.com/lamb356/bomkit

Happy to get feedback on whether this matches the pain you hit between KiCad BOM export and actual assembly ordering.
