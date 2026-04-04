# GitHub Release Draft — BOMKit Fab v0.1.0

Status: already published
Release URL: https://github.com/lamb356/bomkit/releases/tag/v0.1.0
Tag: v0.1.0
Artifact: packages/bomkit-fab-v0.1.0-pcm.zip

## Title
BOMKit Fab v0.1.0

## Summary
BOMKit Fab is an open-source KiCad pcbnew plugin that exports JLCPCB-ready BOM and CPL files with field normalization, rotation correction, assembly-cost visibility, and a sortable wxPython review dialog.

## Key features
- One-click JLCPCB BOM + CPL export
- LCSC / MPN field alias normalization
- Rotation correction database with project overrides
- Parser-based fallback for automated tests
- Real KiCad integration validation on Windows
- PCM-ready package zip for manual install

## Install
- GitHub release artifact: `packages/bomkit-fab-v0.1.0-pcm.zip`
- Repo: https://github.com/lamb356/bomkit
- Manual install: unzip and copy `bomkit-fab/` into KiCad `3rdparty/plugins/`

## Notes
- Verified with real KiCad embedded Python on Windows
- Current working KiCad validation path used KiCad 9.0.8
- Winget KiCad 10 upgrade currently fails upstream with a 404 package URL
