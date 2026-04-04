# KiCad Forum Draft — BOMKit Fab v0.1.0

Status: dry-run only
Publish target: KiCad / Discourse forum
Credential status: skipped for now — `KICAD_FORUM_API_KEY` not found in `~/.hermes/.env`

## Suggested title
BOMKit Fab v0.1.0 — KiCad plugin for JLCPCB-ready BOM + CPL export

## Suggested post body
Hi all — I just released BOMKit Fab v0.1.0, an open-source KiCad pcbnew plugin focused on manufacturing handoff for JLCPCB.

Repo:
https://github.com/lamb356/bomkit

Release:
https://github.com/lamb356/bomkit/releases/tag/v0.1.0

What it does:
- exports JLCPCB-ready BOM and CPL files
- resolves LCSC and MPN fields from common aliases
- applies rotation correction rules
- shows a sortable/filterable parts dialog in KiCad
- includes parser-based tests plus a real KiCad integration test path

Manual install:
1. Download the release artifact or clone the repo
2. Copy `bomkit-fab/` into your KiCad `3rdparty/plugins/` directory
3. Restart KiCad and open pcbnew
4. Launch `BOMKit Fab`

A PCM-ready package zip is included in the release as:
- `bomkit-fab-v0.1.0-pcm.zip`

Notes:
- Real plugin dialog screenshot is in the repo README
- The plugin has been validated through KiCad’s embedded Python on Windows
- Tested on KiCad 9.0.8 and KiCad 10.0.0

Would love feedback on:
- field alias compatibility across real projects
- rotation corrections for tricky package families
- KiCad 10 behavior across different installs
