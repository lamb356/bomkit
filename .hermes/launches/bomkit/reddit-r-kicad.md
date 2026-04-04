# Reddit Draft — r/KiCad

Status: dry-run only
Target: r/KiCad
Credential status: skipped for now — `REDDIT_CLIENT_ID` and/or `REDDIT_SECRET` not found in `~/.hermes/.env`

## Suggested title
I released BOMKit Fab v0.1.0 — a KiCad plugin for JLCPCB-ready BOM + CPL export

## Suggested post body
I just released BOMKit Fab v0.1.0, an open-source KiCad pcbnew plugin for manufacturing handoff.

GitHub:
https://github.com/lamb356/bomkit

Release:
https://github.com/lamb356/bomkit/releases/tag/v0.1.0

What it does:
- exports JLCPCB-ready BOM and CPL CSVs
- resolves LCSC / MPN fields from common aliases
- applies rotation correction rules
- shows a sortable/filterable review dialog before export
- includes a packaged zip for manual install

Manual install is straightforward:
- grab the release zip
- copy `bomkit-fab/` into KiCad’s `3rdparty/plugins/`
- restart KiCad and run the plugin in pcbnew

I also validated the integration through KiCad’s embedded Python on Windows, tested it on KiCad 9.0.8 and KiCad 10.0.0, and added a screenshot of the plugin dialog in the README.

If anyone wants to try it, I’d especially love feedback on:
- field alias edge cases
- weird footprint rotations
- KiCad 10 install behavior
